import { callOpenAI } from "./openai-client";

export interface SessionSummary {
  therapist_summary: string;
  client_summary: string;
  key_themes: string[];
  progress_notes: string;
}

const SUMMARY_SYSTEM_PROMPT = `You are a clinical documentation assistant helping therapists create session summaries. Generate two versions of a session summary:

1. THERAPIST SUMMARY: Clinical, structured, documentation-ready. Include:
   - Key themes discussed
   - Interventions used
   - Client's presentation and affect
   - Progress toward goals
   - Clinical observations

2. CLIENT SUMMARY: Warm, encouraging, plain-language. Include:
   - What you worked on together
   - Accomplishments or insights
   - Encouragement for next steps
   - Positive framing

Also extract:
- Key themes (3-5 bullet points)
- Brief progress notes

Return valid JSON only.`;

function buildSummaryPrompt(transcript: string): string {
  return `Summarize this therapy session transcript.

TRANSCRIPT:
---
${transcript.slice(0, 15000)}${transcript.length > 15000 ? "\n[... transcript truncated ...]" : ""}
---

Return JSON in this exact format:
{
  "therapist_summary": "Clinical summary for documentation...",
  "client_summary": "Warm, encouraging summary for the client...",
  "key_themes": ["theme 1", "theme 2", "theme 3"],
  "progress_notes": "Brief clinical notes on progress..."
}`;
}

export async function generateSessionSummary(
  transcript: string
): Promise<SessionSummary | null> {
  if (!transcript || transcript.trim().length < 100) {
    return null;
  }

  try {
    const response = await callOpenAI(async (client) => {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SUMMARY_SYSTEM_PROMPT },
          { role: "user", content: buildSummaryPrompt(transcript) },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });

      return completion.choices[0]?.message?.content || "";
    });

    if (!response) {
      return null;
    }

    const parsed = JSON.parse(response);

    return {
      therapist_summary: parsed.therapist_summary || "",
      client_summary: parsed.client_summary || "",
      key_themes: Array.isArray(parsed.key_themes) ? parsed.key_themes : [],
      progress_notes: parsed.progress_notes || "",
    };
  } catch (error) {
    console.error("Summary generation error:", error);
    return null;
  }
}

