import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseDocument, cleanExtractedText, MAX_FILE_SIZE } from "@/lib/rag/pdf-parser";
import { chunkTextSemantic } from "@/lib/rag/chunking";
import { generateEmbeddings } from "@/lib/rag/embeddings";
import type { SourceType } from "@/lib/rag/retrieval";

// Increase timeout for document processing (embedding generation can take time)
export const maxDuration = 60;

// GET /api/therapist/documents - List all documents for the therapist
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get therapist profile
    const { data: therapistProfile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!therapistProfile) {
      return NextResponse.json(
        { error: "Therapist profile not found" },
        { status: 404 }
      );
    }

    // Get documents
    const { data: documents, error: docsError } = await supabase
      .from("therapist_documents")
      .select("id, title, filename, source_type, description, file_size_bytes, chunk_count, created_at")
      .eq("therapist_id", therapistProfile.id)
      .order("created_at", { ascending: false });

    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (error) {
    console.error("Error in GET /api/therapist/documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/therapist/documents - Upload and process a new document
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get therapist profile
    const { data: therapistProfile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!therapistProfile) {
      return NextResponse.json(
        { error: "Therapist profile not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const sourceType = formData.get("source_type") as SourceType | null;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!sourceType) {
      return NextResponse.json(
        { error: "Source type is required" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `File too large (${sizeMB}MB). Maximum size is 10MB.` },
        { status: 400 }
      );
    }

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse document to extract text
    let parsedDoc;
    try {
      parsedDoc = await parseDocument(buffer, file.type, file.name);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to parse document: ${message}` },
        { status: 400 }
      );
    }

    // Clean the extracted text
    const cleanedText = cleanExtractedText(parsedDoc.text);

    if (cleanedText.length < 100) {
      return NextResponse.json(
        { error: "Document has insufficient text content" },
        { status: 400 }
      );
    }

    // Chunk the text
    const chunks = chunkTextSemantic(cleanedText);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "Failed to process document content" },
        { status: 400 }
      );
    }

    // Create document record
    const { data: document, error: docError } = await supabase
      .from("therapist_documents")
      .insert({
        therapist_id: therapistProfile.id,
        title: title.trim(),
        filename: file.name,
        source_type: sourceType,
        description: description?.trim() || null,
        file_size_bytes: file.size,
        chunk_count: chunks.length,
      })
      .select()
      .single();

    if (docError || !document) {
      console.error("Error creating document:", docError);
      return NextResponse.json(
        { error: "Failed to create document" },
        { status: 500 }
      );
    }

    // Generate embeddings for all chunks
    let embeddings: number[][];
    try {
      embeddings = await generateEmbeddings(chunks.map((c) => c.content));
    } catch (embeddingError) {
      // Delete the document if embedding fails
      await supabase.from("therapist_documents").delete().eq("id", document.id);
      console.error("Embedding generation error:", embeddingError);
      return NextResponse.json(
        { error: "Failed to process document embeddings" },
        { status: 500 }
      );
    }

    // Insert chunks with embeddings
    const chunkRecords = chunks.map((chunk, index) => ({
      document_id: document.id,
      chunk_index: chunk.index,
      content: chunk.content,
      embedding: embeddings[index],
      metadata: {
        startChar: chunk.startChar,
        endChar: chunk.endChar,
      },
    }));

    const { error: chunksError } = await supabase
      .from("document_chunks")
      .insert(chunkRecords);

    if (chunksError) {
      // Delete the document if chunk insertion fails
      await supabase.from("therapist_documents").delete().eq("id", document.id);
      console.error("Error inserting chunks:", chunksError);
      return NextResponse.json(
        { error: "Failed to save document chunks" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Document uploaded successfully",
      document: {
        id: document.id,
        title: document.title,
        filename: document.filename,
        source_type: document.source_type,
        chunk_count: chunks.length,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/therapist/documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

