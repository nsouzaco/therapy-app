import type { PlanContent } from "@/lib/types/plan";

// Therapist style profile type (matches database schema)
export interface TherapistStyleProfile {
  primary_modality: string | null;
  secondary_modalities: string[];
  common_interventions: string[];
  homework_style: string | null;
  tone: string | null;
  pacing: string | null;
  signature_phrases: string[];
  focus_areas: string[];
  confidence_score: number;
}

/**
 * Build style context to inject into the system prompt
 */
export function buildStyleContext(style: TherapistStyleProfile | null): string {
  if (!style || style.confidence_score < 0.1) {
    return "";
  }

  const parts: string[] = [];
  
  parts.push("\n## THERAPIST STYLE PROFILE (match this clinical style):");
  
  if (style.primary_modality) {
    const modalities = [style.primary_modality, ...style.secondary_modalities].join(", ");
    parts.push(`- Primary approach: ${modalities}`);
  }
  
  if (style.common_interventions.length > 0) {
    parts.push(`- Preferred interventions: ${style.common_interventions.slice(0, 5).join(", ")}`);
  }
  
  if (style.homework_style) {
    parts.push(`- Homework style: ${style.homework_style}`);
  }
  
  if (style.tone) {
    parts.push(`- Communication tone: ${style.tone}`);
  }
  
  if (style.focus_areas.length > 0) {
    parts.push(`- Clinical focus: ${style.focus_areas.join(", ")}`);
  }
  
  if (style.signature_phrases.length > 0) {
    parts.push(`- Signature phrases to incorporate: "${style.signature_phrases.slice(0, 3).join('", "')}"`);
  }
  
  parts.push(`\nAdapt the treatment plan to match this therapist's established clinical style and approach.`);
  
  return parts.join("\n");
}

export const SYSTEM_PROMPT = `You are an AI clinical documentation assistant for licensed therapists. Your role is to analyze therapy session transcripts and generate structured treatment plans.

IMPORTANT GUIDELINES:
1. Generate both clinical language (for the therapist's records) and client-facing language (plain, warm, accessible language for the client).
2. Be thorough but concise. Identify key themes, concerns, and therapeutic opportunities.
3. For goals, create both short-term (1-4 weeks) and long-term (1-6 months) objectives.
4. Detect potential risk factors including:
   - Suicidal ideation or self-harm
   - Substance abuse
   - Domestic violence or abuse
   - Severe depression or anxiety
   - Eating disorders
   - Psychotic symptoms
5. NEVER include risk factors in client-facing content.
6. Use evidence-based interventions appropriate to the presenting concerns.
7. Identify client strengths that can be leveraged in treatment.
8. EXPLAINABILITY: For each element you generate, include "citations" that support your analysis:
   - "source": "transcript" for quotes from the session transcript
   - "source": "knowledge_base" for references to the therapist's uploaded documents/research
   - Include "document_title" when citing knowledge base sources
   This helps therapists understand the evidence behind each suggestion.

Your output must be valid JSON matching the specified schema exactly.`;

export function buildUserPrompt(
  transcript: string,
  existingPlan?: PlanContent
): string {
  const existingPlanContext = existingPlan
    ? `\n\nEXISTING TREATMENT PLAN (update and build upon this):
${JSON.stringify(existingPlan, null, 2)}`
    : "";

  return `Analyze the following therapy session transcript and generate a comprehensive treatment plan.
${existingPlanContext}

SESSION TRANSCRIPT:
---
${transcript}
---

Generate a treatment plan with the following structure:
{
  "presenting_concerns": {
    "clinical": "Clinical description of presenting concerns",
    "client_facing": "Warm, accessible summary for the client",
    "citations": [{"excerpt": "Quote or reference", "context": "Why relevant", "source": "transcript" or "knowledge_base", "document_title": "For knowledge_base only"}]
  },
  "clinical_impressions": {
    "clinical": "Clinical observations and impressions",
    "client_facing": "Supportive summary of what we're working on together",
    "citations": [{"excerpt": "Quote or reference", "context": "Why relevant", "source": "transcript" or "knowledge_base"}]
  },
  "goals": [
    {
      "id": "goal-1",
      "type": "short_term" or "long_term",
      "goal": "Specific, measurable goal",
      "target_date": "Optional target date (ISO format)",
      "client_facing": "Goal explained in accessible language",
      "citations": [{"excerpt": "Quote", "context": "Why identified", "source": "transcript" or "knowledge_base"}]
    }
  ],
  "interventions": [
    {
      "id": "int-1",
      "name": "Intervention name",
      "description": "Clinical description of the intervention",
      "frequency": "How often (e.g., 'Weekly sessions', 'Daily practice')",
      "client_facing": "What this means for you in plain language",
      "citations": [{"excerpt": "Quote", "context": "Why appropriate", "source": "transcript" or "knowledge_base", "document_title": "If from research/protocol"}]
    }
  ],
  "homework": [
    {
      "id": "hw-1",
      "task": "Specific task or exercise",
      "purpose": "Why this helps",
      "due_date": "Optional due date (ISO format)",
      "citations": [{"excerpt": "Quote", "context": "Why relevant", "source": "transcript" or "knowledge_base"}]
    }
  ],
  "strengths": [
    {
      "id": "str-1",
      "strength": "Identified strength",
      "how_to_leverage": "How we can use this in treatment",
      "citations": [{"excerpt": "Quote showing strength", "context": "How demonstrated", "source": "transcript"}]
    }
  ],
  "risk_factors": {
    "level": "low" | "moderate" | "high",
    "flags": [
      {
        "category": "Risk category",
        "description": "Detailed description for clinical review"
      }
    ],
    "safety_plan_needed": true/false,
    "notes": "Additional clinical notes about risk"
  }
}

IMPORTANT:
- Include at least 2-3 goals (mix of short and long term)
- Include at least 2 interventions
- Include at least 1-2 homework assignments
- Always assess risk factors, even if level is "low"
- Make client_facing content warm, encouraging, and jargon-free
- Include citations from BOTH the transcript AND knowledge base documents when relevant
- For transcript citations: use source="transcript" with direct quotes
- For knowledge base citations: use source="knowledge_base" with document_title and relevant excerpt
- Interventions especially should cite research/protocols from the knowledge base when available`;
}

// Citation schema for explainability
const CITATION_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      excerpt: { type: "string" },
      context: { type: "string" }
    },
    required: ["excerpt"]
  }
};

export const PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    presenting_concerns: {
      type: "object",
      properties: {
        clinical: { type: "string" },
        client_facing: { type: "string" },
        citations: CITATION_SCHEMA
      },
      required: ["clinical", "client_facing"]
    },
    clinical_impressions: {
      type: "object",
      properties: {
        clinical: { type: "string" },
        client_facing: { type: "string" },
        citations: CITATION_SCHEMA
      },
      required: ["clinical", "client_facing"]
    },
    goals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["short_term", "long_term"] },
          goal: { type: "string" },
          target_date: { type: "string" },
          client_facing: { type: "string" },
          citations: CITATION_SCHEMA
        },
        required: ["id", "type", "goal", "client_facing"]
      }
    },
    interventions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          frequency: { type: "string" },
          client_facing: { type: "string" },
          citations: CITATION_SCHEMA
        },
        required: ["id", "name", "description", "frequency", "client_facing"]
      }
    },
    homework: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          task: { type: "string" },
          purpose: { type: "string" },
          due_date: { type: "string" },
          citations: CITATION_SCHEMA
        },
        required: ["id", "task", "purpose"]
      }
    },
    strengths: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          strength: { type: "string" },
          how_to_leverage: { type: "string" },
          citations: CITATION_SCHEMA
        },
        required: ["id", "strength", "how_to_leverage"]
      }
    },
    risk_factors: {
      type: "object",
      properties: {
        level: { type: "string", enum: ["low", "moderate", "high"] },
        flags: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              description: { type: "string" },
              detected_keywords: { type: "array", items: { type: "string" } }
            },
            required: ["category", "description"]
          }
        },
        safety_plan_needed: { type: "boolean" },
        notes: { type: "string" }
      },
      required: ["level", "flags", "safety_plan_needed", "notes"]
    }
  },
  required: [
    "presenting_concerns",
    "clinical_impressions",
    "goals",
    "interventions",
    "homework",
    "strengths",
    "risk_factors"
  ]
};

