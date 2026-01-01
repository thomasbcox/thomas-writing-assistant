/**
 * Embedding Orchestrator Service
 * Manages background generation of missing embeddings with progress tracking
 */

import { getCurrentDb } from "~/server/db";
import { concept, conceptEmbedding } from "~/server/schema";
import { isNull, eq } from "drizzle-orm";
import { generateMissingEmbeddings } from "./vectorSearch";
import { getVectorIndex } from "./vectorIndex";
import { logger } from "~/lib/logger";

interface EmbeddingStatus {
  totalConcepts: number;
  conceptsWithEmbeddings: number;
  conceptsWithoutEmbeddings: number;
  isIndexing: boolean;
  lastIndexedAt: Date | null;
}

/**
 * Get the current status of embedding generation
 */
export async function getEmbeddingStatus(): Promise<EmbeddingStatus> {
  const db = getCurrentDb();

  // Count total concepts
  const allConcepts = await db.select({ id: concept.id }).from(concept);
  const totalConcepts = allConcepts.length;

  // Count concepts with embeddings
  const conceptsWithEmbeddings = await db
    .select({ conceptId: conceptEmbedding.conceptId })
    .from(conceptEmbedding);

  const conceptsWithoutEmbeddings = totalConcepts - conceptsWithEmbeddings.length;

  return {
    totalConcepts,
    conceptsWithEmbeddings: conceptsWithEmbeddings.length,
    conceptsWithoutEmbeddings,
    isIndexing: false, // Will be set by the indexing process
    lastIndexedAt: null, // Could be stored in a config table if needed
  };
}

/**
 * Check for missing embeddings and generate them in the background
 * This should be called on app startup or when new concepts are added
 * 
 * @param batchSize Number of concepts to process per batch
 * @param onProgress Optional callback to report progress
 */
export async function checkAndGenerateMissing(
  batchSize: number = 10,
  onProgress?: (status: EmbeddingStatus) => void,
): Promise<void> {
  const status = await getEmbeddingStatus();

  if (status.conceptsWithoutEmbeddings === 0) {
    logger.info("All concepts have embeddings, no indexing needed");
    if (onProgress) {
      onProgress(status);
    }
    return;
  }

  logger.info(
    {
      totalConcepts: status.totalConcepts,
      conceptsWithoutEmbeddings: status.conceptsWithoutEmbeddings,
    },
    "Starting background embedding generation",
  );

  let processed = 0;
  const totalToProcess = status.conceptsWithoutEmbeddings;

  // Process in batches until all embeddings are generated
  while (true) {
    const beforeStatus = await getEmbeddingStatus();
    
    if (beforeStatus.conceptsWithoutEmbeddings === 0) {
      logger.info({ processed }, "All embeddings generated");
      break;
    }

    try {
      await generateMissingEmbeddings(batchSize);
      processed += batchSize;

      // Update vector index after generating embeddings
      const index = getVectorIndex();
      await index.initialize();

      const currentStatus = await getEmbeddingStatus();
      
      if (onProgress) {
        onProgress({
          ...currentStatus,
          isIndexing: currentStatus.conceptsWithoutEmbeddings > 0,
        });
      }

      logger.debug(
        {
          processed,
          remaining: currentStatus.conceptsWithoutEmbeddings,
          progress: `${Math.round((processed / totalToProcess) * 100)}%`,
        },
        "Embedding generation progress",
      );

      // If no progress was made, break to avoid infinite loop
      if (currentStatus.conceptsWithoutEmbeddings >= beforeStatus.conceptsWithoutEmbeddings) {
        logger.warn("No progress made in embedding generation, stopping");
        break;
      }
    } catch (error) {
      logger.error({ error, processed }, "Error during embedding generation");
      throw error;
    }
  }

  logger.info({ totalProcessed: processed }, "Background embedding generation completed");
}

/**
 * Generate embeddings for a specific concept
 * Useful for immediate embedding after concept creation
 */
export async function generateEmbeddingForConcept(conceptId: string): Promise<void> {
  const db = getCurrentDb();
  const conceptData = await db
    .select()
    .from(concept)
    .where(eq(concept.id, conceptId))
    .limit(1);

  if (conceptData.length === 0) {
    throw new Error(`Concept ${conceptId} not found`);
  }

  const textToEmbed = `${conceptData[0].title}\n${conceptData[0].description || ""}\n${conceptData[0].content}`;
  
  const { getOrCreateEmbedding } = await import("./vectorSearch");
  const llmClient = (await import("./llm/client")).getLLMClient();
  const model = llmClient.getProvider() === "openai" ? "text-embedding-3-small" : "text-embedding-004";
  
  await getOrCreateEmbedding(conceptId, textToEmbed, model);

  // Update vector index
  const index = getVectorIndex();
  const embedding = await getOrCreateEmbedding(conceptId, textToEmbed, model);
  index.addEmbedding(conceptId, embedding);
}

