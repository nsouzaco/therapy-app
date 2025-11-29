import type { RiskLevel, RiskFlag, RiskFactors } from "@/lib/types/plan";

// Risk detection patterns
const RISK_PATTERNS: { category: string; patterns: RegExp[]; severity: "high" | "moderate" }[] = [
  {
    category: "Suicidal ideation",
    severity: "high",
    patterns: [
      /\b(suicid|kill(ing)? (my)?self|end(ing)? (my )?life|don'?t want to (be here|live)|better off dead|not worth living)\b/i,
      /\b(self.?harm|cut(ting)? (my)?self|hurt(ing)? (my)?self)\b/i,
      /\b(overdose|take (too )?many pills)\b/i,
      /\bwant to die\b/i,
    ],
  },
  {
    category: "Homicidal ideation",
    severity: "high",
    patterns: [
      /\b(kill (them|him|her|someone)|hurt (them|him|her))\b/i,
      /\b(want to harm|thoughts of harming)\b/i,
    ],
  },
  {
    category: "Domestic violence/abuse",
    severity: "high",
    patterns: [
      /\b(hit(s)? me|beats? me|abus(e|ive|ing)|violent (partner|spouse|husband|wife))\b/i,
      /\b(scared of (him|her|them|partner|spouse)|threatens? (me|to hurt))\b/i,
    ],
  },
  {
    category: "Substance abuse",
    severity: "moderate",
    patterns: [
      /\b(can'?t stop drinking|drink(ing)? every day|blackout|binge drinking)\b/i,
      /\b(using (drugs|cocaine|heroin|meth)|addicted|addiction|dependent on)\b/i,
      /\b(withdrawal|detox|relapse)\b/i,
    ],
  },
  {
    category: "Severe depression",
    severity: "moderate",
    patterns: [
      /\b(can'?t (get out of bed|function|do anything)|hopeless|no point|give up)\b/i,
      /\b(haven'?t (eaten|slept) in days|complete(ly)? (numb|empty))\b/i,
    ],
  },
  {
    category: "Eating disorder",
    severity: "moderate",
    patterns: [
      /\b(purg(e|ing)|binge(ing)?|starv(e|ing)|restrict(ing)? (food|eating))\b/i,
      /\b(throw(ing)? up (after eating|food)|laxatives|anorex|bulimi)\b/i,
    ],
  },
  {
    category: "Psychotic symptoms",
    severity: "moderate",
    patterns: [
      /\b(hearing voices|voices (tell|told) me|seeing things (that aren'?t there)?)\b/i,
      /\b(paranoi|people (are )?watching|being followed|conspiracy)\b/i,
    ],
  },
  {
    category: "Severe anxiety/panic",
    severity: "moderate",
    patterns: [
      /\b(can'?t (breathe|leave the house)|panic attack|constant panic)\b/i,
      /\b(agoraphob|completely (paralyzed|frozen) by (fear|anxiety))\b/i,
    ],
  },
];

/**
 * Scan transcript for risk indicators using keyword/regex patterns
 */
export function scanForRisks(transcript: string): {
  flags: RiskFlag[];
  level: RiskLevel;
  highRiskDetected: boolean;
} {
  const flags: RiskFlag[] = [];
  let highRiskDetected = false;
  let moderateRiskDetected = false;

  for (const riskType of RISK_PATTERNS) {
    const detectedKeywords: string[] = [];

    for (const pattern of riskType.patterns) {
      const matches = transcript.match(pattern);
      if (matches) {
        detectedKeywords.push(...matches);
      }
    }

    if (detectedKeywords.length > 0) {
      flags.push({
        category: riskType.category,
        description: `Detected potential ${riskType.category.toLowerCase()} indicators in session transcript.`,
        detected_keywords: Array.from(new Set(detectedKeywords)),
      });

      if (riskType.severity === "high") {
        highRiskDetected = true;
      } else {
        moderateRiskDetected = true;
      }
    }
  }

  const level: RiskLevel = highRiskDetected
    ? "high"
    : moderateRiskDetected
    ? "moderate"
    : "low";

  return { flags, level, highRiskDetected };
}

/**
 * Merge AI-detected risks with keyword-scanned risks
 */
export function mergeRiskFactors(
  aiRisks: RiskFactors,
  keywordScan: { flags: RiskFlag[]; level: RiskLevel; highRiskDetected: boolean }
): RiskFactors {
  // Combine flags, avoiding duplicates by category
  const existingCategories = new Set(aiRisks.flags.map((f) => f.category));
  const mergedFlags = [...aiRisks.flags];

  for (const flag of keywordScan.flags) {
    if (!existingCategories.has(flag.category)) {
      mergedFlags.push(flag);
    } else {
      // Add detected keywords to existing flag
      const existingFlag = mergedFlags.find((f) => f.category === flag.category);
      if (existingFlag && flag.detected_keywords) {
        existingFlag.detected_keywords = [
          ...(existingFlag.detected_keywords || []),
          ...flag.detected_keywords,
        ];
      }
    }
  }

  // Use the higher risk level
  const levelPriority: Record<RiskLevel, number> = {
    low: 0,
    moderate: 1,
    high: 2,
  };

  const finalLevel =
    levelPriority[keywordScan.level] > levelPriority[aiRisks.level]
      ? keywordScan.level
      : aiRisks.level;

  // Safety plan needed if high risk detected by either method
  const safetyPlanNeeded =
    aiRisks.safety_plan_needed || keywordScan.highRiskDetected;

  return {
    level: finalLevel,
    flags: mergedFlags,
    safety_plan_needed: safetyPlanNeeded,
    notes: aiRisks.notes,
  };
}

