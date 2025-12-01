"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Disclaimer } from "@/components/ui/disclaimer";
import { EmptyState, EmptyStateIcons } from "@/components/ui/empty-state";
import { PlanCard } from "@/components/client/plan-card";
import { GoalsDisplay } from "@/components/client/goals-display";
import { HomeworkDisplay } from "@/components/client/homework-display";
import { StrengthsDisplay } from "@/components/client/strengths-display";
import { ClientCopilot } from "@/components/client/client-copilot";

interface User {
  name: string;
}

interface ClientPlan {
  id: string;
  updated_at: string;
  version: number;
  content: {
    presenting_concerns: string;
    what_were_working_on: string;
    goals: Array<{
      id: string;
      type: "short_term" | "long_term";
      goal: string;
      target_date?: string;
    }>;
    interventions: Array<{
      id: string;
      name: string;
      description: string;
      frequency: string;
    }>;
    homework: Array<{
      id: string;
      task: string;
      purpose: string;
      due_date?: string;
    }>;
    strengths: Array<{
      id: string;
      strength: string;
      how_to_leverage: string;
    }>;
  };
}

export default function ClientPlanPage() {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<ClientPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        // Fetch user data
        const { data: userData } = await supabase
          .from("users")
          .select("name")
          .eq("id", authUser.id)
          .single();

        if (userData) {
          setUser(userData);
        }

        // Fetch plan data
        try {
          const response = await fetch("/api/client/plan");
          if (response.ok) {
            const data = await response.json();
            setPlan(data.plan);
          }
        } catch (error) {
          console.error("Failed to fetch plan:", error);
        }
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-sage-900">
          Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
        </h1>
        <p className="text-sage-600 mt-2">
          Your treatment plan and what we&apos;re working on together
        </p>
      </div>

      {!plan ? (
        <div className="bg-white rounded-xl border border-sage-200 shadow-sm">
          <EmptyState
            icon={EmptyStateIcons.document}
            title="Your treatment plan is on the way"
            description="Your therapist hasn't finalized your treatment plan yet. Once they do, you'll see your goals, homework, and progress here."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Disclaimer */}
          <Disclaimer variant="client" />

          {/* What We're Working On */}
          <PlanCard
            title="What We're Working On"
            variant="highlight"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
          >
            <p className="text-sage-700 leading-relaxed">
              {plan.content.presenting_concerns}
            </p>
            {plan.content.what_were_working_on && (
              <p className="text-sage-700 leading-relaxed mt-3">
                {plan.content.what_were_working_on}
              </p>
            )}
          </PlanCard>

          {/* Goals */}
          {plan.content.goals.length > 0 && (
            <PlanCard
              title="Your Goals"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              }
            >
              <GoalsDisplay goals={plan.content.goals} />
            </PlanCard>
          )}

          {/* Homework */}
          <PlanCard
            title="This Week's Focus"
            variant="warm"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          >
            <HomeworkDisplay homework={plan.content.homework} />
          </PlanCard>

          {/* How We'll Work Together */}
          {plan.content.interventions.length > 0 && (
            <PlanCard
              title="How We'll Work Together"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            >
              <div className="space-y-4">
                {plan.content.interventions.map((intervention) => (
                  <div
                    key={intervention.id}
                    className="bg-sage-50 rounded-lg p-4 border border-sage-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sage-800">
                        {intervention.name}
                      </h4>
                      <span className="text-xs font-medium px-2 py-1 bg-white text-sage-600 rounded-full border border-sage-200">
                        {intervention.frequency}
                      </span>
                    </div>
                    <p className="text-sage-600 text-sm">
                      {intervention.description}
                    </p>
                  </div>
                ))}
              </div>
            </PlanCard>
          )}

          {/* Strengths */}
          {plan.content.strengths.length > 0 && (
            <PlanCard
              title="Your Strengths"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              }
            >
              <StrengthsDisplay strengths={plan.content.strengths} />
            </PlanCard>
          )}

          {/* Last updated */}
          <p className="text-center text-sm text-sage-400">
            Last updated:{" "}
            {new Date(plan.updated_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          {/* Client Copilot - single floating button */}
          <ClientCopilot
            planId={plan.id}
            goals={plan.content.goals}
            interventions={plan.content.interventions}
          />
        </div>
      )}
    </div>
  );
}
