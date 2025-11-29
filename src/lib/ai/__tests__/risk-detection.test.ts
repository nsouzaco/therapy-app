import { describe, it, expect } from "vitest";
import { scanForRisks, mergeRiskFactors } from "../risk-detection";
import type { RiskFactors } from "@/lib/types/plan";

describe("scanForRisks", () => {
  it("detects suicidal ideation keywords", () => {
    const transcript = "I've been thinking about killing myself lately.";
    const result = scanForRisks(transcript);

    expect(result.level).toBe("high");
    expect(result.highRiskDetected).toBe(true);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].category).toBe("Suicidal ideation");
  });

  it("detects substance abuse keywords", () => {
    const transcript =
      "I can't stop drinking. I drink every day and sometimes I blackout.";
    const result = scanForRisks(transcript);

    expect(result.level).toBe("moderate");
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].category).toBe("Substance abuse");
  });

  it("detects multiple risk categories", () => {
    const transcript =
      "I've been drinking a lot and sometimes I think about hurting myself.";
    const result = scanForRisks(transcript);

    expect(result.level).toBe("high");
    expect(result.flags.length).toBeGreaterThanOrEqual(1);
  });

  it("returns low risk for benign transcripts", () => {
    const transcript =
      "I've been feeling better this week. The breathing exercises are helping.";
    const result = scanForRisks(transcript);

    expect(result.level).toBe("low");
    expect(result.highRiskDetected).toBe(false);
    expect(result.flags).toHaveLength(0);
  });

  it("handles case insensitivity", () => {
    const transcript = "I WANT TO KILL MYSELF";
    const result = scanForRisks(transcript);

    expect(result.level).toBe("high");
    expect(result.flags).toHaveLength(1);
  });

  it("detects domestic violence keywords", () => {
    const transcript = "My partner hits me when he gets angry.";
    const result = scanForRisks(transcript);

    expect(result.level).toBe("high");
    expect(result.flags.some((f) => f.category === "Domestic violence/abuse")).toBe(
      true
    );
  });

  it("detects severe depression indicators", () => {
    const transcript =
      "I haven't been able to get out of bed for days. Everything feels hopeless.";
    const result = scanForRisks(transcript);

    expect(result.level).toBe("moderate");
    expect(
      result.flags.some((f) => f.category === "Severe depression")
    ).toBe(true);
  });

  it("includes detected keywords in flags", () => {
    const transcript = "I've been thinking about suicide and killing myself.";
    const result = scanForRisks(transcript);

    expect(result.flags[0].detected_keywords).toBeDefined();
    expect(result.flags[0].detected_keywords!.length).toBeGreaterThan(0);
  });
});

describe("mergeRiskFactors", () => {
  const baseAIRisks: RiskFactors = {
    level: "low",
    flags: [],
    safety_plan_needed: false,
    notes: "No significant risks detected.",
  };

  it("uses higher risk level from keyword scan", () => {
    const keywordScan = {
      level: "high" as const,
      flags: [{ category: "Suicidal ideation", description: "Test" }],
      highRiskDetected: true,
    };

    const result = mergeRiskFactors(baseAIRisks, keywordScan);

    expect(result.level).toBe("high");
    expect(result.safety_plan_needed).toBe(true);
  });

  it("uses higher risk level from AI when it's higher", () => {
    const aiRisks: RiskFactors = {
      level: "high",
      flags: [{ category: "Self-harm", description: "AI detected" }],
      safety_plan_needed: true,
      notes: "High risk",
    };

    const keywordScan = {
      level: "low" as const,
      flags: [],
      highRiskDetected: false,
    };

    const result = mergeRiskFactors(aiRisks, keywordScan);

    expect(result.level).toBe("high");
    expect(result.safety_plan_needed).toBe(true);
  });

  it("merges flags from both sources", () => {
    const aiRisks: RiskFactors = {
      level: "moderate",
      flags: [{ category: "Depression", description: "AI detected" }],
      safety_plan_needed: false,
      notes: "",
    };

    const keywordScan = {
      level: "moderate" as const,
      flags: [{ category: "Substance abuse", description: "Keyword detected" }],
      highRiskDetected: false,
    };

    const result = mergeRiskFactors(aiRisks, keywordScan);

    expect(result.flags).toHaveLength(2);
    expect(result.flags.some((f) => f.category === "Depression")).toBe(true);
    expect(result.flags.some((f) => f.category === "Substance abuse")).toBe(true);
  });

  it("adds keywords to existing category flags", () => {
    const aiRisks: RiskFactors = {
      level: "high",
      flags: [{ category: "Suicidal ideation", description: "AI description" }],
      safety_plan_needed: true,
      notes: "",
    };

    const keywordScan = {
      level: "high" as const,
      flags: [
        {
          category: "Suicidal ideation",
          description: "Keyword description",
          detected_keywords: ["suicide", "kill myself"],
        },
      ],
      highRiskDetected: true,
    };

    const result = mergeRiskFactors(aiRisks, keywordScan);

    // Should not duplicate the category
    const suicidalFlags = result.flags.filter(
      (f) => f.category === "Suicidal ideation"
    );
    expect(suicidalFlags).toHaveLength(1);
    expect(suicidalFlags[0].detected_keywords).toContain("suicide");
  });
});

