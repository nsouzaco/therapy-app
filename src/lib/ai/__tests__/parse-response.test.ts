import { describe, it, expect } from "vitest";
import { parsePlanResponse } from "../parse-response";

describe("parsePlanResponse", () => {
  it("parses valid JSON correctly", () => {
    const validJson = JSON.stringify({
      presenting_concerns: {
        clinical: "Patient presents with GAD symptoms",
        client_facing: "We discussed your anxiety",
      },
      clinical_impressions: {
        clinical: "Cognitive distortions present",
        client_facing: "Working on thought patterns",
      },
      goals: [
        {
          id: "goal-1",
          type: "short_term",
          goal: "Reduce panic attacks",
          client_facing: "Feel calmer during the day",
        },
      ],
      interventions: [
        {
          id: "int-1",
          name: "CBT",
          description: "Cognitive restructuring",
          frequency: "Weekly",
          client_facing: "Working on thoughts together",
        },
      ],
      homework: [
        {
          id: "hw-1",
          task: "Breathing exercises",
          purpose: "Calm the nervous system",
        },
      ],
      strengths: [
        {
          id: "str-1",
          strength: "Self-awareness",
          how_to_leverage: "Use to identify triggers",
        },
      ],
      risk_factors: {
        level: "low",
        flags: [],
        safety_plan_needed: false,
        notes: "",
      },
    });

    const result = parsePlanResponse(validJson);

    expect(result.presenting_concerns.clinical).toBe(
      "Patient presents with GAD symptoms"
    );
    expect(result.goals).toHaveLength(1);
    expect(result.goals[0].type).toBe("short_term");
    expect(result.risk_factors.level).toBe("low");
  });

  it("handles JSON wrapped in markdown code blocks", () => {
    const markdownWrapped = `\`\`\`json
{
  "presenting_concerns": { "clinical": "Test", "client_facing": "Test" },
  "clinical_impressions": { "clinical": "Test", "client_facing": "Test" },
  "goals": [],
  "interventions": [],
  "homework": [],
  "strengths": [],
  "risk_factors": { "level": "low", "flags": [], "safety_plan_needed": false, "notes": "" }
}
\`\`\``;

    const result = parsePlanResponse(markdownWrapped);
    expect(result.presenting_concerns.clinical).toBe("Test");
  });

  it("handles malformed JSON by finding embedded object", () => {
    const messyResponse = `Here's the treatment plan:
    {"presenting_concerns": { "clinical": "Embedded", "client_facing": "Test" }, "clinical_impressions": { "clinical": "Test", "client_facing": "Test" }, "goals": [], "interventions": [], "homework": [], "strengths": [], "risk_factors": { "level": "low", "flags": [], "safety_plan_needed": false, "notes": "" }}
    Let me know if you need changes.`;

    const result = parsePlanResponse(messyResponse);
    expect(result.presenting_concerns.clinical).toBe("Embedded");
  });

  it("throws error for completely invalid input", () => {
    expect(() => parsePlanResponse("Not JSON at all")).toThrow(
      "No JSON found in response"
    );
  });

  it("handles missing fields with defaults", () => {
    const minimal = JSON.stringify({
      presenting_concerns: {},
      clinical_impressions: {},
      goals: null,
      interventions: undefined,
      risk_factors: {},
    });

    const result = parsePlanResponse(minimal);

    expect(result.presenting_concerns.clinical).toBe("");
    expect(result.goals).toEqual([]);
    expect(result.interventions).toEqual([]);
    expect(result.homework).toEqual([]);
    expect(result.strengths).toEqual([]);
    expect(result.risk_factors.level).toBe("low");
  });

  it("validates goal types correctly", () => {
    const withGoals = JSON.stringify({
      presenting_concerns: { clinical: "", client_facing: "" },
      clinical_impressions: { clinical: "", client_facing: "" },
      goals: [
        { id: "1", type: "short_term", goal: "Short", client_facing: "Short" },
        { id: "2", type: "long_term", goal: "Long", client_facing: "Long" },
        { id: "3", type: "invalid", goal: "Invalid", client_facing: "Invalid" },
      ],
      interventions: [],
      homework: [],
      strengths: [],
      risk_factors: { level: "low", flags: [], safety_plan_needed: false, notes: "" },
    });

    const result = parsePlanResponse(withGoals);

    expect(result.goals[0].type).toBe("short_term");
    expect(result.goals[1].type).toBe("long_term");
    expect(result.goals[2].type).toBe("short_term"); // defaults to short_term for invalid
  });
});

