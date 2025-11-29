"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState, EmptyStateIcons } from "@/components/ui/empty-state";

interface Session {
  id: string;
  session_date: string;
  created_at: string;
}

export default function ClientSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch("/api/client/sessions");
        if (response.ok) {
          const data = await response.json();
          setSessions(data.sessions || []);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-sage-900">My Sessions</h1>
        <p className="text-sage-600 mt-1">Your therapy journey timeline</p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={EmptyStateIcons.calendar}
              title="No sessions yet"
              description="Your session history will appear here once your therapist records your sessions."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Session Timeline ({sessions.length} session
              {sessions.length !== 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-primary-200" />

              <div className="space-y-6">
                {sessions.map((session, index) => (
                  <div key={session.id} className="relative flex items-start gap-4">
                    {/* Timeline dot */}
                    <div
                      className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0
                          ? "bg-primary-500 text-white"
                          : "bg-primary-100 text-primary-600"
                      }`}
                    >
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
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>

                    {/* Session card */}
                    <div className="flex-1 bg-sage-50 rounded-lg p-4 border border-sage-100">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sage-800">
                          {formatDate(session.session_date)}
                        </h3>
                        <span className="text-xs text-sage-500">
                          {getRelativeTime(session.session_date)}
                        </span>
                      </div>
                      <p className="text-sm text-sage-600 mt-1">
                        Session with your therapist
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-sage-200 text-center">
              <p className="text-sm text-sage-500">
                Keep up the great work! 💪
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
