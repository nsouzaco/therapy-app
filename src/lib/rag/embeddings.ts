import { getOpenAIClient } from "@/lib/ai/openai-client";

/**
 * Generate embedding for a text using OpenAI's text-embedding-ada-002 model
 * Returns a 1536-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  
  // Clean and truncate text (ada-002 has 8191 token limit)
  const cleanedText = text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30000); // Rough character limit to stay under token limit
  
  if (!cleanedText) {
    throw new Error("Cannot generate embedding for empty text");
  }
  
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: cleanedText,
  });
  
  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling generateEmbedding multiple times
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }
  
  const openai = getOpenAIClient();
  
  // Clean texts
  const cleanedTexts = texts.map(text => 
    text.replace(/\s+/g, " ").trim().slice(0, 30000)
  ).filter(t => t.length > 0);
  
  if (cleanedTexts.length === 0) {
    return [];
  }
  
  // OpenAI batch limit is 2048 inputs
  const batchSize = 100;
  const embeddings: number[][] = [];
  
  for (let i = 0; i < cleanedTexts.length; i += batchSize) {
    const batch = cleanedTexts.slice(i, i + batchSize);
    
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: batch,
    });
    
    embeddings.push(...response.data.map(d => d.embedding));
  }
  
  return embeddings;
}

