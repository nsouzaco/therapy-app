/**
 * PDF and document text extraction utilities
 * Uses pdf2json for serverless-compatible PDF parsing (no DOM dependencies)
 */

import PDFParser from "pdf2json";

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
 * Safely decode URI-encoded text, falling back to original if malformed
 */
function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    // If decoding fails, try to replace common encoded characters manually
    return str
      .replace(/%20/g, " ")
      .replace(/%2C/g, ",")
      .replace(/%2E/g, ".")
      .replace(/%3A/g, ":")
      .replace(/%3B/g, ";")
      .replace(/%21/g, "!")
      .replace(/%3F/g, "?")
      .replace(/%27/g, "'")
      .replace(/%22/g, '"')
      .replace(/%28/g, "(")
      .replace(/%29/g, ")")
      .replace(/%2D/g, "-")
      .replace(/%2F/g, "/")
      .replace(/%0A/g, "\n")
      .replace(/%0D/g, "\r")
      .replace(/%09/g, "\t")
      .replace(/%[0-9A-Fa-f]{2}/g, " "); // Replace any remaining encoded chars with space
  }
}

/**
 * Extract text content from a PDF file using pdf2json
 * This library works in serverless environments without DOM
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, true); // true = don't combine text items
    
    pdfParser.on("pdfParser_dataError", (errData: Error | { parserError: Error }) => {
      const error = errData instanceof Error ? errData : errData.parserError;
      console.error("PDF parsing error:", error);
      reject(new Error(`Failed to parse PDF: ${error.message}`));
    });
    
    pdfParser.on("pdfParser_dataReady", () => {
      try {
        // Use the built-in getRawTextContent method for cleaner extraction
        const rawText = pdfParser.getRawTextContent();
        
        // Clean up the text
        const cleanedText = rawText
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        
        // Get page count from internal data
        // @ts-expect-error - accessing internal data for page count
        const pageCount = pdfParser.data?.Pages?.length || 1;
        
        resolve({
          text: cleanedText,
          pageCount,
          metadata: undefined, // pdf2json doesn't expose metadata easily with this method
        });
      } catch (error) {
        // Fallback to manual extraction if getRawTextContent fails
        try {
          const pdfData = (pdfParser as unknown as { data: { Pages: Array<{ Texts: Array<{ R: Array<{ T: string }> }> }>; Meta?: Record<string, string> } }).data;
          if (!pdfData?.Pages) {
            reject(new Error("Failed to parse PDF: No pages found"));
            return;
          }
          
          const textParts: string[] = [];
          
          for (const page of pdfData.Pages) {
            for (const textItem of page.Texts || []) {
              for (const run of textItem.R || []) {
                const text = safeDecodeURIComponent(run.T || "");
                if (text.trim()) {
                  textParts.push(text);
                }
              }
            }
            textParts.push("\n\n");
          }
          
          const fullText = textParts.join(" ").replace(/\s+/g, " ").trim();
          
          resolve({
            text: fullText,
            pageCount: pdfData.Pages.length,
            metadata: pdfData.Meta ? {
              title: pdfData.Meta.Title,
              author: pdfData.Meta.Author,
              subject: pdfData.Meta.Subject,
              creator: pdfData.Meta.Creator,
            } : undefined,
          });
        } catch {
          reject(new Error(`Failed to extract text: ${error instanceof Error ? error.message : "Unknown error"}`));
        }
      }
    });
    
    // Parse the buffer
    pdfParser.parseBuffer(buffer);
  });
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

