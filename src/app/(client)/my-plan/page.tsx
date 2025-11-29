"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface User {
  name: string;
}

export default function ClientPlanPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("name")
          .eq("id", authUser.id)
          .single();
        
        if (userData) {
          setUser(userData);
        }
      }
      setIsLoading(false);
    };

    fetchUser();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-sage-900">
          Welcome{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-sage-600 mt-2">
          Your treatment plan and progress
        </p>
      </div>

      <Card className="text-center">
        <CardHeader>
          <CardTitle>Your Treatment Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12">
            <div className="text-sage-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-sage-700 mb-2">
              No treatment plan yet
            </h3>
            <p className="text-sage-500 max-w-md mx-auto">
              Your therapist hasn&apos;t created a treatment plan yet. 
              Once they do, you&apos;ll be able to see your goals, 
              homework, and progress here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

