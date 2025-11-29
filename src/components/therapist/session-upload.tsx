"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SessionUploadProps {
  clientId: string;
  onSuccess: () => void;
}

const MAX_CHARS = 50000;

export function SessionUpload({ clientId, onSuccess }: SessionUploadProps) {
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [transcript, setTranscript] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileRead = useCallback((file: File) => {
    if (!file.name.endsWith(".txt")) {
      setError("Please upload a .txt file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text.length > MAX_CHARS) {
        setError(`File exceeds maximum length of ${MAX_CHARS.toLocaleString()} characters`);
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileRead(file);
      }
    },
    [handleFileRead]
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
        handleFileRead(file);
      }
    },
    [handleFileRead]
  );

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

      {/* Transcript Input */}
      <div>
        <label className="label">Session Transcript</label>

        {/* Drag & Drop Zone */}
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

        {/* Or paste directly */}
        <div className="relative">
          <textarea
            value={transcript}
            onChange={handleTranscriptChange}
            placeholder="Or paste the session transcript here..."
            className="input min-h-[300px] font-mono text-sm resize-y"
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
                onClick={() => setTranscript("")}
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
        <Button type="submit" isLoading={isLoading} disabled={!transcript.trim()}>
          Save Session
        </Button>
      </div>
    </form>
  );
}

