/**
 * Vector Search Service
 * Provides semantic similarity search using vector embeddings
 */

import { getCurrentDb } from "~/server/db";
import { concept, conceptEmbedding } from "~/server/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getLLMClient } from "./llm/client";
import { logger } from "~/lib/logger";

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
      return JSON.parse(existing[0].embedding) as number[];
    } catch (error) {
      logger.warn({ conceptId, error }, "Failed to parse existing embedding, regenerating");
      // Fall through to regenerate
    }
  }

  // Generate new embedding
  const llmClient = getLLMClient();
  const embedding = await llmClient.embed(text);

  // Store embedding
  await db
    .insert(conceptEmbedding)
    .values({
      conceptId,
      embedding: JSON.stringify(embedding),
      model,
    })
    .onConflictDoUpdate({
      target: conceptEmbedding.conceptId,
      set: {
        embedding: JSON.stringify(embedding),
        updatedAt: new Date(),
      },
    });

  return embedding;
}

/**
 * Find similar concepts using vector search
 * @param queryText The text to search for
 * @param limit Maximum number of results to return
 * @param minSimilarity Minimum cosine similarity threshold (0-1)
 * @param excludeConceptIds Concept IDs to exclude from results
 * @returns Array of concept IDs with similarity scores, sorted by similarity (highest first)
 */
export async function findSimilarConcepts(
  queryText: string,
  limit: number = 20,
  minSimilarity: number = 0.0,
  excludeConceptIds: string[] = [],
): Promise<Array<{ conceptId: string; similarity: number }>> {
  const db = getCurrentDb();
  const llmClient = getLLMClient();

  // Get model name from LLM client (default to OpenAI's model)
  const model = llmClient.getProvider() === "openai" ? "text-embedding-3-small" : "text-embedding-004";

  // Generate embedding for query
  const queryEmbedding = await llmClient.embed(queryText);

  // Get all concept embeddings
  const embeddings = await db
    .select({
      conceptId: conceptEmbedding.conceptId,
      embedding: conceptEmbedding.embedding,
    })
    .from(conceptEmbedding)
    .where(eq(conceptEmbedding.model, model));

  // Calculate similarities
  const similarities: Array<{ conceptId: string; similarity: number }> = [];

  for (const emb of embeddings) {
    // Skip excluded concepts
    if (excludeConceptIds.includes(emb.conceptId)) {
      continue;
    }

    try {
      const embeddingVector = JSON.parse(emb.embedding) as number[];
      const similarity = cosineSimilarity(queryEmbedding, embeddingVector);

      if (similarity >= minSimilarity) {
        similarities.push({
          conceptId: emb.conceptId,
          similarity,
        });
      }
    } catch (error) {
      logger.warn({ conceptId: emb.conceptId, error }, "Failed to parse embedding, skipping");
      continue;
    }
  }

  // Sort by similarity (highest first) and limit
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
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

