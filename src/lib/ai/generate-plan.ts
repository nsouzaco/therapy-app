import type { PlanContent } from "@/lib/types/plan";
import { callOpenAI } from "./openai-client";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import { parsePlanResponse } from "./parse-response";
import { scanForRisks, mergeRiskFactors } from "./risk-detection";

export interface GeneratePlanOptions {
  transcript: string;
  existingPlan?: PlanContent;
}

export interface GeneratePlanResult {
  success: boolean;
  content?: PlanContent;
  error?: string;
}

/**
 * Generate a treatment plan from a session transcript
 */
export async function generatePlan(
  options: GeneratePlanOptions
): Promise<GeneratePlanResult> {
  const { transcript, existingPlan } = options;

  if (!transcript || transcript.trim().length === 0) {
    return { success: false, error: "Transcript is empty" };
  }

  try {
    // Run keyword scan for risk detection (backup to AI)
    const keywordRiskScan = scanForRisks(transcript);

    // Call OpenAI to generate the plan
    const response = await callOpenAI(async (client) => {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(transcript, existingPlan) },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      });

      return completion.choices[0]?.message?.content || "";
    });

    if (!response) {
      return { success: false, error: "Empty response from AI" };
    }

    // Parse the response
    const parsedContent = parsePlanResponse(response);

    // Merge AI risk detection with keyword scan
    const mergedRisks = mergeRiskFactors(
      parsedContent.risk_factors,
      keywordRiskScan
    );

    const finalContent: PlanContent = {
      ...parsedContent,
      risk_factors: mergedRisks,
    };

    return { success: true, content: finalContent };
  } catch (error) {
    console.error("Plan generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Failed to generate plan: ${message}` };
  }
}

