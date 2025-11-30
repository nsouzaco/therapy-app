"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let ffmpegLoadFailed = false;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegLoadFailed) {
    throw new Error("FFMPEG_UNAVAILABLE");
  }
  
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  // Load ffmpeg with CDN URLs for the core files (UMD version for better compatibility)
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

  try {
    // Add timeout for loading
    const loadPromise = ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      workerURL: await toBlobURL(
        `https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/814.ffmpeg.js`,
        "text/javascript"
      ),
    });
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("FFMPEG_TIMEOUT")), 60000)
    );
    
    await Promise.race([loadPromise, timeoutPromise]);
  } catch (err) {
    console.error("FFmpeg load error:", err);
    ffmpegLoadFailed = true;
    ffmpeg = null;
    throw new Error("FFMPEG_UNAVAILABLE");
  }

  return ffmpeg;
}

export interface ExtractAudioProgress {
  phase: "loading" | "extracting" | "done";
  progress?: number;
}

export async function extractAudioFromVideo(
  videoFile: File,
  onProgress?: (progress: ExtractAudioProgress) => void
): Promise<File> {
  onProgress?.({ phase: "loading" });

  const ff = await getFFmpeg();

  // Set up progress tracking
  ff.on("progress", ({ progress }) => {
    onProgress?.({ phase: "extracting", progress: Math.round(progress * 100) });
  });

  // Write input file to ffmpeg's virtual filesystem
  const inputName = "input" + getExtension(videoFile.name);
  const outputName = "output.mp3";

  await ff.writeFile(inputName, await fetchFile(videoFile));

  // Extract audio as MP3 at 64kbps (good quality for speech, small file size)
  await ff.exec([
    "-i", inputName,
    "-vn",              // No video
    "-c:a", "libmp3lame",
    "-b:a", "64k",      // 64kbps bitrate
    "-ar", "16000",     // 16kHz sample rate (optimal for Whisper)
    "-ac", "1",         // Mono (speech doesn't need stereo)
    outputName,
  ]);

  // Read the output file
  const data = await ff.readFile(outputName);

  // Clean up
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  onProgress?.({ phase: "done" });

  // Create a File object from the output
  const audioBlob = new Blob([data as BlobPart], { type: "audio/mpeg" });
  const audioFile = new File(
    [audioBlob],
    videoFile.name.replace(/\.[^.]+$/, ".mp3"),
    { type: "audio/mpeg" }
  );

  return audioFile;
}

function getExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? `.${ext}` : ".mp4";
}

export function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name)
  );
}

