/**
 * Text chunking utilities for RAG
 * Splits documents into overlapping chunks suitable for embedding
 */

export interface TextChunk {
  index: number;
  content: string;
  startChar: number;
  endChar: number;
}

/**
 * Split text into overlapping chunks
 * 
 * @param text - The text to chunk
 * @param chunkSize - Target size of each chunk in characters (default 1500 ≈ 375 tokens)
 * @param overlap - Number of characters to overlap between chunks (default 200)
 * @returns Array of text chunks with metadata
 */
export function chunkText(
  text: string,
  chunkSize: number = 1500,
  overlap: number = 200
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Clean the text
  const cleanedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleanedText.length <= chunkSize) {
    return [{
      index: 0,
      content: cleanedText,
      startChar: 0,
      endChar: cleanedText.length,
    }];
  }

  const chunks: TextChunk[] = [];
  let startChar = 0;
  let chunkIndex = 0;

  while (startChar < cleanedText.length) {
    let endChar = startChar + chunkSize;

    // If not at the end, try to break at a natural boundary
    if (endChar < cleanedText.length) {
      // Look for paragraph break first
      const paragraphBreak = cleanedText.lastIndexOf("\n\n", endChar);
      if (paragraphBreak > startChar + chunkSize * 0.5) {
        endChar = paragraphBreak;
      } else {
        // Look for sentence break
        const sentenceBreak = findSentenceBreak(cleanedText, startChar, endChar);
        if (sentenceBreak > startChar + chunkSize * 0.5) {
          endChar = sentenceBreak;
        } else {
          // Look for word break
          const wordBreak = cleanedText.lastIndexOf(" ", endChar);
          if (wordBreak > startChar + chunkSize * 0.5) {
            endChar = wordBreak;
          }
        }
      }
    } else {
      endChar = cleanedText.length;
    }

    const content = cleanedText.slice(startChar, endChar).trim();
    
    if (content.length > 0) {
      chunks.push({
        index: chunkIndex,
        content,
        startChar,
        endChar,
      });
      chunkIndex++;
    }

    // Move start position, accounting for overlap
    startChar = endChar - overlap;
    
    // Ensure we're making progress
    if (startChar <= chunks[chunks.length - 1]?.startChar) {
      startChar = endChar;
    }
  }

  return chunks;
}

/**
 * Find a sentence break (period, question mark, exclamation) near the target position
 */
function findSentenceBreak(text: string, start: number, target: number): number {
  const searchStart = Math.max(start + Math.floor((target - start) * 0.5), start);
  const searchText = text.slice(searchStart, target + 50);
  
  // Find sentence endings
  const matches: RegExpExecArray[] = [];
  const regex = /[.!?]+\s+/g;
  let match;
  while ((match = regex.exec(searchText)) !== null) {
    matches.push(match);
  }
  
  if (matches.length === 0) {
    return -1;
  }
  
  // Get the last match before the target
  let lastMatch = matches[0];
  for (const match of matches) {
    const matchPos = searchStart + (match.index ?? 0) + match[0].length;
    if (matchPos <= target) {
      lastMatch = match;
    }
  }
  
  return searchStart + (lastMatch.index ?? 0) + lastMatch[0].length;
}

/**
 * Chunk text with semantic awareness
 * Tries to keep related content together (headers with following content, lists, etc.)
 */
export function chunkTextSemantic(
  text: string,
  maxChunkSize: number = 2000
): TextChunk[] {
  // Split by major sections (double newlines or headers)
  const sections = text.split(/\n{2,}|\n(?=#{1,3}\s)/);
  
  const chunks: TextChunk[] = [];
  let currentChunk = "";
  let currentStart = 0;
  let chunkIndex = 0;
  let position = 0;

  for (const section of sections) {
    const trimmedSection = section.trim();
    if (!trimmedSection) {
      position += section.length + 2; // +2 for the newlines
      continue;
    }

    // If adding this section would exceed max size, save current chunk and start new one
    if (currentChunk.length + trimmedSection.length + 2 > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        index: chunkIndex,
        content: currentChunk.trim(),
        startChar: currentStart,
        endChar: position,
      });
      chunkIndex++;
      currentChunk = "";
      currentStart = position;
    }

    // If a single section is too long, use regular chunking for it
    if (trimmedSection.length > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push({
          index: chunkIndex,
          content: currentChunk.trim(),
          startChar: currentStart,
          endChar: position,
        });
        chunkIndex++;
        currentChunk = "";
      }
      
      const subChunks = chunkText(trimmedSection, maxChunkSize - 200, 150);
      for (const subChunk of subChunks) {
        chunks.push({
          index: chunkIndex,
          content: subChunk.content,
          startChar: position + subChunk.startChar,
          endChar: position + subChunk.endChar,
        });
        chunkIndex++;
      }
      currentStart = position + trimmedSection.length;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmedSection;
    }

    position += section.length + 2;
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      index: chunkIndex,
      content: currentChunk.trim(),
      startChar: currentStart,
      endChar: position,
    });
  }

  return chunks;
}

/**
 * Estimate token count from text (rough approximation)
 * OpenAI uses ~4 characters per token for English text
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

