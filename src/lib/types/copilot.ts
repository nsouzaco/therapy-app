// Copilot request types for AI assistance features
import type { PlanContent } from "./plan";

export type CopilotAction =
  // Therapist actions
  | "suggest_interventions" // Suggest alternatives for a goal
  | "suggest_homework" // Suggest homework for intervention
  | "rephrase_client_facing" // Rewrite clinical text for client
  | "suggest_goal_refinement" // Refine an existing goal
  | "explain_evidence" // Explain evidence base for intervention
  | "chat" // Free-form chat for therapists
  // Client actions
  | "explain_goal" // Simplify a goal
  | "explain_intervention"; // Explain an intervention

// Chat message type
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface CopilotRequest {
  action: CopilotAction;
  context: {
    goalId?: string;
    interventionId?: string;
    planContent: PlanContent;
    recentTranscript?: string;
    // Knowledge base context from RAG
    knowledgeBaseContext?: string;
  };
  userQuery?: string;
}

export interface SuggestedIntervention {
  name: string;
  description: string;
  frequency: string;
  client_facing: string;
  rationale: string;
  // Reference to knowledge base if applicable
  evidence_source?: {
    document_title: string;
    excerpt: string;
  };
}

export interface SuggestedHomework {
  task: string;
  purpose: string;
  frequency: string;
  rationale: string;
  evidence_source?: {
    document_title: string;
    excerpt: string;
  };
}

export interface RefinedGoal {
  goal: string;
  client_facing: string;
  rationale: string;
}

export interface CopilotResponse {
  success: boolean;
  action: CopilotAction;
  result?: {
    suggestions?: SuggestedIntervention[];
    homeworkSuggestions?: SuggestedHomework[];
    simplifiedText?: string;
    rephrasedText?: string;
    refinedGoal?: RefinedGoal;
    evidenceExplanation?: string;
    // Chat response
    chatResponse?: string;
  };
  error?: string;
}

// Actions allowed for clients (limited set)
export const CLIENT_ALLOWED_ACTIONS: CopilotAction[] = [
  "explain_goal",
  "explain_intervention",
];

// Actions that benefit from RAG knowledge base
export const RAG_ENHANCED_ACTIONS: CopilotAction[] = [
  "suggest_interventions",
  "suggest_homework",
  "explain_evidence",
];

