import OpenAI from "openai";

// Singleton OpenAI client
let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    
    client = new OpenAI({ apiKey });
  }
  
  return client;
}

// Wrapper for API calls with error handling
export async function callOpenAI<T>(
  operation: (client: OpenAI) => Promise<T>
): Promise<T> {
  const openai = getOpenAIClient();
  
  try {
    return await operation(openai);
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error(`OpenAI API Error: ${error.status} - ${error.message}`);
      throw new Error(`AI service error: ${error.message}`);
    }
    throw error;
  }
}

