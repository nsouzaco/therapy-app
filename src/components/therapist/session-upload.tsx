"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SessionUploadProps {
  clientId: string;
  onSuccess: () => void;
}

const MAX_CHARS = 50000;
const MAX_AUDIO_SIZE = 32 * 1024 * 1024; // 32MB

type UploadMode = "text" | "audio";

export function SessionUpload({ clientId, onSuccess }: SessionUploadProps) {
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [transcript, setTranscript] = useState("");
  const [uploadMode, setUploadMode] = useState<UploadMode>("text");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcriptionInfo, setTranscriptionInfo] = useState<{
    duration?: number;
    language?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleTextFileRead = useCallback((file: File) => {
    if (!file.name.endsWith(".txt")) {
      setError("Please upload a .txt file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text.length > MAX_CHARS) {
        setError(
          `File exceeds maximum length of ${MAX_CHARS.toLocaleString()} characters`
        );
        return;
      }
      setTranscript(text);
      setError(null);
    };
    reader.onerror = () => {
      setError("Failed to read file");
    };
    reader.readAsText(file);
  }, []);

  const handleAudioFile = useCallback(async (file: File) => {
    // Validate audio/video type
    const validTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/mp4",
      "audio/m4a",
      "audio/wav",
      "audio/webm",
      "audio/ogg",
      "audio/x-m4a",
      "video/mp4",
      "video/webm",
    ];

    const isValid = validTypes.some((t) => {
      const [type, subtype] = t.split("/");
      return file.type.startsWith(type) && file.type.includes(subtype);
    }) || file.name.match(/\.(mp3|m4a|wav|webm|ogg|mp4)$/i);

    if (!isValid) {
      setError("Please upload an audio or video file (MP3, MP4, M4A, WAV, WebM, or OGG)");
      return;
    }

    if (file.size > MAX_AUDIO_SIZE) {
      setError("File too large. Maximum size is 32MB.");
      return;
    }

    setAudioFile(file);
    setError(null);
    setTranscript("");
    setTranscriptionInfo(null);

    // Automatically start transcription
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transcription failed");
      }

      setTranscript(data.transcript);
      setTranscriptionInfo({
        duration: data.duration,
        language: data.language,
      });
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to transcribe audio"
      );
      setAudioFile(null);
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        if (uploadMode === "audio" || file.type.startsWith("audio/")) {
          setUploadMode("audio");
          handleAudioFile(file);
        } else {
          handleTextFileRead(file);
        }
      }
    },
    [uploadMode, handleAudioFile, handleTextFileRead]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleTextFileRead(file);
      }
    },
    [handleTextFileRead]
  );

  const handleAudioInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleAudioFile(file);
      }
    },
    [handleAudioFile]
  );

  const handleTranscriptChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
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

  const charCount = transcript.length;
  const charPercentage = (charCount / MAX_CHARS) * 100;

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

      {/* Upload Mode Tabs */}
      <div>
        <label className="label">Session Recording</label>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setUploadMode("audio")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              uploadMode === "audio"
                ? "bg-primary-600 text-white"
                : "bg-sage-100 text-sage-700 hover:bg-sage-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              Audio Upload
            </span>
          </button>
          <button
            type="button"
            onClick={() => setUploadMode("text")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              uploadMode === "text"
                ? "bg-primary-600 text-white"
                : "bg-sage-100 text-sage-700 hover:bg-sage-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Text Transcript
            </span>
          </button>
        </div>

        {/* Audio Upload Zone */}
        {uploadMode === "audio" && (
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
                ref={audioInputRef}
                type="file"
                accept="audio/*,video/mp4,video/webm,.mp3,.m4a,.wav,.webm,.ogg,.mp4"
                onChange={handleAudioInput}
                className="hidden"
              />

              {isTranscribing ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4" />
                  <p className="text-sage-600 font-medium">
                    Transcribing audio...
                  </p>
                  <p className="text-sm text-sage-500 mt-1">
                    This may take a minute for longer recordings
                  </p>
                </div>
              ) : audioFile && transcript ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-3">
                    <svg
                      className="w-6 h-6 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-sage-800 font-medium">{audioFile.name}</p>
                  <div className="flex gap-4 mt-2 text-sm text-sage-500">
                    {transcriptionInfo?.duration && (
                      <span>
                        Duration: {formatDuration(transcriptionInfo.duration)}
                      </span>
                    )}
                    {transcriptionInfo?.language && (
                      <span>
                        Language: {transcriptionInfo.language.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAudioFile(null);
                      setTranscript("");
                      setTranscriptionInfo(null);
                    }}
                    className="mt-3 text-sm text-sage-500 hover:text-sage-700"
                  >
                    Remove and upload different file
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-sage-400 mb-3">
                    <svg
                      className="w-12 h-12 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  </div>
                  <p className="text-sage-600 mb-1">
                    Drag and drop an audio file here, or{" "}
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-sage-400">
                    Supports MP3, MP4, M4A, WAV, WebM, OGG (max 32MB)
                  </p>
                  <p className="text-xs text-sage-400 mt-1">
                    Audio will be automatically transcribed using AI
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Text Upload Zone */}
        {uploadMode === "text" && (
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
            <CardContent className="py-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="text-sage-400 mb-2">
                <svg
                  className="w-10 h-10 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="text-sage-600 mb-1">
                Drag and drop a .txt file here, or{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-sage-400">
                Maximum {MAX_CHARS.toLocaleString()} characters
              </p>
            </CardContent>
          </Card>
        )}

        {/* Transcript Preview/Edit */}
        <div className="relative">
          <label className="text-sm font-medium text-sage-600 mb-1 block">
            {uploadMode === "audio" && transcript
              ? "Transcription (editable)"
              : "Transcript"}
          </label>
          <textarea
            value={transcript}
            onChange={handleTranscriptChange}
            placeholder={
              uploadMode === "audio"
                ? "Upload an audio file to generate transcript..."
                : "Or paste the session transcript here..."
            }
            className="input min-h-[300px] font-mono text-sm resize-y"
            disabled={isTranscribing}
          />

          {/* Character count */}
          <div className="mt-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-sage-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    charPercentage > 90
                      ? "bg-red-500"
                      : charPercentage > 70
                        ? "bg-amber-500"
                        : "bg-primary-500"
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
                onClick={() => {
                  setTranscript("");
                  setAudioFile(null);
                  setTranscriptionInfo(null);
                }}
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
          disabled={!transcript.trim() || isTranscribing}
        >
          Save Session
        </Button>
      </div>
    </form>
  );
}
