import type { PlanContent } from "@/lib/types/plan";

export interface ClientSafePlanContent {
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
}

/**
 * Filter plan content to only include client-safe fields.
 * Removes all clinical documentation and risk factors.
 */
export function filterClientContent(content: PlanContent): ClientSafePlanContent {
  return {
    // Use client_facing content only
    presenting_concerns: content.presenting_concerns.client_facing,
    what_were_working_on: content.clinical_impressions.client_facing,

    // Goals - use client_facing version of the goal text
    goals: content.goals.map((g) => ({
      id: g.id,
      type: g.type,
      goal: g.client_facing, // Use client-facing, not clinical goal text
      target_date: g.target_date,
    })),

    // Interventions - use client_facing descriptions
    interventions: content.interventions.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.client_facing, // Use client-facing, not clinical description
      frequency: i.frequency,
    })),

    // Homework - all fields are client-appropriate
    homework: content.homework.map((h) => ({
      id: h.id,
      task: h.task,
      purpose: h.purpose,
      due_date: h.due_date,
    })),

    // Strengths - all fields are client-appropriate
    strengths: content.strengths.map((s) => ({
      id: s.id,
      strength: s.strength,
      how_to_leverage: s.how_to_leverage,
    })),

    // Note: risk_factors is intentionally excluded
  };
}

/**
 * Verify that content is safe for client viewing.
 * Returns true if no clinical or risk content is present.
 */
export function isClientSafe(content: unknown): boolean {
  if (!content || typeof content !== "object") return false;

  const obj = content as Record<string, unknown>;

  // Should not have risk_factors
  if ("risk_factors" in obj) return false;

  // Should not have clinical fields in presenting_concerns
  if (obj.presenting_concerns && typeof obj.presenting_concerns === "object") {
    const pc = obj.presenting_concerns as Record<string, unknown>;
    if ("clinical" in pc) return false;
  }

  // Should not have clinical fields in clinical_impressions
  if (
    obj.clinical_impressions &&
    typeof obj.clinical_impressions === "object"
  ) {
    const ci = obj.clinical_impressions as Record<string, unknown>;
    if ("clinical" in ci) return false;
  }

  return true;
}

