import type { Goal, Intervention, PlanContent } from "@/lib/types/plan";

// ============================================
// SYSTEM PROMPTS
// ============================================

export const THERAPIST_COPILOT_SYSTEM_PROMPT = `You are an AI clinical documentation assistant for licensed therapists. You help with:
- Suggesting evidence-based interventions tailored to client goals
- Recommending therapeutic homework assignments
- Refining clinical language and client-facing communication
- Explaining the evidence base behind therapeutic approaches

IMPORTANT GUIDELINES:
1. Always consider the therapist's uploaded knowledge base materials when making suggestions
2. Cite specific documents from the knowledge base when relevant (use document_title and excerpt)
3. Use evidence-based approaches (CBT, DBT, ACT, EMDR, etc.) appropriate to presenting concerns
4. Suggestions should match the therapist's clinical style when context is available
5. Balance clinical rigor with practical applicability
6. For client-facing language: warm, accessible, encouraging (6th-grade reading level)
7. Never suggest anything that could be harmful or outside standard of care

Your output must be valid JSON.`;

export const CLIENT_COPILOT_SYSTEM_PROMPT = `You are a friendly AI assistant helping therapy clients understand their treatment plan.

IMPORTANT GUIDELINES:
1. Use warm, reassuring language
2. Explain concepts in simple, everyday terms (6th-grade reading level)
3. Be encouraging and supportive
4. Never include clinical jargon
5. Never mention risk factors or diagnoses
6. Focus on hope and empowerment

Your output must be valid JSON.`;

// ============================================
// THERAPIST PROMPTS
// ============================================

export function buildSuggestInterventionsPrompt(
  goal: Goal,
  planContent: PlanContent,
  knowledgeBaseContext?: string,
  transcript?: string
): string {
  const existingInterventions = planContent.interventions
    .map((i) => `- ${i.name}: ${i.description}`)
    .join("\n");

  const existingHomework = planContent.homework
    .map((h) => `- ${h.task}`)
    .join("\n");

  return `Suggest 3 alternative interventions for the following goal. Consider:
- The client's presenting concerns and existing plan
- The therapist's knowledge base materials (prioritize these when relevant)
- Evidence-based approaches appropriate for this presentation
- Avoid duplicating existing interventions

GOAL:
- Clinical: ${goal.goal}
- Client-facing: ${goal.client_facing}
- Type: ${goal.type} (${goal.type === "short_term" ? "1-4 weeks" : "1-6 months"})
${goal.target_date ? `- Target date: ${goal.target_date}` : ""}

PRESENTING CONCERNS:
Clinical: ${planContent.presenting_concerns.clinical}
Client view: ${planContent.presenting_concerns.client_facing}

CLINICAL IMPRESSIONS:
${planContent.clinical_impressions.clinical}

EXISTING INTERVENTIONS (avoid duplicating):
${existingInterventions || "None yet"}

CURRENT HOMEWORK:
${existingHomework || "None yet"}

CLIENT STRENGTHS:
${planContent.strengths.map((s) => `- ${s.strength}: ${s.how_to_leverage}`).join("\n") || "Not identified"}

${
  knowledgeBaseContext
    ? `
THERAPIST'S KNOWLEDGE BASE (prioritize citing these when relevant):
${knowledgeBaseContext}
`
    : ""
}

${
  transcript
    ? `
RECENT SESSION CONTEXT:
${transcript.slice(0, 3000)}
`
    : ""
}

Respond with JSON:
{
  "suggestions": [
    {
      "name": "Intervention name",
      "description": "Clinical description of the technique",
      "frequency": "Recommended frequency (e.g., 'Weekly practice', 'Daily 10-15 min')",
      "client_facing": "Warm, accessible explanation for the client",
      "rationale": "Why this intervention fits this specific goal and client",
      "evidence_source": {
        "document_title": "Title from knowledge base (if applicable)",
        "excerpt": "Relevant excerpt supporting this intervention"
      }
    }
  ]
}

Note: Include evidence_source only if you're citing from the therapist's knowledge base. Make all 3 suggestions distinct approaches.`;
}

export function buildSuggestHomeworkPrompt(
  intervention: Intervention,
  planContent: PlanContent,
  knowledgeBaseContext?: string
): string {
  return `Suggest 3 homework assignments that reinforce this intervention. Consider the client's strengths and current homework load.

INTERVENTION:
- Name: ${intervention.name}
- Description: ${intervention.description}
- Frequency: ${intervention.frequency}
- Client understanding: ${intervention.client_facing}

RELATED GOALS:
${planContent.goals.map((g) => `- ${g.goal}`).join("\n")}

CLIENT STRENGTHS:
${planContent.strengths.map((s) => `- ${s.strength}`).join("\n") || "Not identified"}

CURRENT HOMEWORK (avoid overlap):
${planContent.homework.map((h) => `- ${h.task}`).join("\n") || "None yet"}

${
  knowledgeBaseContext
    ? `
THERAPIST'S KNOWLEDGE BASE (cite when relevant):
${knowledgeBaseContext}
`
    : ""
}

Respond with JSON:
{
  "homeworkSuggestions": [
    {
      "task": "Specific, actionable task",
      "purpose": "What this helps with / why it matters",
      "frequency": "How often (e.g., 'Daily', '3x per week', 'Before next session')",
      "rationale": "How this reinforces the intervention",
      "evidence_source": {
        "document_title": "Title from knowledge base (if applicable)",
        "excerpt": "Relevant excerpt"
      }
    }
  ]
}`;
}

export function buildRefineGoalPrompt(
  goal: Goal,
  planContent: PlanContent,
  userQuery?: string
): string {
  return `Refine this therapy goal to be more specific, measurable, and achievable. ${userQuery ? `The therapist asks: "${userQuery}"` : ""}

CURRENT GOAL:
- Clinical: ${goal.goal}
- Client-facing: ${goal.client_facing}
- Type: ${goal.type}

PRESENTING CONCERNS:
${planContent.presenting_concerns.clinical}

Consider SMART goal principles:
- Specific: Clear and well-defined
- Measurable: Observable or quantifiable
- Achievable: Realistic given the timeframe
- Relevant: Connected to presenting concerns
- Time-bound: Has a target date or timeframe

Respond with JSON:
{
  "refinedGoal": {
    "goal": "Refined clinical goal statement",
    "client_facing": "Warm, accessible version for the client",
    "rationale": "Brief explanation of how this refinement improves the goal"
  }
}`;
}

export function buildExplainEvidencePrompt(
  intervention: Intervention,
  knowledgeBaseContext?: string
): string {
  return `Explain the evidence base for this therapeutic intervention. Reference the therapist's uploaded materials when available.

INTERVENTION:
- Name: ${intervention.name}
- Description: ${intervention.description}

${
  knowledgeBaseContext
    ? `
THERAPIST'S KNOWLEDGE BASE:
${knowledgeBaseContext}
`
    : ""
}

Provide a concise evidence summary including:
1. What modality/approach this comes from
2. What conditions/presentations it's effective for
3. Key research findings or clinical evidence
4. Any relevant citations from the knowledge base

Respond with JSON:
{
  "evidenceExplanation": "A clear, concise summary of the evidence base (2-4 paragraphs)"
}`;
}

export function buildRephrasePrompt(
  clinicalText: string,
  type: "goal" | "intervention" | "impression" | "concern"
): string {
  const typeGuidance: Record<typeof type, string> = {
    goal: "Make it feel achievable and empowering",
    intervention: "Help them understand what to expect and why it helps",
    impression: "Focus on progress and the path forward",
    concern: "Acknowledge without overwhelming, emphasize hope",
  };

  return `Rephrase this clinical text in warm, client-friendly language.

TYPE: ${type}
GUIDANCE: ${typeGuidance[type]}

CLINICAL TEXT:
${clinicalText}

Create a version that:
- Uses everyday language (no jargon)
- Feels warm and encouraging
- Maintains the essential meaning
- Is appropriate for a 6th-grade reading level

Respond with JSON:
{
  "rephrasedText": "The client-friendly version"
}`;
}

// ============================================
// CLIENT PROMPTS
// ============================================

export function buildExplainGoalPrompt(goal: Goal): string {
  return `Explain this therapy goal in simpler, warmer terms that a client would easily understand.

GOAL:
Clinical version: ${goal.goal}
Current client version: ${goal.client_facing}
Type: ${goal.type === "short_term" ? "Something we're working on soon" : "A bigger picture goal"}
${goal.target_date ? `Target: ${goal.target_date}` : ""}

Create a friendlier explanation that:
- Uses everyday language
- Helps them understand WHY this goal matters
- Feels encouraging and achievable
- Is 2-3 sentences max

Respond with JSON:
{
  "simplifiedText": "A warm, simple explanation"
}`;
}

export function buildExplainInterventionPrompt(intervention: Intervention): string {
  return `Explain this therapy technique in simple, reassuring terms for a client.

INTERVENTION:
- Name: ${intervention.name}
- What it involves: ${intervention.description}
- How often: ${intervention.frequency}
- Current explanation: ${intervention.client_facing}

Create an explanation that:
- Helps them understand what this will be like
- Explains why it helps (in simple terms)
- Feels reassuring, not clinical
- Is 2-4 sentences

Respond with JSON:
{
  "simplifiedText": "A friendly, reassuring explanation"
}`;
}

// ============================================
// CHAT PROMPT (Free-form therapist questions)
// ============================================

export const CHAT_SYSTEM_PROMPT = `You are an AI clinical assistant helping a licensed therapist with treatment planning. You have access to:
1. The client's current treatment plan (goals, interventions, homework, clinical impressions)
2. The therapist's uploaded knowledge base documents (research, protocols, techniques)
3. Recent session transcript context when available

IMPORTANT GUIDELINES:
1. Provide evidence-based, clinically sound suggestions
2. Reference the therapist's knowledge base when relevant
3. Be concise but thorough - therapists are busy
4. When suggesting interventions or changes, explain the rationale
5. Consider the client's presenting concerns and existing plan
6. If asked about something outside your expertise, acknowledge limitations
7. Never provide advice that could be harmful or outside standard of care

Format your responses in clear, readable markdown with:
- Bullet points for lists
- **Bold** for key terms
- Short paragraphs for readability`;

export function buildChatPrompt(
  userMessage: string,
  planContent: PlanContent,
  knowledgeBaseContext?: string,
  recentTranscript?: string
): string {
  const planSummary = `
## CURRENT TREATMENT PLAN

**Presenting Concerns:**
${planContent.presenting_concerns.clinical}

**Clinical Impressions:**
${planContent.clinical_impressions.clinical}

**Goals:**
${planContent.goals.map((g) => `- [${g.type}] ${g.goal}`).join("\n")}

**Interventions:**
${planContent.interventions.map((i) => `- ${i.name}: ${i.description} (${i.frequency})`).join("\n")}

**Current Homework:**
${planContent.homework.map((h) => `- ${h.task}`).join("\n") || "None assigned"}

**Client Strengths:**
${planContent.strengths.map((s) => `- ${s.strength}`).join("\n") || "Not identified"}

**Risk Level:** ${planContent.risk_factors.level}
`;

  return `${planSummary}

${
  knowledgeBaseContext
    ? `## THERAPIST'S KNOWLEDGE BASE
${knowledgeBaseContext}
`
    : ""
}

${
  recentTranscript
    ? `## RECENT SESSION CONTEXT
${recentTranscript.slice(0, 2000)}...
`
    : ""
}

## THERAPIST'S QUESTION
${userMessage}

Provide a helpful, clinically-informed response.`;
}

