import { getOpenAIClient } from "./openai-client";
import { buildRAGContext } from "@/lib/rag/retrieval";

export interface TherapistStyleExtraction {
  modalities: {
    primary: string | null;
    secondary: string[];
    indicators: Record<string, string[]>;
  };
  interventions: string[];
  communication: {
    tone: string;
    pacing: string;
    uses_metaphors: boolean;
  };
  signature_phrases: string[];
  focus_areas: string[];
  homework_style: string;
}

const STYLE_EXTRACTION_PROMPT = `You are an expert clinical supervisor analyzing a therapy session transcript.

Your task is to extract the THERAPIST'S clinical style from how they speak and interact with the client.
Focus ONLY on the therapist's contributions, NOT the client's.

Analyze for:

1. **Therapeutic Modalities** - Identify approaches from language patterns:
   - CBT: Cognitive restructuring, thought challenging, behavioral experiments, Socratic questioning
   - ACT: Values clarification, acceptance, defusion, willingness, present moment
   - DBT: Distress tolerance, emotion regulation, interpersonal effectiveness, mindfulness skills
   - MI (Motivational Interviewing): Reflective listening, change talk, rolling with resistance, OARS
   - Psychodynamic: Exploring past, unconscious patterns, transference, defense mechanisms
   - Solution-Focused: Miracle question, scaling, exceptions, future-focused
   - Person-Centered: Unconditional positive regard, empathic reflection, genuineness

2. **Intervention Patterns** - What techniques does the therapist actively use?
   - Breathing exercises, grounding techniques
   - Thought records, cognitive restructuring
   - Behavioral activation, exposure
   - Journaling, worksheets
   - Role-playing, chair work
   - Mindfulness exercises

3. **Communication Style**:
   - Tone: warm, clinical, warm-clinical, direct, gentle
   - Pacing: exploratory (slow, open-ended), directive (structured, goal-oriented), balanced
   - Use of metaphors or analogies

4. **Signature Phrases** - Recurring phrases or ways of speaking unique to this therapist

5. **Focus Areas** - Clinical emphases:
   - Strengths-based (emphasizes client capabilities)
   - Trauma-informed (safety, choice, collaboration)
   - Solution-focused (future-oriented, practical)
   - Insight-oriented (understanding patterns)

6. **Homework Style** - How they assign between-session work:
   - structured (specific tasks with instructions)
   - flexible (suggestions, client-driven)
   - minimal (rarely assigns homework)
   - collaborative (co-created with client)

Return your analysis as JSON:
{
  "modalities": {
    "primary": "CBT" | "ACT" | "DBT" | "MI" | "Psychodynamic" | "Solution-Focused" | "Person-Centered" | "Integrative" | null,
    "secondary": ["MI", "Mindfulness"],
    "indicators": {
      "CBT": ["uses thought challenging", "explores evidence for beliefs"],
      "MI": ["reflective listening", "explores ambivalence"]
    }
  },
  "interventions": ["breathing exercises", "thought records", "behavioral experiments"],
  "communication": {
    "tone": "warm-clinical",
    "pacing": "balanced",
    "uses_metaphors": true
  },
  "signature_phrases": [
    "What's the evidence for that thought?",
    "I'm curious about...",
    "What would it mean if..."
  ],
  "focus_areas": ["strengths-based", "practical-coping"],
  "homework_style": "collaborative"
}

If there's insufficient data to determine something, use null or empty arrays.
Be specific and evidence-based - cite actual phrases or patterns you observed.`;

/**
 * Extract therapist clinical style from a session transcript
 * @param transcript - The session transcript to analyze
 * @param therapistId - Optional therapist ID for RAG preference retrieval
 */
export async function extractTherapistStyle(
  transcript: string,
  therapistId?: string
): Promise<{ success: true; extraction: TherapistStyleExtraction } | { success: false; error: string }> {
  try {
    const openai = getOpenAIClient();

    // Try to extract therapist portions, but fall back to full transcript
    let textToAnalyze = extractTherapistSpeech(transcript);
    
    // If speaker labels aren't found, use the full transcript
    // The AI prompt instructs it to focus on therapist speech patterns
    if (textToAnalyze.length < 200) {
      textToAnalyze = transcript;
    }
    
    // Still need minimum content to analyze
    if (textToAnalyze.length < 500) {
      return {
        success: false,
        error: "Transcript too short for style analysis (need at least 500 characters)",
      };
    }

    // Retrieve therapist's stated preferences from knowledge base (RAG)
    let preferenceContext = "";
    if (therapistId) {
      try {
        preferenceContext = await buildRAGContext(therapistId, transcript, {
          forPlanGeneration: false,
          forStyleLearning: true,
        });
      } catch (ragError) {
        // RAG is optional - log error but continue
        console.error("RAG retrieval error in style extraction:", ragError);
      }
    }

    const systemPrompt = STYLE_EXTRACTION_PROMPT + (preferenceContext ? `\n\n${preferenceContext}` : "");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze this therapist's clinical style from the following transcript:\n\n${textToAnalyze}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return { success: false, error: "Empty response from AI" };
    }

    const extraction = JSON.parse(content) as TherapistStyleExtraction;
    
    // Validate required fields
    if (!extraction.modalities || !extraction.communication) {
      return { success: false, error: "Invalid extraction format" };
    }

    return { success: true, extraction };
  } catch (error) {
    console.error("Style extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extract therapist speech from transcript
 * Handles common formats: "Therapist:", "T:", speaker labels
 */
function extractTherapistSpeech(transcript: string): string {
  const lines = transcript.split("\n");
  const therapistLines: string[] = [];
  
  const therapistPatterns = [
    /^therapist\s*:/i,
    /^t\s*:/i,
    /^counselor\s*:/i,
    /^clinician\s*:/i,
    /^dr\.?\s*\w+\s*:/i,
  ];

  let currentSpeaker = "";
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this line starts with a speaker label
    const isTherapistLine = therapistPatterns.some((p) => p.test(trimmedLine));
    const isClientLine = /^(client|patient|c)\s*:/i.test(trimmedLine);
    
    if (isTherapistLine) {
      currentSpeaker = "therapist";
      // Extract text after the label
      const text = trimmedLine.replace(/^[^:]+:\s*/, "");
      if (text) therapistLines.push(text);
    } else if (isClientLine) {
      currentSpeaker = "client";
    } else if (currentSpeaker === "therapist" && trimmedLine) {
      // Continuation of therapist speech
      therapistLines.push(trimmedLine);
    }
  }

  return therapistLines.join(" ");
}

/**
 * Merge multiple session extractions into an aggregated profile
 */
export async function mergeStyleExtractions(
  extractions: TherapistStyleExtraction[]
): Promise<{
  primary_modality: string | null;
  secondary_modalities: string[];
  modality_indicators: Record<string, string[]>;
  common_interventions: string[];
  homework_style: string | null;
  tone: string | null;
  pacing: string | null;
  uses_metaphors: boolean;
  signature_phrases: string[];
  focus_areas: string[];
  confidence_score: number;
}> {
  if (extractions.length === 0) {
    return {
      primary_modality: null,
      secondary_modalities: [],
      modality_indicators: {},
      common_interventions: [],
      homework_style: null,
      tone: null,
      pacing: null,
      uses_metaphors: false,
      signature_phrases: [],
      focus_areas: [],
      confidence_score: 0,
    };
  }

  // Count occurrences of each modality
  const modalityCounts: Record<string, number> = {};
  const allIndicators: Record<string, string[]> = {};
  const interventionCounts: Record<string, number> = {};
  const toneCounts: Record<string, number> = {};
  const pacingCounts: Record<string, number> = {};
  const homeworkStyleCounts: Record<string, number> = {};
  const allPhrases: string[] = [];
  const focusAreaCounts: Record<string, number> = {};
  let metaphorCount = 0;

  for (const ext of extractions) {
    // Modalities
    if (ext.modalities.primary) {
      modalityCounts[ext.modalities.primary] = (modalityCounts[ext.modalities.primary] || 0) + 2; // Weight primary higher
    }
    for (const mod of ext.modalities.secondary) {
      modalityCounts[mod] = (modalityCounts[mod] || 0) + 1;
    }
    for (const [mod, indicators] of Object.entries(ext.modalities.indicators)) {
      if (!allIndicators[mod]) allIndicators[mod] = [];
      allIndicators[mod].push(...indicators);
    }

    // Interventions
    for (const intervention of ext.interventions) {
      interventionCounts[intervention] = (interventionCounts[intervention] || 0) + 1;
    }

    // Communication
    if (ext.communication.tone) {
      toneCounts[ext.communication.tone] = (toneCounts[ext.communication.tone] || 0) + 1;
    }
    if (ext.communication.pacing) {
      pacingCounts[ext.communication.pacing] = (pacingCounts[ext.communication.pacing] || 0) + 1;
    }
    if (ext.communication.uses_metaphors) {
      metaphorCount++;
    }

    // Homework
    if (ext.homework_style) {
      homeworkStyleCounts[ext.homework_style] = (homeworkStyleCounts[ext.homework_style] || 0) + 1;
    }

    // Phrases and focus areas
    allPhrases.push(...ext.signature_phrases);
    for (const area of ext.focus_areas) {
      focusAreaCounts[area] = (focusAreaCounts[area] || 0) + 1;
    }
  }

  // Helper to get most common
  const getMostCommon = (counts: Record<string, number>): string | null => {
    const entries = Object.entries(counts);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  };

  // Helper to get items appearing in >30% of sessions
  const getCommon = (counts: Record<string, number>, threshold = 0.3): string[] => {
    const minCount = Math.max(1, Math.floor(extractions.length * threshold));
    return Object.entries(counts)
      .filter(([, count]) => count >= minCount)
      .sort((a, b) => b[1] - a[1])
      .map(([item]) => item);
  };

  // Get unique phrases (appearing more than once)
  const phraseCounts: Record<string, number> = {};
  for (const phrase of allPhrases) {
    const normalized = phrase.toLowerCase().trim();
    phraseCounts[normalized] = (phraseCounts[normalized] || 0) + 1;
  }
  const commonPhrases = Object.entries(phraseCounts)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([phrase]) => phrase);

  // Deduplicate indicators
  for (const mod of Object.keys(allIndicators)) {
    allIndicators[mod] = Array.from(new Set(allIndicators[mod])).slice(0, 5);
  }

  // Calculate confidence based on number of sessions
  const confidence = Math.min(1, extractions.length / 10); // Max confidence at 10 sessions

  const primary = getMostCommon(modalityCounts);
  const allModalities = getCommon(modalityCounts, 0.2);

  return {
    primary_modality: primary,
    secondary_modalities: allModalities.filter((m) => m !== primary),
    modality_indicators: allIndicators,
    common_interventions: getCommon(interventionCounts),
    homework_style: getMostCommon(homeworkStyleCounts),
    tone: getMostCommon(toneCounts),
    pacing: getMostCommon(pacingCounts),
    uses_metaphors: metaphorCount > extractions.length / 2,
    signature_phrases: commonPhrases,
    focus_areas: getCommon(focusAreaCounts),
    confidence_score: confidence,
  };
}

