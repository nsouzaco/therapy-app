import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/ai/openai-client";

// Increase timeout for transcription (Vercel serverless functions)
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (OpenAI Whisper API limit)

// POST /api/transcribe - Transcribe audio file using OpenAI Whisper
// Accepts either a storage path (for large files) or direct file upload (for small files)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let audioFile: File;

    // Check if this is a storage path request (JSON) or direct upload (FormData)
    if (contentType.includes("application/json")) {
      // Storage path mode - fetch file from Supabase Storage
      const body = await request.json();
      const { storagePath } = body;

      if (!storagePath) {
        return NextResponse.json(
          { error: "No storage path provided" },
          { status: 400 }
        );
      }

      // Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("session-media")
        .download(storagePath);

      if (downloadError || !fileData) {
        console.error("Storage download error:", downloadError);
        return NextResponse.json(
          { error: "Failed to download file from storage" },
          { status: 400 }
        );
      }

      // Check file size
      if (fileData.size > MAX_FILE_SIZE) {
        const sizeMB = (fileData.size / (1024 * 1024)).toFixed(1);
        return NextResponse.json(
          { error: `File too large (${sizeMB}MB). Maximum size is 25MB for transcription.` },
          { status: 400 }
        );
      }

      // Convert Blob to File for OpenAI API
      const fileName = storagePath.split("/").pop() || "audio.mp4";
      audioFile = new File([fileData], fileName, { type: fileData.type });
    } else {
      // Direct upload mode (for smaller files that fit within Vercel limits)
      const formData = await request.formData();
      const uploadedFile = formData.get("audio") as File | null;

      if (!uploadedFile) {
        return NextResponse.json(
          { error: "No audio file provided" },
          { status: 400 }
        );
      }

      if (uploadedFile.size > MAX_FILE_SIZE) {
        const sizeMB = (uploadedFile.size / (1024 * 1024)).toFixed(1);
        return NextResponse.json(
          { error: `File too large (${sizeMB}MB). Maximum size is 25MB.` },
          { status: 400 }
        );
      }

      audioFile = uploadedFile;
    }

    // Call OpenAI Whisper API
    const openai = getOpenAIClient();

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    return NextResponse.json({
      success: true,
      transcript: transcription.text,
      duration: transcription.duration,
      language: transcription.language,
      segments: transcription.segments?.map((seg) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })),
    });
  } catch (error) {
    console.error("Transcription error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Transcription failed: ${message}` },
      { status: 500 }
    );
  }
}

