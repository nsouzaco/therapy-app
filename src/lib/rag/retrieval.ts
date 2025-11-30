import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "./embeddings";

export type SourceType = "research" | "protocol" | "technique" | "worksheet" | "preference" | "other";

export interface ChunkResult {
  id: string;
  documentId: string;
  content: string;
  similarity: number;
  documentTitle: string;
  sourceType: SourceType;
}

export interface RetrievalOptions {
  limit?: number;
  sourceTypes?: SourceType[];
  minSimilarity?: number;
}

/**
 * Retrieve document chunks relevant to a query
 * Uses vector similarity search via pgvector
 */
export async function retrieveRelevantChunks(
  therapistId: string,
  query: string,
  options: RetrievalOptions = {}
): Promise<ChunkResult[]> {
  const { limit = 5, sourceTypes, minSimilarity = 0.7 } = options;
  
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    const supabase = await createClient();
    
    // Call the similarity search function
    const { data, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_therapist_id: therapistId,
      match_count: limit,
      match_source_types: sourceTypes || null,
    });
    
    if (error) {
      console.error("Retrieval error:", error);
      return [];
    }
    
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    // Filter by minimum similarity and map to result type
    const results: ChunkResult[] = data
      .filter((row: { similarity: number }) => row.similarity >= minSimilarity)
      .map((row: {
        id: string;
        document_id: string;
        content: string;
        similarity: number;
        document_title: string;
        source_type: string;
      }) => ({
        id: row.id,
        documentId: row.document_id,
        content: row.content,
        similarity: row.similarity,
        documentTitle: row.document_title,
        sourceType: row.source_type as SourceType,
      }));
    
    return results;
  } catch (error) {
    console.error("Failed to retrieve chunks:", error);
    return [];
  }
}

/**
 * Format retrieved chunks for inclusion in a prompt
 */
export function formatChunksForPrompt(chunks: ChunkResult[]): string {
  if (chunks.length === 0) {
    return "";
  }
  
  return chunks
    .map((chunk, index) => {
      const sourceLabel = getSourceLabel(chunk.sourceType);
      return `[${index + 1}] ${sourceLabel}: "${chunk.documentTitle}"\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Get human-readable label for source type
 */
function getSourceLabel(type: SourceType): string {
  const labels: Record<SourceType, string> = {
    research: "Research",
    protocol: "Protocol",
    technique: "Technique",
    worksheet: "Worksheet",
    preference: "Preference",
    other: "Reference",
  };
  return labels[type] || "Reference";
}

/**
 * Build RAG context for plan generation
 * Retrieves relevant documents and formats them for the prompt
 */
export async function buildRAGContext(
  therapistId: string,
  transcript: string,
  options: {
    forPlanGeneration?: boolean;
    forStyleLearning?: boolean;
  } = {}
): Promise<string> {
  const { forPlanGeneration = true, forStyleLearning = false } = options;
  
  const contextParts: string[] = [];
  
  if (forPlanGeneration) {
    // Retrieve research, protocols, and techniques for plan content
    const planChunks = await retrieveRelevantChunks(therapistId, transcript, {
      limit: 5,
      sourceTypes: ["research", "protocol", "technique", "worksheet"],
      minSimilarity: 0.72,
    });
    
    if (planChunks.length > 0) {
      contextParts.push(
        "## THERAPIST'S KNOWLEDGE BASE (cite when relevant):\n" +
        formatChunksForPrompt(planChunks)
      );
    }
  }
  
  if (forStyleLearning) {
    // Retrieve preferences for style influence
    const styleChunks = await retrieveRelevantChunks(
      therapistId,
      "therapeutic approach preferences communication style techniques",
      {
        limit: 3,
        sourceTypes: ["preference", "technique"],
        minSimilarity: 0.7,
      }
    );
    
    if (styleChunks.length > 0) {
      contextParts.push(
        "## THERAPIST'S STATED PREFERENCES:\n" +
        formatChunksForPrompt(styleChunks)
      );
    }
  }
  
  return contextParts.join("\n\n");
}

