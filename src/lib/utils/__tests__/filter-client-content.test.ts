import { describe, it, expect } from "vitest";
import { filterClientContent, isClientSafe } from "../filter-client-content";
import type { PlanContent } from "@/lib/types/plan";

const samplePlanContent: PlanContent = {
  presenting_concerns: {
    clinical: "Patient presents with generalized anxiety disorder (GAD) symptoms",
    client_facing: "We discussed your feelings of anxiety and worry",
  },
  clinical_impressions: {
    clinical:
      "Cognitive distortions including catastrophizing and black-and-white thinking",
    client_facing: "We're working on changing some thought patterns together",
  },
  goals: [
    {
      id: "goal-1",
      type: "short_term",
      goal: "Reduce frequency of panic attacks from 3x/week to 1x/week",
      target_date: "2024-02-15",
      client_facing: "Feel calmer and have fewer panic moments",
    },
    {
      id: "goal-2",
      type: "long_term",
      goal: "Develop adaptive coping mechanisms for anxiety triggers",
      client_facing: "Build skills to handle stress better",
    },
  ],
  interventions: [
    {
      id: "int-1",
      name: "Cognitive Behavioral Therapy",
      description: "Address cognitive distortions through structured sessions",
      frequency: "Weekly",
      client_facing: "Weekly sessions to work on thought patterns",
    },
  ],
  homework: [
    {
      id: "hw-1",
      task: "Practice box breathing 2x daily",
      purpose: "Activate parasympathetic nervous system",
      due_date: "2024-01-20",
    },
  ],
  strengths: [
    {
      id: "str-1",
      strength: "Strong self-awareness",
      how_to_leverage: "Use to identify triggers early",
    },
  ],
  risk_factors: {
    level: "moderate",
    flags: [
      {
        category: "Anxiety",
        description: "Elevated anxiety levels with panic episodes",
      },
    ],
    safety_plan_needed: false,
    notes: "Monitor for escalation",
  },
};

describe("filterClientContent", () => {
  it("removes clinical content from presenting_concerns", () => {
    const result = filterClientContent(samplePlanContent);

    expect(result.presenting_concerns).toBe(
      "We discussed your feelings of anxiety and worry"
    );
    expect(result).not.toHaveProperty("presenting_concerns.clinical");
  });

  it("removes clinical content from clinical_impressions", () => {
    const result = filterClientContent(samplePlanContent);

    expect(result.what_were_working_on).toBe(
      "We're working on changing some thought patterns together"
    );
  });

  it("removes risk_factors entirely", () => {
    const result = filterClientContent(samplePlanContent);

    expect(result).not.toHaveProperty("risk_factors");
  });

  it("uses client_facing goal text", () => {
    const result = filterClientContent(samplePlanContent);

    expect(result.goals[0].goal).toBe("Feel calmer and have fewer panic moments");
    expect(result.goals[0].goal).not.toContain("panic attacks");
    expect(result.goals[0].goal).not.toContain("3x/week");
  });

  it("uses client_facing intervention descriptions", () => {
    const result = filterClientContent(samplePlanContent);

    expect(result.interventions[0].description).toBe(
      "Weekly sessions to work on thought patterns"
    );
    expect(result.interventions[0].description).not.toContain(
      "cognitive distortions"
    );
  });

  it("preserves homework fields (all are client-appropriate)", () => {
    const result = filterClientContent(samplePlanContent);

    expect(result.homework[0].task).toBe("Practice box breathing 2x daily");
    expect(result.homework[0].purpose).toBe(
      "Activate parasympathetic nervous system"
    );
    expect(result.homework[0].due_date).toBe("2024-01-20");
  });

  it("preserves strengths fields", () => {
    const result = filterClientContent(samplePlanContent);

    expect(result.strengths[0].strength).toBe("Strong self-awareness");
    expect(result.strengths[0].how_to_leverage).toBe(
      "Use to identify triggers early"
    );
  });

  it("preserves goal metadata (id, type, target_date)", () => {
    const result = filterClientContent(samplePlanContent);

    expect(result.goals[0].id).toBe("goal-1");
    expect(result.goals[0].type).toBe("short_term");
    expect(result.goals[0].target_date).toBe("2024-02-15");
  });
});

describe("isClientSafe", () => {
  it("returns false for content with risk_factors", () => {
    expect(isClientSafe(samplePlanContent)).toBe(false);
  });

  it("returns false for content with clinical fields in presenting_concerns", () => {
    const content = {
      presenting_concerns: {
        clinical: "Should not be here",
        client_facing: "Safe content",
      },
    };
    expect(isClientSafe(content)).toBe(false);
  });

  it("returns true for properly filtered content", () => {
    const filtered = filterClientContent(samplePlanContent);
    expect(isClientSafe(filtered)).toBe(true);
  });

  it("returns false for null/undefined", () => {
    expect(isClientSafe(null)).toBe(false);
    expect(isClientSafe(undefined)).toBe(false);
  });

  it("returns false for non-objects", () => {
    expect(isClientSafe("string")).toBe(false);
    expect(isClientSafe(123)).toBe(false);
  });
});

