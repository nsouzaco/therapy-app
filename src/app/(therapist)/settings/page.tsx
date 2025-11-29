"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface StyleProfile {
  id: string;
  primary_modality: string | null;
  secondary_modalities: string[];
  common_interventions: string[];
  homework_style: string | null;
  tone: string | null;
  pacing: string | null;
  uses_metaphors: boolean;
  signature_phrases: string[];
  focus_areas: string[];
  sessions_analyzed: number;
  confidence_score: number;
  last_extraction_at: string | null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/therapist/style");
      const data = await response.json();
      setProfile(data.profile);
    } catch {
      setError("Failed to load style profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/therapist/style", { method: "POST" });
      const data = await response.json();
      if (data.profile) {
        setProfile(data.profile);
      }
    } catch {
      setError("Failed to refresh profile");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const confidenceLabel = (score: number) => {
    if (score >= 0.8) return { text: "High", color: "text-primary-600 bg-primary-50" };
    if (score >= 0.4) return { text: "Medium", color: "text-amber-600 bg-amber-50" };
    return { text: "Low", color: "text-sage-500 bg-sage-100" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
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
        <h1 className="text-2xl font-bold text-sage-900 mt-2">Settings</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Clinical Style Profile */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Your Clinical Style
            </CardTitle>
            <p className="text-sm text-sage-500 mt-1">
              Automatically extracted from your session transcripts
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            disabled={isRefreshing}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {!profile ? (
            <div className="text-center py-8">
              <div className="text-sage-400 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-sage-600 font-medium mb-2">No style profile yet</p>
              <p className="text-sage-500 text-sm">
                Upload session transcripts to automatically build your clinical style profile.
                The AI will learn your therapeutic approach and personalize generated plans.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Confidence & Stats */}
              <div className="flex items-center gap-4 text-sm">
                <span className={`px-2 py-1 rounded-full font-medium ${confidenceLabel(profile.confidence_score).color}`}>
                  {confidenceLabel(profile.confidence_score).text} Confidence
                </span>
                <span className="text-sage-500">
                  Based on {profile.sessions_analyzed} session{profile.sessions_analyzed !== 1 ? "s" : ""}
                </span>
                {profile.last_extraction_at && (
                  <span className="text-sage-400">
                    Updated {new Date(profile.last_extraction_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Modalities */}
              {profile.primary_modality && (
                <div>
                  <h4 className="text-sm font-medium text-sage-600 mb-2">Therapeutic Approach</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                      {profile.primary_modality}
                    </span>
                    {profile.secondary_modalities.map((mod) => (
                      <span key={mod} className="px-3 py-1.5 bg-sage-100 text-sage-700 rounded-full text-sm">
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Communication Style */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {profile.tone && (
                  <div className="p-3 bg-sage-50 rounded-lg">
                    <div className="text-xs text-sage-500 mb-1">Communication Tone</div>
                    <div className="font-medium text-sage-900 capitalize">{profile.tone}</div>
                  </div>
                )}
                {profile.pacing && (
                  <div className="p-3 bg-sage-50 rounded-lg">
                    <div className="text-xs text-sage-500 mb-1">Session Pacing</div>
                    <div className="font-medium text-sage-900 capitalize">{profile.pacing}</div>
                  </div>
                )}
                {profile.homework_style && (
                  <div className="p-3 bg-sage-50 rounded-lg">
                    <div className="text-xs text-sage-500 mb-1">Homework Style</div>
                    <div className="font-medium text-sage-900 capitalize">{profile.homework_style}</div>
                  </div>
                )}
              </div>

              {/* Interventions */}
              {profile.common_interventions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-sage-600 mb-2">Common Interventions</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.common_interventions.map((intervention) => (
                      <span key={intervention} className="px-2 py-1 bg-sage-100 text-sage-700 rounded text-sm">
                        {intervention}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Focus Areas */}
              {profile.focus_areas.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-sage-600 mb-2">Clinical Focus</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.focus_areas.map((area) => (
                      <span key={area} className="px-2 py-1 bg-primary-50 text-primary-700 rounded text-sm">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Signature Phrases */}
              {profile.signature_phrases.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-sage-600 mb-2">Your Signature Phrases</h4>
                  <div className="space-y-2">
                    {profile.signature_phrases.slice(0, 5).map((phrase, index) => (
                      <div key={index} className="text-sage-700 text-sm italic border-l-2 border-primary-200 pl-3">
                        &ldquo;{phrase}&rdquo;
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="p-4 bg-primary-50 rounded-lg border border-primary-100">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-primary-800">
                    <p className="font-medium mb-1">How this works</p>
                    <p>
                      Your clinical style is automatically extracted from session transcripts.
                      When generating treatment plans, the AI adapts to match your therapeutic
                      approach, terminology, and preferred interventions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

