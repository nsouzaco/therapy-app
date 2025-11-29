"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SessionUpload } from "@/components/therapist/session-upload";

export default function NewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const handleSuccess = () => {
    router.push(`/clients/${clientId}`);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/clients/${clientId}`}
          className="text-sage-500 hover:text-sage-700 text-sm mb-2 inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Client
        </Link>
        <h1 className="text-2xl font-bold text-sage-900 mt-2">Upload Session Transcript</h1>
        <p className="text-sage-600 mt-1">
          Add a new therapy session transcript for this client
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionUpload clientId={clientId} onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}

