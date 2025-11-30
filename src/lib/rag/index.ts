// RAG (Retrieval-Augmented Generation) utilities
// For therapist knowledge base and document management

export { generateEmbedding, generateEmbeddings } from "./embeddings";
export { chunkText, chunkTextSemantic, estimateTokenCount, type TextChunk } from "./chunking";
export { parsePDF, parseDocument, cleanExtractedText, validateFile, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from "./pdf-parser";
export { retrieveRelevantChunks, formatChunksForPrompt, buildRAGContext, type ChunkResult, type SourceType, type RetrievalOptions } from "./retrieval";

