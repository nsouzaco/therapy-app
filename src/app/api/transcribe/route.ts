import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/ai/openai-client";

// Increase timeout for transcription (Vercel serverless functions)
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (OpenAI Whisper API limit)

// POST /api/transcribe - Transcribe audio file using OpenAI Whisper
// Accepts either:
// - FormData with "audio" file (direct upload for small files)
// - JSON with "storagePath" (for large files uploaded to Supabase Storage)
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

    let audioFile: File;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      // Handle storage path approach
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
          { error: "Failed to download audio file from storage" },
          { status: 500 }
        );
      }

      // Convert Blob to File
      const fileName = storagePath.split("/").pop() || "audio.mp3";
      audioFile = new File([fileData], fileName, { type: "audio/mpeg" });
    } else {
      // Handle direct FormData upload
      const formData = await request.formData();
      const uploadedFile = formData.get("audio") as File | null;

      if (!uploadedFile) {
        return NextResponse.json(
          { error: "No audio file provided" },
          { status: 400 }
        );
      }

      audioFile = uploadedFile;
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      const sizeMB = (audioFile.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `File too large (${sizeMB}MB). Maximum size is 25MB.` },
        { status: 400 }
      );
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
