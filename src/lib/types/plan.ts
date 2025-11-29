// Treatment Plan Types - Matching PRD Schema

export interface PresentingConcerns {
  clinical: string;
  client_facing: string;
}

export interface ClinicalImpressions {
  clinical: string;
  client_facing: string;
}

export interface Goal {
  id: string;
  type: "short_term" | "long_term";
  goal: string;
  target_date?: string;
  client_facing: string;
}

export interface Intervention {
  id: string;
  name: string;
  description: string;
  frequency: string;
  client_facing: string;
}

export interface Homework {
  id: string;
  task: string;
  purpose: string;
  due_date?: string;
}

export interface Strength {
  id: string;
  strength: string;
  how_to_leverage: string;
}

export type RiskLevel = "low" | "moderate" | "high";

export interface RiskFlag {
  category: string;
  description: string;
  detected_keywords?: string[];
}

export interface RiskFactors {
  level: RiskLevel;
  flags: RiskFlag[];
  safety_plan_needed: boolean;
  notes: string;
}

export interface PlanContent {
  presenting_concerns: PresentingConcerns;
  clinical_impressions: ClinicalImpressions;
  goals: Goal[];
  interventions: Intervention[];
  homework: Homework[];
  strengths: Strength[];
  risk_factors: RiskFactors;
}

// API Response types
export interface PlanVersion {
  id: string;
  plan_id: string;
  version_number: number;
  source_session_id: string | null;
  status: "draft" | "approved";
  content: PlanContent;
  created_at: string;
}

export interface TreatmentPlan {
  id: string;
  client_id: string;
  created_at: string;
  updated_at: string;
  current_version: PlanVersion | null;
}

// For generating new content
export interface GeneratePlanRequest {
  transcript: string;
  existingPlan?: PlanContent;
}

export interface GeneratePlanResponse {
  success: boolean;
  plan?: PlanVersion;
  error?: string;
}

