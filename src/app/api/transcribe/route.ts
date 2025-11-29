import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/ai/openai-client";

// Increase timeout for transcription (Vercel serverless functions)
export const maxDuration = 60;

// Supported audio/video formats
const SUPPORTED_FORMATS = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "video/mp4",
  "video/webm",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (OpenAI Whisper API limit)

// POST /api/transcribe - Transcribe audio file using OpenAI Whisper
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

    // Get form data with audio file
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!SUPPORTED_FORMATS.includes(audioFile.type)) {
      return NextResponse.json(
        {
          error: `Unsupported format. Supported: MP3, MP4, M4A, WAV, WebM, OGG`,
        },
        { status: 400 }
      );
    }

    // Validate file size (OpenAI Whisper limit is 25MB)
    if (audioFile.size > MAX_FILE_SIZE) {
      const sizeMB = (audioFile.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `File too large (${sizeMB}MB). Maximum size is 25MB due to OpenAI API limits.` },
        { status: 400 }
      );
    }

    // Call OpenAI Whisper API
    const openai = getOpenAIClient();

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en", // Can be made dynamic for multi-language support
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

