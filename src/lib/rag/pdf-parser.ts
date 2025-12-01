/**
 * PDF and document text extraction utilities
 * Uses unpdf for serverless-compatible PDF parsing
 */

import { extractText, getDocumentProxy } from "unpdf";

export interface ParsedDocument {
  text: string;
  pageCount?: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
}

/**
 * Extract text content from a PDF file
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // Convert Buffer to Uint8Array for unpdf
    const uint8Array = new Uint8Array(buffer);
    
    // Get document proxy for metadata
    const pdf = await getDocumentProxy(uint8Array);
    
    // Extract text from all pages
    const { text } = await extractText(uint8Array, { mergePages: true });
    
    // Get metadata
    const metadata = await pdf.getMetadata().catch(() => null);
    const info = metadata?.info as Record<string, string> | undefined;
    
    return {
      text: text as string,
      pageCount: pdf.numPages,
      metadata: info ? {
        title: info.Title,
        author: info.Author,
        subject: info.Subject,
        creator: info.Creator,
      } : undefined,
    };
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract text from various file types
 */
export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
  filename?: string
): Promise<ParsedDocument> {
  // Handle PDF
  if (mimeType === "application/pdf" || filename?.toLowerCase().endsWith(".pdf")) {
    return parsePDF(buffer);
  }
  
  // Handle plain text
  if (
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    filename?.match(/\.(txt|md|markdown)$/i)
  ) {
    return {
      text: buffer.toString("utf-8"),
    };
  }
  
  // Handle rich text (basic extraction - strips formatting)
  if (mimeType === "application/rtf" || filename?.toLowerCase().endsWith(".rtf")) {
    const rtfText = buffer.toString("utf-8");
    // Very basic RTF stripping - removes control words
    const plainText = rtfText
      .replace(/\\[a-z]+[0-9]*\s?/gi, " ")
      .replace(/[{}]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return { text: plainText };
  }
  
  // For other formats, try to read as text
  // In the future, could add support for DOCX using mammoth
  try {
    const text = buffer.toString("utf-8");
    // Check if it looks like valid text
    if (text && !text.includes("\x00")) {
      return { text };
    }
  } catch {
    // Not valid text
  }
  
  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Clean extracted text for better embedding quality
 */
export function cleanExtractedText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Remove page numbers and headers/footers patterns
    .replace(/^\d+\s*$/gm, "")
    .replace(/^Page \d+ of \d+$/gim, "")
    // Remove excessive punctuation
    .replace(/\.{3,}/g, "...")
    .replace(/-{3,}/g, "---")
    // Remove null characters and control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Trim
    .trim();
}

/**
 * Supported file types for upload
 */
export const SUPPORTED_FILE_TYPES = {
  "application/pdf": { extension: ".pdf", name: "PDF" },
  "text/plain": { extension: ".txt", name: "Text" },
  "text/markdown": { extension: ".md", name: "Markdown" },
} as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate file for upload
 */
export function validateFile(
  file: File
): { valid: true } | { valid: false; error: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File too large (${sizeMB}MB). Maximum size is 10MB.`,
    };
  }
  
  // Check file type
  const isSupported =
    file.type in SUPPORTED_FILE_TYPES ||
    file.name.match(/\.(pdf|txt|md|markdown)$/i);
  
  if (!isSupported) {
    return {
      valid: false,
      error: "Unsupported file type. Please upload PDF, TXT, or Markdown files.",
    };
  }
  
  return { valid: true };
}

