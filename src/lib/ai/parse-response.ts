import type { PlanContent, Goal, Intervention, Homework, Strength } from "@/lib/types/plan";

/**
 * Parse and validate AI response JSON
 */
export function parsePlanResponse(response: string): PlanContent {
  let parsed: unknown;
  
  try {
    // Try direct JSON parse first
    parsed = JSON.parse(response);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1].trim());
      } catch {
        throw new Error("Failed to parse JSON from response");
      }
    } else {
      // Try to find JSON object in the response
      const objectMatch = response.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          parsed = JSON.parse(objectMatch[0]);
        } catch {
          throw new Error("Failed to parse JSON from response");
        }
      } else {
        throw new Error("No JSON found in response");
      }
    }
  }
  
  // Validate required fields
  return validatePlanContent(parsed);
}

/**
 * Validate and normalize plan content
 */
function validatePlanContent(data: unknown): PlanContent {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid plan content: expected object");
  }
  
  const plan = data as Record<string, unknown>;
  
  // Validate presenting_concerns
  const presentingConcerns = validateDualContent(
    plan.presenting_concerns,
    "presenting_concerns"
  );
  
  // Validate clinical_impressions
  const clinicalImpressions = validateDualContent(
    plan.clinical_impressions,
    "clinical_impressions"
  );
  
  // Validate goals array
  const goals = validateArray<Goal>(plan.goals, "goals", validateGoal);
  
  // Validate interventions array
  const interventions = validateArray<Intervention>(
    plan.interventions,
    "interventions",
    validateIntervention
  );
  
  // Validate homework array
  const homework = validateArray<Homework>(plan.homework, "homework", validateHomework);
  
  // Validate strengths array
  const strengths = validateArray<Strength>(plan.strengths, "strengths", validateStrength);
  
  // Validate risk_factors
  const riskFactors = validateRiskFactors(plan.risk_factors);
  
  return {
    presenting_concerns: presentingConcerns,
    clinical_impressions: clinicalImpressions,
    goals,
    interventions,
    homework,
    strengths,
    risk_factors: riskFactors,
  };
}

function validateDualContent(
  data: unknown,
  _fieldName: string
): { clinical: string; client_facing: string } {
  if (!data || typeof data !== "object") {
    return { clinical: "", client_facing: "" };
  }
  
  const obj = data as Record<string, unknown>;
  return {
    clinical: String(obj.clinical || ""),
    client_facing: String(obj.client_facing || ""),
  };
}

function validateArray<T>(
  data: unknown,
  fieldName: string,
  validator: (item: unknown, index: number) => T
): T[] {
  if (!Array.isArray(data)) {
    console.warn(`Expected array for ${fieldName}, got ${typeof data}`);
    return [];
  }
  
  return data.map((item, index) => validator(item, index));
}

function validateGoal(data: unknown, index: number): Goal {
  const item = (data || {}) as Record<string, unknown>;
  return {
    id: String(item.id || `goal-${index + 1}`),
    type: item.type === "long_term" ? "long_term" : "short_term",
    goal: String(item.goal || ""),
    target_date: item.target_date ? String(item.target_date) : undefined,
    client_facing: String(item.client_facing || item.goal || ""),
  };
}

function validateIntervention(data: unknown, index: number): Intervention {
  const item = (data || {}) as Record<string, unknown>;
  return {
    id: String(item.id || `int-${index + 1}`),
    name: String(item.name || ""),
    description: String(item.description || ""),
    frequency: String(item.frequency || ""),
    client_facing: String(item.client_facing || ""),
  };
}

function validateHomework(data: unknown, index: number): Homework {
  const item = (data || {}) as Record<string, unknown>;
  return {
    id: String(item.id || `hw-${index + 1}`),
    task: String(item.task || ""),
    purpose: String(item.purpose || ""),
    due_date: item.due_date ? String(item.due_date) : undefined,
  };
}

function validateStrength(data: unknown, index: number): Strength {
  const item = (data || {}) as Record<string, unknown>;
  return {
    id: String(item.id || `str-${index + 1}`),
    strength: String(item.strength || ""),
    how_to_leverage: String(item.how_to_leverage || ""),
  };
}

function validateRiskFactors(data: unknown): PlanContent["risk_factors"] {
  const defaultRisk: PlanContent["risk_factors"] = {
    level: "low",
    flags: [],
    safety_plan_needed: false,
    notes: "",
  };
  
  if (!data || typeof data !== "object") {
    return defaultRisk;
  }
  
  const risk = data as Record<string, unknown>;
  
  const level = ["low", "moderate", "high"].includes(String(risk.level))
    ? (String(risk.level) as "low" | "moderate" | "high")
    : "low";
  
  const flags = Array.isArray(risk.flags)
    ? risk.flags.map((flag) => {
        const f = (flag || {}) as Record<string, unknown>;
        return {
          category: String(f.category || "Unknown"),
          description: String(f.description || ""),
          detected_keywords: Array.isArray(f.detected_keywords)
            ? f.detected_keywords.map(String)
            : undefined,
        };
      })
    : [];
  
  return {
    level,
    flags,
    safety_plan_needed: Boolean(risk.safety_plan_needed),
    notes: String(risk.notes || ""),
  };
}

