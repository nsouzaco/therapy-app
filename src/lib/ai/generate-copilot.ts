import { callOpenAI } from "./openai-client";
import {
  THERAPIST_COPILOT_SYSTEM_PROMPT,
  CLIENT_COPILOT_SYSTEM_PROMPT,
  CHAT_SYSTEM_PROMPT,
  buildSuggestInterventionsPrompt,
  buildSuggestHomeworkPrompt,
  buildRefineGoalPrompt,
  buildExplainEvidencePrompt,
  buildRephrasePrompt,
  buildExplainGoalPrompt,
  buildExplainInterventionPrompt,
  buildChatPrompt,
} from "./copilot-prompts";
import {
  retrieveRelevantChunks,
  formatChunksForPrompt,
} from "@/lib/rag/retrieval";
import type {
  CopilotRequest,
  CopilotResponse,
  SuggestedIntervention,
  SuggestedHomework,
  RefinedGoal,
} from "@/lib/types/copilot";

interface GenerateCopilotOptions extends CopilotRequest {
  therapistId?: string; // For RAG retrieval
  isClient?: boolean;
}

/**
 * Build RAG context for copilot actions
 */
async function buildCopilotRAGContext(
  therapistId: string,
  action: CopilotRequest["action"],
  planContent: CopilotRequest["context"]["planContent"],
  userQuery?: string
): Promise<string> {
  // Build a query based on the action and plan content
  let query = "";

  switch (action) {
    case "suggest_interventions":
      query = `${planContent.presenting_concerns.clinical} interventions techniques therapy approaches`;
      break;
    case "suggest_homework":
      query = `homework assignments exercises therapeutic activities practice`;
      break;
    case "explain_evidence":
      query = `evidence research efficacy clinical trials outcomes`;
      break;
    case "chat":
      // For chat, use the user's message + presenting concerns
      query = `${userQuery || ""} ${planContent.presenting_concerns.clinical}`;
      break;
    default:
      return "";
  }

  try {
    const chunks = await retrieveRelevantChunks(therapistId, query, {
      limit: 5,
      minSimilarity: 0.65, // Slightly lower threshold for chat to get more context
      sourceTypes: ["research", "protocol", "technique", "worksheet", "preference"],
    });

    if (chunks.length === 0) {
      return "";
    }

    return formatChunksForPrompt(chunks);
  } catch (error) {
    console.error("RAG retrieval error for copilot:", error);
    return "";
  }
}

/**
 * Generate a copilot response based on the action
 */
export async function generateCopilotResponse(
  options: GenerateCopilotOptions
): Promise<CopilotResponse> {
  const { action, context, userQuery, therapistId, isClient = false } = options;
  const { planContent, recentTranscript } = context;

  try {
    // Determine system prompt based on user type
    const systemPrompt = isClient
      ? CLIENT_COPILOT_SYSTEM_PROMPT
      : THERAPIST_COPILOT_SYSTEM_PROMPT;

    // Build RAG context for enhanced actions (therapist only)
    let knowledgeBaseContext = context.knowledgeBaseContext || "";
    const ragActions = ["suggest_interventions", "suggest_homework", "explain_evidence", "chat"];
    if (!isClient && therapistId && ragActions.includes(action)) {
      knowledgeBaseContext = await buildCopilotRAGContext(
        therapistId,
        action,
        planContent,
        userQuery
      );
    }

    // Build the appropriate user prompt
    let userPrompt: string;

    switch (action) {
      case "suggest_interventions": {
        const goal = planContent.goals.find((g) => g.id === context.goalId);
        if (!goal) {
          return { success: false, action, error: "Goal not found" };
        }
        userPrompt = buildSuggestInterventionsPrompt(
          goal,
          planContent,
          knowledgeBaseContext,
          recentTranscript
        );
        break;
      }

      case "suggest_homework": {
        const intervention = planContent.interventions.find(
          (i) => i.id === context.interventionId
        );
        if (!intervention) {
          return { success: false, action, error: "Intervention not found" };
        }
        userPrompt = buildSuggestHomeworkPrompt(
          intervention,
          planContent,
          knowledgeBaseContext
        );
        break;
      }

      case "suggest_goal_refinement": {
        const goal = planContent.goals.find((g) => g.id === context.goalId);
        if (!goal) {
          return { success: false, action, error: "Goal not found" };
        }
        userPrompt = buildRefineGoalPrompt(goal, planContent, userQuery);
        break;
      }

      case "explain_evidence": {
        const intervention = planContent.interventions.find(
          (i) => i.id === context.interventionId
        );
        if (!intervention) {
          return { success: false, action, error: "Intervention not found" };
        }
        userPrompt = buildExplainEvidencePrompt(
          intervention,
          knowledgeBaseContext
        );
        break;
      }

      case "rephrase_client_facing": {
        if (!userQuery) {
          return { success: false, action, error: "No text to rephrase" };
        }
        userPrompt = buildRephrasePrompt(userQuery, "goal");
        break;
      }

      case "explain_goal": {
        const goal = planContent.goals.find((g) => g.id === context.goalId);
        if (!goal) {
          return { success: false, action, error: "Goal not found" };
        }
        userPrompt = buildExplainGoalPrompt(goal);
        break;
      }

      case "explain_intervention": {
        const intervention = planContent.interventions.find(
          (i) => i.id === context.interventionId
        );
        if (!intervention) {
          return { success: false, action, error: "Intervention not found" };
        }
        userPrompt = buildExplainInterventionPrompt(intervention);
        break;
      }

      case "chat": {
        if (!userQuery) {
          return { success: false, action, error: "No message provided" };
        }
        userPrompt = buildChatPrompt(
          userQuery,
          planContent,
          knowledgeBaseContext,
          recentTranscript
        );
        
        // Chat uses a different flow - no JSON parsing needed
        const chatResponse = await callOpenAI(async (client) => {
          const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: CHAT_SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 2000,
            // No JSON format for chat - we want natural markdown
          });
          return completion.choices[0]?.message?.content || "";
        });

        if (!chatResponse) {
          return { success: false, action, error: "Empty AI response" };
        }

        return {
          success: true,
          action,
          result: {
            chatResponse,
          },
        };
      }

      default:
        return { success: false, action, error: "Unknown action" };
    }

    // Call OpenAI (for non-chat actions)
    const response = await callOpenAI(async (client) => {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });
      return completion.choices[0]?.message?.content || "";
    });

    if (!response) {
      return { success: false, action, error: "Empty AI response" };
    }

    // Parse the response
    const parsed = JSON.parse(response);

    return {
      success: true,
      action,
      result: {
        suggestions: parsed.suggestions as SuggestedIntervention[] | undefined,
        homeworkSuggestions: parsed.homeworkSuggestions as
          | SuggestedHomework[]
          | undefined,
        simplifiedText: parsed.simplifiedText as string | undefined,
        rephrasedText: parsed.rephrasedText as string | undefined,
        refinedGoal: parsed.refinedGoal as RefinedGoal | undefined,
        evidenceExplanation: parsed.evidenceExplanation as string | undefined,
      },
    };
  } catch (error) {
    console.error("Copilot generation error:", error);
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

