/**
 * Vector Search Service
 * Provides semantic similarity search using vector embeddings
 */

import { getCurrentDb } from "~/server/db";
import { concept, conceptEmbedding } from "~/server/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getLLMClient } from "./llm/client";
import { logger } from "~/lib/logger";
import { getVectorIndex } from "./vectorIndex";

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Get or create embedding for a concept
 */
export async function getOrCreateEmbedding(
  conceptId: string,
  text: string,
  model: string = "text-embedding-3-small",
): Promise<number[]> {
  const db = getCurrentDb();

  // Check if embedding already exists
  const existing = await db
    .select()
    .from(conceptEmbedding)
    .where(and(eq(conceptEmbedding.conceptId, conceptId), eq(conceptEmbedding.model, model)))
    .limit(1);

  if (existing.length > 0) {
    try {
      const embeddingData = existing[0].embedding;
      
      // Handle both binary (Buffer) and legacy JSON text formats
      if (Buffer.isBuffer(embeddingData)) {
        // Binary format: Convert blob to Float32Array, then to number[]
        const floatArray = new Float32Array(embeddingData.buffer, embeddingData.byteOffset, embeddingData.byteLength / 4);
        return Array.from(floatArray);
      } else if (typeof embeddingData === "string") {
        // Legacy JSON format: Parse and convert to binary, then return
        const parsed = JSON.parse(embeddingData) as number[];
        // Convert to binary and update the database
        const floatArray = new Float32Array(parsed);
        const buffer = Buffer.from(floatArray.buffer);
        await db
          .update(conceptEmbedding)
          .set({ embedding: buffer, updatedAt: new Date() })
          .where(eq(conceptEmbedding.conceptId, conceptId));
        return parsed;
      } else {
        throw new Error("Unknown embedding format");
      }
    } catch (error) {
      logger.warn({ conceptId, error }, "Failed to parse existing embedding, regenerating");
      // Fall through to regenerate
    }
  }

  // Generate new embedding
  const llmClient = getLLMClient();
  const embedding = await llmClient.embed(text);

  // Convert number[] to binary Buffer (Float32Array)
  const floatArray = new Float32Array(embedding);
  const buffer = Buffer.from(floatArray.buffer);

  // Store embedding as binary
  await db
    .insert(conceptEmbedding)
    .values({
      conceptId,
      embedding: buffer,
      model,
    })
    .onConflictDoUpdate({
      target: conceptEmbedding.conceptId,
      set: {
        embedding: buffer,
        updatedAt: new Date(),
      },
    });

  // Update in-memory index
  const index = getVectorIndex();
  index.addEmbedding(conceptId, embedding);

  return embedding;
}

/**
 * Find similar concepts using vector search
 * Uses in-memory index for fast search instead of linear scan
 * @param queryText The text to search for
 * @param limit Maximum number of results to return
 * @param minSimilarity Minimum cosine similarity threshold (0-1)
 * @param excludeConceptIds Concept IDs to exclude from results
 * @param queryEmbedding Optional pre-computed query embedding (for performance)
 * @returns Array of concept IDs with similarity scores, sorted by similarity (highest first)
 */
export async function findSimilarConcepts(
  queryText: string,
  limit: number = 20,
  minSimilarity: number = 0.0,
  excludeConceptIds: string[] = [],
  queryEmbedding?: number[],
): Promise<Array<{ conceptId: string; similarity: number }>> {
  const llmClient = getLLMClient();

  // Generate embedding for query if not provided
  const embedding = queryEmbedding ?? await llmClient.embed(queryText);

  // Use in-memory index for fast search
  const index = getVectorIndex();
  return index.search(embedding, limit, minSimilarity, excludeConceptIds);
}

/**
 * Batch generate embeddings for concepts that don't have them
 * @param batchSize Number of concepts to process at once
 */
export async function generateMissingEmbeddings(batchSize: number = 10): Promise<void> {
  const db = getCurrentDb();
  const llmClient = getLLMClient();
  const model = llmClient.getProvider() === "openai" ? "text-embedding-3-small" : "text-embedding-004";

  // Find concepts without embeddings
  const conceptsWithoutEmbeddings = await db
    .select({
      id: concept.id,
      title: concept.title,
      description: concept.description,
      content: concept.content,
    })
    .from(concept)
    .leftJoin(conceptEmbedding, eq(concept.id, conceptEmbedding.conceptId))
    .where(isNull(conceptEmbedding.id))
    .limit(batchSize);

  logger.info({ count: conceptsWithoutEmbeddings.length }, "Generating embeddings for concepts");

  for (const conceptData of conceptsWithoutEmbeddings) {
    try {
      // Create text representation for embedding (title + description + content)
      const textToEmbed = `${conceptData.title}\n${conceptData.description || ""}\n${conceptData.content}`;

      await getOrCreateEmbedding(conceptData.id, textToEmbed, model);
    } catch (error) {
      logger.error({ conceptId: conceptData.id, error }, "Failed to generate embedding for concept");
    }
  }
}

