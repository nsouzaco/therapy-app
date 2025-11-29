"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ClientSessionsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-sage-900">My Sessions</h1>
        <p className="text-sage-600 mt-1">
          View your past therapy sessions
        </p>
      </div>

      <Card className="text-center">
        <CardHeader>
          <CardTitle>Session History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12">
            <div className="text-sage-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-sage-700 mb-2">
              No sessions yet
            </h3>
            <p className="text-sage-500 max-w-md mx-auto">
              Your session history will appear here once your therapist 
              records your sessions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

