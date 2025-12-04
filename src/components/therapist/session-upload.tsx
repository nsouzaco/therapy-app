"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  extractAudioFromVideo,
  isVideoFile,
  type ExtractAudioProgress,
} from "@/lib/utils/extract-audio";

interface SessionUploadProps {
  clientId: string;
  onSuccess: () => void;
}

const MAX_CHARS = 50000;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for video files (we extract audio)
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB for audio-only files
const DIRECT_UPLOAD_LIMIT = 4 * 1024 * 1024; // 4MB - files larger than this need storage upload first

type ProcessingPhase =
  | "idle"
  | "loading-ffmpeg"
  | "extracting-audio"
  | "uploading-video"
  | "transcribing";

// Helper functions for file type detection (outside component to avoid dependency issues)
const isAudioFile = (file: File) => {
  const audioTypes = [
    "audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a",
    "audio/wav", "audio/webm", "audio/ogg", "audio/x-m4a",
  ];
  return audioTypes.some(t => file.type.includes(t.split("/")[1])) ||
    file.name.match(/\.(mp3|m4a|wav|webm|ogg)$/i);
};

const isAudioOrVideo = (file: File) => {
  return isAudioFile(file) || isVideoFile(file);
};

const isTextFile = (file: File) => {
  return file.type === "text/plain" || file.name.endsWith(".txt");
};

export function SessionUpload({ clientId, onSuccess }: SessionUploadProps) {
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [transcript, setTranscript] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>("idle");
  const [processingProgress, setProcessingProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mediaStoragePath, setMediaStoragePath] = useState<string | null>(null);
  const [transcriptionInfo, setTranscriptionInfo] = useState<{
    duration?: number;
    language?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setMediaStoragePath(null);

    // Handle text files
    if (isTextFile(file)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text.length > MAX_CHARS) {
          setError(`File exceeds maximum length of ${MAX_CHARS.toLocaleString()} characters`);
          return;
        }
        setTranscript(text);
        setUploadedFile(file);
        setTranscriptionInfo(null);
      };
      reader.onerror = () => setError("Failed to read file");
      reader.readAsText(file);
      return;
    }

    // Handle audio/video files
    if (isAudioOrVideo(file)) {
      const isVideo = isVideoFile(file);
      
      // Check file size limits
      if (isVideo && file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setError(`Video file too large (${sizeMB}MB). Maximum size is 100MB.`);
        return;
      }
      if (!isVideo && file.size > MAX_AUDIO_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setError(`Audio file too large (${sizeMB}MB). Maximum size is 25MB.`);
        return;
      }

      setUploadedFile(file);
      setTranscript("");
      setTranscriptionInfo(null);

      try {
        let audioFile: File = file;
        let storagePath: string | null = null;
        const supabase = createClient();

        // For video files: extract audio and upload video for playback
        if (isVideo) {
          // Step 1: Extract audio from video
          setProcessingPhase("loading-ffmpeg");
          setProcessingProgress(null);

          try {
            audioFile = await extractAudioFromVideo(file, (progress: ExtractAudioProgress) => {
              if (progress.phase === "loading") {
                setProcessingPhase("loading-ffmpeg");
              } else if (progress.phase === "extracting") {
                setProcessingPhase("extracting-audio");
                setProcessingProgress(progress.progress ?? null);
              }
            });
          } catch (ffmpegErr) {
            // FFmpeg failed - provide helpful error message
            const errMessage = ffmpegErr instanceof Error ? ffmpegErr.message : "";
            if (errMessage.includes("FFMPEG_UNAVAILABLE") || errMessage.includes("FFMPEG_TIMEOUT")) {
              throw new Error(
                "Video processing is not available in this browser. Please upload an audio file (MP3, M4A, WAV) instead, or extract the audio using a tool like VLC or an online converter."
              );
            }
            throw ffmpegErr;
          }

          // Step 2: Upload video to storage for playback
          setProcessingPhase("uploading-video");
          setProcessingProgress(null);

          const fileExt = file.name.split(".").pop() || "mp4";
          storagePath = `${clientId}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("session-media")
            .upload(storagePath, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            console.error("Video upload error:", uploadError);
            // Non-fatal: continue with transcription even if video upload fails
            storagePath = null;
          } else {
            setMediaStoragePath(storagePath);
          }
        }

        // Step 3: Transcribe the audio
        setProcessingPhase("transcribing");
        setProcessingProgress(null);

        let response: Response;
        
        // If audio file is large, upload to storage first to avoid Vercel payload limits
        if (audioFile.size > DIRECT_UPLOAD_LIMIT) {
          const audioPath = `${clientId}/audio-${Date.now()}.mp3`;
          const { error: audioUploadError } = await supabase.storage
            .from("session-media")
            .upload(audioPath, audioFile, {
              cacheControl: "3600",
              upsert: false,
            });

          if (audioUploadError) {
            throw new Error(`Failed to upload audio: ${audioUploadError.message}`);
          }

          // Send storage path to transcribe API
          response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storagePath: audioPath }),
          });
        } else {
          // Small file - send directly
          const formData = new FormData();
          formData.append("audio", audioFile);

          response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          throw new Error(text || `Server error: ${response.status}`);
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Transcription failed");
        }

        setTranscript(data.transcript);
        setTranscriptionInfo({
          duration: data.duration,
          language: data.language,
        });
      } catch (err) {
        console.error("Processing error:", err);
        const message = err instanceof Error ? err.message : "Failed to process file";
        setError(message);
        setUploadedFile(null);
        setMediaStoragePath(null);
      } finally {
        setProcessingPhase("idle");
        setProcessingProgress(null);
      }
      return;
    }

    setError("Unsupported file type. Please upload audio, video, or text files.");
  }, [clientId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setTranscript(value);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!transcript.trim()) {
      setError("Please enter or upload a transcript");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/clients/${clientId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_date: sessionDate,
          transcript_text: transcript,
          media_storage_path: mediaStoragePath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save session");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save session");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const clearUpload = () => {
    setTranscript("");
    setUploadedFile(null);
    setTranscriptionInfo(null);
    setMediaStoragePath(null);
    setError(null);
  };

  const charCount = transcript.length;
  const charPercentage = (charCount / MAX_CHARS) * 100;
  const isProcessing = processingPhase !== "idle";

  const getProcessingMessage = () => {
    switch (processingPhase) {
      case "loading-ffmpeg":
        return "Loading audio processor...";
      case "extracting-audio":
        return processingProgress !== null
          ? `Extracting audio... ${processingProgress}%`
          : "Extracting audio...";
      case "uploading-video":
        return "Uploading video for playback...";
      case "transcribing":
        return "Transcribing audio...";
      default:
        return "Processing...";
    }
  };

  const getFileIcon = () => {
    if (!uploadedFile) return null;
    if (uploadedFile.type.startsWith("video/") || isVideoFile(uploadedFile)) {
      return (
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    if (uploadedFile.type.startsWith("audio/")) {
      return (
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Session Date */}
      <div>
        <label htmlFor="session-date" className="label">
          Session Date
        </label>
        <input
          id="session-date"
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          className="input max-w-xs"
          required
        />
      </div>

      {/* Unified File Upload Zone */}
      <div>
        <label className="label">Session Recording or Transcript</label>
        <Card
          className={`mb-3 border-2 border-dashed transition-colors ${
            isDragging
              ? "border-primary-500 bg-primary-50"
              : "border-sage-300 hover:border-sage-400"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="py-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*,.txt,text/plain"
              onChange={handleFileInput}
              className="hidden"
            />

            {isProcessing ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4" />
                <p className="text-sage-600 font-medium">{getProcessingMessage()}</p>
                <p className="text-sm text-sage-500 mt-1">
                  This may take a moment for longer recordings
                </p>
              </div>
            ) : uploadedFile && transcript ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-3">
                  {getFileIcon()}
                </div>
                <p className="text-sage-800 font-medium">{uploadedFile.name}</p>
                {transcriptionInfo && (
                  <div className="flex gap-4 mt-2 text-sm text-sage-500">
                    {transcriptionInfo.duration && (
                      <span>Duration: {formatDuration(transcriptionInfo.duration)}</span>
                    )}
                    {transcriptionInfo.language && (
                      <span>Language: {transcriptionInfo.language.toUpperCase()}</span>
                    )}
                  </div>
                )}
                {mediaStoragePath && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Video saved for playback
                  </p>
                )}
                <button
                  type="button"
                  onClick={clearUpload}
                  className="mt-3 text-sm text-sage-500 hover:text-sage-700"
                >
                  Remove and upload different file
                </button>
              </div>
            ) : (
              <>
                <div className="text-sage-400 mb-3">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sage-600 mb-1">
                  Drag and drop a file here, or{" "}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-sage-400">
                  Audio (MP3, M4A, WAV) or Video (MP4, WebM) or Text (.txt)
                </p>
                <p className="text-xs text-sage-400 mt-1">
                  Video files will be saved for playback • Audio is transcribed automatically
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Transcript Preview/Edit */}
        <div className="relative">
          <label className="text-sm font-medium text-sage-600 mb-1 block">
            {uploadedFile && transcriptionInfo ? "Transcription (editable)" : "Transcript"}
          </label>
          <textarea
            value={transcript}
            onChange={handleTranscriptChange}
            placeholder="Upload a file above or paste/type the transcript here..."
            className="input min-h-[300px] font-mono text-sm resize-y"
            disabled={isProcessing}
          />

          {/* Character count */}
          <div className="mt-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-sage-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    charPercentage > 90 ? "bg-red-500" :
                    charPercentage > 70 ? "bg-amber-500" : "bg-primary-500"
                  }`}
                  style={{ width: `${Math.min(charPercentage, 100)}%` }}
                />
              </div>
              <span className="text-sage-500">
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            </div>
            {transcript && (
              <button
                type="button"
                onClick={clearUpload}
                className="text-sage-500 hover:text-sage-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!transcript.trim() || isProcessing}
        >
          Save Session
        </Button>
      </div>
    </form>
  );
}
