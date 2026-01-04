/**
 * Embedding Orchestrator Service
 * Manages background generation of missing embeddings with progress tracking
 */

import { getCurrentDb } from "~/server/db";
import type { DatabaseInstance } from "~/server/db";
import { concept, conceptEmbedding } from "~/server/schema";
import { isNull, eq, and } from "drizzle-orm";
import { getVectorIndex } from "./vectorIndex";
import { logger } from "~/lib/logger";
import { getLLMClient } from "./llm/client";

/**
 * Retry helper function with exponential backoff
 * Attempts to execute a function, retrying on failure with increasing delays
 * 
 * @param fn Function to retry
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @param baseDelay Base delay in milliseconds for exponential backoff (default: 1000)
 * @returns Result of the function, or null if all retries failed
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) {
        logger.warn({ attempt: attempt + 1, maxRetries, error }, "Max retries reached, skipping batch");
        return null; // Skip this batch
      }
      const delay = baseDelay * Math.pow(2, attempt);
      logger.debug({ attempt: attempt + 1, delay, error }, "Retrying after delay");
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return null;
}

interface EmbeddingStatus {
  totalConcepts: number;
  conceptsWithEmbeddings: number;
  conceptsWithoutEmbeddings: number;
  isIndexing: boolean;
  lastIndexedAt: Date | null;
  successfulBatches?: number;
  failedBatches?: number;
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
  let successfulBatches = 0;
  let failedBatches = 0;
  const totalToProcess = status.conceptsWithoutEmbeddings;
  const maxIterations = Math.ceil(totalToProcess / batchSize) + 10; // Safety limit: expected iterations + buffer
  let iterationCount = 0;

  // Process in batches until all embeddings are generated
  while (iterationCount < maxIterations) {
    iterationCount++;
    const beforeStatus = await getEmbeddingStatus();
    
    if (beforeStatus.conceptsWithoutEmbeddings === 0) {
      logger.info({ processed, successfulBatches, failedBatches }, "All embeddings generated");
      break;
    }

    // Use retry logic with exponential backoff
    const result = await retryWithBackoff(async () => {
      await generateMissingEmbeddingsWithContext(getCurrentDb(), batchSize);
      return true;
    });

    if (result === null) {
      // Retry failed, skip this batch and continue
      failedBatches++;
      logger.warn(
        {
          failedBatches,
          successfulBatches,
          remaining: beforeStatus.conceptsWithoutEmbeddings,
        },
        "Batch failed after retries, skipping and continuing",
      );

      // Update progress even on failure
      if (onProgress) {
        const currentStatus = await getEmbeddingStatus();
        onProgress({
          ...currentStatus,
          isIndexing: currentStatus.conceptsWithoutEmbeddings > 0,
        });
      }

      // Check if we should continue: only stop if ALL batches have failed
      // and no progress has been made at all
      const currentStatus = await getEmbeddingStatus();
      if (
        currentStatus.conceptsWithoutEmbeddings >= beforeStatus.conceptsWithoutEmbeddings &&
        successfulBatches === 0
      ) {
        logger.error(
          {
            failedBatches,
            successfulBatches,
            remaining: currentStatus.conceptsWithoutEmbeddings,
          },
          "All batches failed, stopping orchestration",
        );
        break;
      }
      
      // Safety check: if we've exceeded max iterations, stop
      if (iterationCount >= maxIterations) {
        logger.warn(
          {
            iterationCount,
            maxIterations,
            remaining: currentStatus.conceptsWithoutEmbeddings,
          },
          "Reached maximum iteration limit, stopping to prevent infinite loop",
        );
        break;
      }

      // Continue to next batch even if this one failed
      continue;
    }

    // Batch succeeded
    successfulBatches++;
    processed += batchSize;

    // Update vector index after generating embeddings
    const index = getVectorIndex();
    await index.initialize();

    const currentStatus = await getEmbeddingStatus();
    
    if (onProgress) {
      onProgress({
        ...currentStatus,
        isIndexing: currentStatus.conceptsWithoutEmbeddings > 0,
        successfulBatches,
        failedBatches,
      });
    }

    logger.debug(
      {
        processed,
        remaining: currentStatus.conceptsWithoutEmbeddings,
        progress: `${Math.round((processed / totalToProcess) * 100)}%`,
        successfulBatches,
        failedBatches,
      },
      "Embedding generation progress",
    );

    // If no progress was made, but we had some successes, continue
    // Only stop if we made no progress AND all batches failed
    if (
      currentStatus.conceptsWithoutEmbeddings >= beforeStatus.conceptsWithoutEmbeddings &&
      successfulBatches === 0
    ) {
      logger.warn(
        {
          successfulBatches,
          failedBatches,
          remaining: currentStatus.conceptsWithoutEmbeddings,
        },
        "No progress made and all batches failed, stopping",
      );
      break;
    }
  }

  logger.info(
    {
      totalProcessed: processed,
      successfulBatches,
      failedBatches,
    },
    "Background embedding generation completed",
  );
}

/**
 * Get or create embedding for a concept with context
 * This is the primary function for embedding management
 */
export async function getOrCreateEmbeddingWithContext(
  conceptId: string,
  text: string,
  db: DatabaseInstance,
  model: string = "text-embedding-3-small",
): Promise<number[]> {
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
  let embedding: number[];
  try {
    embedding = await llmClient.embed(text);
  } catch (error) {
    // If embedding generation fails, don't store anything
    logger.error({ conceptId, error }, "Failed to generate embedding");
    throw error;
  }

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
 * Legacy wrapper for getOrCreateEmbeddingWithContext
 * @deprecated Use getOrCreateEmbeddingWithContext instead
 */
export async function getOrCreateEmbedding(
  conceptId: string,
  text: string,
  model: string = "text-embedding-3-small",
): Promise<number[]> {
  const db = getCurrentDb();
  return getOrCreateEmbeddingWithContext(conceptId, text, db, model);
}

/**
 * Batch generate embeddings for concepts that don't have them
 * @param db Database instance
 * @param batchSize Number of concepts to process at once
 */
export async function generateMissingEmbeddingsWithContext(
  db: DatabaseInstance,
  batchSize: number = 10,
): Promise<void> {
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

      await getOrCreateEmbeddingWithContext(conceptData.id, textToEmbed, db, model);
    } catch (error) {
      logger.error({ conceptId: conceptData.id, error }, "Failed to generate embedding for concept");
    }
  }
}

/**
 * Generate missing embeddings (backward compatible wrapper)
 * @deprecated Use generateMissingEmbeddingsWithContext instead
 */
export async function generateMissingEmbeddings(
  batchSize: number = 10,
): Promise<void> {
  return generateMissingEmbeddingsWithContext(getCurrentDb(), batchSize);
}

/**
 * Generate embeddings for a specific concept
 * Useful for immediate embedding after concept creation
 */
export async function generateEmbeddingForConcept(conceptId: string, db?: DatabaseInstance): Promise<void> {
  const dbInstance = db ?? getCurrentDb();
  const conceptData = await dbInstance
    .select()
    .from(concept)
    .where(eq(concept.id, conceptId))
    .limit(1);

  if (conceptData.length === 0) {
    throw new Error(`Concept ${conceptId} not found`);
  }

  const textToEmbed = `${conceptData[0].title}\n${conceptData[0].description || ""}\n${conceptData[0].content}`;
  
  const llmClient = getLLMClient();
  const model = llmClient.getProvider() === "openai" ? "text-embedding-3-small" : "text-embedding-004";
  
  // Generate and store embedding, which also updates the VectorIndex
  await getOrCreateEmbeddingWithContext(conceptId, textToEmbed, dbInstance, model);
}

