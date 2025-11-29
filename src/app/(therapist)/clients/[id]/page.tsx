"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GenerateButton } from "@/components/plan/generate-button";

interface Session {
  id: string;
  session_date: string;
  transcript_preview: string;
  created_at: string;
}

interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  sessions: Session[];
  session_count: number;
  plan: {
    id: string;
    created_at: string;
    updated_at: string;
    current_version: {
      id: string;
      version_number: number;
      status: string;
    } | null;
  } | null;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = useCallback(async () => {
    try {
      const response = await fetch(`/api/therapist/clients/${clientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch client");
      }
      const data = await response.json();
      setClient(data.client);
    } catch {
      setError("Failed to load client details");
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
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

  if (error || !client) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || "Client not found"}</p>
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
          href="/dashboard"
          className="text-sage-500 hover:text-sage-700 text-sm mb-2 inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <div className="flex justify-between items-start mt-2">
          <div>
            <h1 className="text-2xl font-bold text-sage-900">{client.name}</h1>
            <p className="text-sage-600">{client.email}</p>
          </div>
          <div className="flex gap-3">
            <Link href={`/clients/${clientId}/sessions/new`}>
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Session
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Plan Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Treatment Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {client.plan ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-sage-500">Status</span>
                  <span className={`font-medium ${
                    client.plan.current_version?.status === "approved"
                      ? "text-primary-600"
                      : "text-amber-600"
                  }`}>
                    {client.plan.current_version?.status 
                      ? client.plan.current_version.status.charAt(0).toUpperCase() + 
                        client.plan.current_version.status.slice(1)
                      : "Draft"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-sage-500">Version</span>
                  <span className="text-sage-700">
                    {client.plan.current_version?.version_number || 1}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-sage-500">Last Updated</span>
                  <span className="text-sage-700">
                    {formatDate(client.plan.updated_at)}
                  </span>
                </div>
                <Link href={`/clients/${clientId}/plan`} className="block mt-4">
                  <Button variant="outline" className="w-full">View Plan</Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sage-500 text-sm mb-3">No treatment plan yet</p>
                {client.session_count > 0 ? (
                  <GenerateButton
                    clientId={clientId}
                    onSuccess={() => router.push(`/clients/${clientId}/plan`)}
                    size="sm"
                  />
                ) : (
                  <>
                    <p className="text-sage-400 text-xs mb-4">
                      Upload a session transcript to generate a plan
                    </p>
                    <Link href={`/clients/${clientId}/sessions/new`}>
                      <Button variant="outline" size="sm">
                        Upload Session
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Sessions ({client.session_count})</CardTitle>
              <Link href={`/clients/${clientId}/sessions/new`}>
                <Button size="sm" variant="outline">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {client.sessions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-sage-400 mb-3">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sage-500 text-sm">No sessions recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {client.sessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/sessions/${session.id}`}
                      className="block p-4 rounded-lg border border-sage-200 hover:border-sage-300 hover:bg-sage-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sage-900">
                          {formatDate(session.session_date)}
                        </span>
                        <svg className="w-4 h-4 text-sage-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <p className="text-sm text-sage-600 line-clamp-2">
                        {session.transcript_preview}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

