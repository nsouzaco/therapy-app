import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/therapist/documents/[id] - Get a single document with its chunks
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get document (RLS ensures only own documents)
    const { data: document, error: docError } = await supabase
      .from("therapist_documents")
      .select(`
        id,
        title,
        filename,
        source_type,
        description,
        file_size_bytes,
        chunk_count,
        created_at,
        updated_at
      `)
      .eq("id", id)
      .eq("therapist_id", therapistProfile.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get chunks for this document
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("id, chunk_index, content, metadata")
      .eq("document_id", id)
      .order("chunk_index", { ascending: true });

    return NextResponse.json({
      document: {
        ...document,
        chunks: chunks || [],
      },
    });
  } catch (error) {
    console.error("Error in GET /api/therapist/documents/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/therapist/documents/[id] - Delete a document and its chunks
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify ownership before deleting
    const { data: document } = await supabase
      .from("therapist_documents")
      .select("id")
      .eq("id", id)
      .eq("therapist_id", therapistProfile.id)
      .single();

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete document (chunks will cascade delete)
    const { error: deleteError } = await supabase
      .from("therapist_documents")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting document:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/therapist/documents/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

