"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GenerateButton } from "@/components/plan/generate-button";

interface Session {
  id: string;
  session_date: string;
  transcript_text: string;
  transcript_length: number;
  created_at: string;
  summary_therapist?: string;
  summary_client?: string;
  key_themes?: string[];
  progress_notes?: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "transcript">("summary");

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch session");
        }
        const data = await response.json();
        setSession(data.session);
        // Default to transcript if no summary
        if (!data.session.summary_therapist) {
          setActiveTab("transcript");
        }
      } catch {
        setError("Failed to load session details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || "Session not found"}</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const hasSummary = session.summary_therapist || session.summary_client;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/clients/${session.client.id}`}
          className="text-sage-500 hover:text-sage-700 text-sm mb-2 inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {session.client.name}
        </Link>
        <div className="flex justify-between items-start mt-2">
          <div>
            <h1 className="text-2xl font-bold text-sage-900">
              Session: {formatDate(session.session_date)}
            </h1>
            <p className="text-sage-600">{session.client.name}</p>
          </div>
          <div className="flex gap-3">
            <GenerateButton
              clientId={session.client.id}
              sessionId={sessionId}
              onSuccess={() => router.push(`/clients/${session.client.id}/plan`)}
            />
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="grid gap-6 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-sage-500">Session Date</div>
            <div className="font-medium text-sage-900">
              {formatDate(session.session_date)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-sage-500">Client</div>
            <div className="font-medium text-sage-900">{session.client.name}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-sage-500">Transcript Length</div>
            <div className="font-medium text-sage-900">
              {session.transcript_length.toLocaleString()} characters
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-sage-500">Uploaded</div>
            <div className="font-medium text-sage-900">
              {new Date(session.created_at).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Themes */}
      {session.key_themes && session.key_themes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-sage-600 mb-2">Key Themes</h3>
          <div className="flex flex-wrap gap-2">
            {session.key_themes.map((theme, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      {hasSummary && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "summary"
                ? "bg-primary-600 text-white"
                : "bg-sage-100 text-sage-700 hover:bg-sage-200"
            }`}
          >
            Session Summary
          </button>
          <button
            onClick={() => setActiveTab("transcript")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "transcript"
                ? "bg-primary-600 text-white"
                : "bg-sage-100 text-sage-700 hover:bg-sage-200"
            }`}
          >
            Full Transcript
          </button>
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === "summary" && hasSummary && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Therapist Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 bg-sage-100 text-sage-600 rounded">
                  Clinical
                </span>
                Session Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sage prose-sm max-w-none">
                <p className="text-sage-700 whitespace-pre-wrap">
                  {session.summary_therapist || "Summary not yet generated."}
                </p>
              </div>
              {session.progress_notes && (
                <div className="mt-4 pt-4 border-t border-sage-200">
                  <h4 className="text-sm font-medium text-sage-600 mb-2">
                    Progress Notes
                  </h4>
                  <p className="text-sm text-sage-700">{session.progress_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Summary */}
          <Card className="bg-primary-50/30 border-primary-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 bg-primary-100 text-primary-700 rounded">
                  Client-Facing
                </span>
                What We Worked On
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sage prose-sm max-w-none">
                <p className="text-sage-700 whitespace-pre-wrap">
                  {session.summary_client || "Summary not yet generated."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transcript Tab */}
      {(activeTab === "transcript" || !hasSummary) && (
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-sage-50 rounded-lg p-6 font-mono text-sm whitespace-pre-wrap text-sage-800 max-h-[600px] overflow-y-auto">
              {session.transcript_text}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
