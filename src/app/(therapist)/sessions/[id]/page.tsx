"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Session {
  id: string;
  session_date: string;
  transcript_text: string;
  transcript_length: number;
  created_at: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
}

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch session");
        }
        const data = await response.json();
        setSession(data.session);
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
            {/* Generate Plan button - disabled placeholder for Phase 3 */}
            <Button disabled title="Coming in Phase 3">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Plan
            </Button>
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

      {/* Transcript */}
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
    </div>
  );
}

