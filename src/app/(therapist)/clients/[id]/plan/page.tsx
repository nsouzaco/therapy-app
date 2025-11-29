"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { RiskBanner } from "@/components/plan/risk-banner";
import { PlanSection } from "@/components/plan/plan-section";
import { GoalsSection } from "@/components/plan/goals-section";
import { InterventionsSection } from "@/components/plan/interventions-section";
import { HomeworkSection } from "@/components/plan/homework-section";
import { StrengthsSection } from "@/components/plan/strengths-section";
import { GenerateButton } from "@/components/plan/generate-button";
import type { PlanContent, PlanVersion, Goal, Intervention, Homework, Strength } from "@/lib/types/plan";

interface ClientInfo {
  id: string;
  name: string;
  email: string;
}

interface PlanData {
  id: string;
  client_id: string;
  created_at: string;
  updated_at: string;
  current_version: PlanVersion | null;
}

export default function PlanPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      // Fetch client info
      const clientRes = await fetch(`/api/therapist/clients/${clientId}`);
      if (clientRes.ok) {
        const clientData = await clientRes.json();
        setClient({
          id: clientData.client.id,
          name: clientData.client.name,
          email: clientData.client.email,
        });
      }

      // Fetch plan
      const planRes = await fetch(`/api/clients/${clientId}/plan`);
      if (planRes.ok) {
        const planData = await planRes.json();
        setPlan(planData.plan);
      }
    } catch {
      setError("Failed to load plan");
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const content = plan?.current_version?.content as PlanContent | undefined;

  const updatePlanContent = async (updates: Partial<PlanContent>) => {
    if (!plan?.current_version) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/plans/${plan.id}/versions/${plan.current_version.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: updates }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPlan((prev) =>
          prev ? { ...prev, current_version: data.version } : null
        );
      }
    } catch (error) {
      console.error("Failed to update plan:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!plan?.current_version) return;

    setIsApproving(true);
    try {
      const response = await fetch(
        `/api/plans/${plan.id}/versions/${plan.current_version.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPlan((prev) =>
          prev ? { ...prev, current_version: data.version } : null
        );
      }
    } catch (error) {
      console.error("Failed to approve plan:", error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleGoalUpdate = async (
    goalId: string,
    field: keyof Goal,
    value: string
  ) => {
    if (!content) return;
    const updatedGoals = content.goals.map((g) =>
      g.id === goalId ? { ...g, [field]: value } : g
    );
    await updatePlanContent({ goals: updatedGoals });
  };

  const handleInterventionUpdate = async (
    id: string,
    field: keyof Intervention,
    value: string
  ) => {
    if (!content) return;
    const updated = content.interventions.map((i) =>
      i.id === id ? { ...i, [field]: value } : i
    );
    await updatePlanContent({ interventions: updated });
  };

  const handleHomeworkUpdate = async (
    id: string,
    field: keyof Homework,
    value: string
  ) => {
    if (!content) return;
    const updated = content.homework.map((h) =>
      h.id === id ? { ...h, [field]: value } : h
    );
    await updatePlanContent({ homework: updated });
  };

  const handleStrengthUpdate = async (
    id: string,
    field: keyof Strength,
    value: string
  ) => {
    if (!content) return;
    const updated = content.strengths.map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    await updatePlanContent({ strengths: updated });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/clients/${clientId}`}
          className="text-sage-500 hover:text-sage-700 text-sm mb-2 inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {client?.name || "Client"}
        </Link>
        <div className="flex justify-between items-start mt-2">
          <div>
            <h1 className="text-2xl font-bold text-sage-900">Treatment Plan</h1>
            <p className="text-sage-600">{client?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {isSaving && (
              <span className="text-sm text-sage-500">Saving...</span>
            )}
            {plan?.current_version && (
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  plan.current_version.status === "approved"
                    ? "bg-primary-100 text-primary-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {plan.current_version.status === "approved" ? "Approved" : "Draft"}
              </span>
            )}
            {plan?.current_version?.status === "draft" && (
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                variant="primary"
              >
                {isApproving ? (
                  <>
                    <svg
                      className="w-4 h-4 mr-2 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Approving...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Approve & Share
                  </>
                )}
              </Button>
            )}
            <GenerateButton
              clientId={clientId}
              onSuccess={() => {
                fetchPlan();
                router.refresh();
              }}
              variant={content ? "outline" : "primary"}
            />
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <Disclaimer variant="therapist" className="mb-6" />

      {!content ? (
        <div className="text-center py-12 bg-sage-50 rounded-lg border border-sage-200">
          <svg
            className="w-16 h-16 mx-auto text-sage-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-sage-700 mb-2">
            No Treatment Plan Yet
          </h2>
          <p className="text-sage-500 mb-6 max-w-md mx-auto">
            Upload a session transcript and generate a treatment plan using AI.
          </p>
          <div className="flex justify-center gap-3">
            <Link href={`/clients/${clientId}/sessions/new`}>
              <Button variant="outline">Upload Session</Button>
            </Link>
            <GenerateButton clientId={clientId} onSuccess={fetchPlan} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Risk Banner */}
          {content.risk_factors && (
            <RiskBanner riskFactors={content.risk_factors} />
          )}

          {/* Presenting Concerns */}
          <PlanSection
            title="Presenting Concerns"
            clinicalContent={content.presenting_concerns.clinical}
            clientContent={content.presenting_concerns.client_facing}
            onSaveClinical={async (value) => {
              await updatePlanContent({
                presenting_concerns: {
                  ...content.presenting_concerns,
                  clinical: value,
                },
              });
            }}
            onSaveClient={async (value) => {
              await updatePlanContent({
                presenting_concerns: {
                  ...content.presenting_concerns,
                  client_facing: value,
                },
              });
            }}
          />

          {/* Clinical Impressions */}
          <PlanSection
            title="Clinical Impressions"
            clinicalContent={content.clinical_impressions.clinical}
            clientContent={content.clinical_impressions.client_facing}
            onSaveClinical={async (value) => {
              await updatePlanContent({
                clinical_impressions: {
                  ...content.clinical_impressions,
                  clinical: value,
                },
              });
            }}
            onSaveClient={async (value) => {
              await updatePlanContent({
                clinical_impressions: {
                  ...content.clinical_impressions,
                  client_facing: value,
                },
              });
            }}
          />

          {/* Goals */}
          <GoalsSection
            goals={content.goals}
            onUpdateGoal={handleGoalUpdate}
          />

          {/* Interventions */}
          <InterventionsSection
            interventions={content.interventions}
            onUpdateIntervention={handleInterventionUpdate}
          />

          {/* Homework */}
          <HomeworkSection
            homework={content.homework}
            onUpdateHomework={handleHomeworkUpdate}
          />

          {/* Strengths */}
          <StrengthsSection
            strengths={content.strengths}
            onUpdateStrength={handleStrengthUpdate}
          />

          {/* Version info */}
          {plan?.current_version && (
            <div className="text-sm text-sage-500 text-center pt-4 border-t border-sage-200">
              Version {plan.current_version.version_number} • Generated{" "}
              {new Date(plan.current_version.created_at).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

