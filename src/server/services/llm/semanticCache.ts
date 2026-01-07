/**
 * Semantic Cache Service
 * Caches LLM responses for semantically similar queries
 */

import { eq, and, desc } from "drizzle-orm";
import { llmCache } from "~/server/schema";
import type { DatabaseInstance } from "~/server/db";
import { logger } from "~/lib/logger";
import type { LLMProvider } from "./types";
import { getLLMClient } from "./client";
import { cosineSimilarity } from "~/lib/vector-utils";

const DEFAULT_SIMILARITY_THRESHOLD = 0.95;
const MAX_CACHE_SIZE = 1000;

interface CacheEntry {
  id: string;
  queryEmbedding: number[];
  queryText: string;
  response: Record<string, unknown>;
  provider: LLMProvider;
  model: string;
  createdAt: Date;
  lastUsedAt: Date;
}

/**
 * Get embedding for a query string
 * This function is extracted to allow for easier testing
 */
export async function getQueryEmbedding(query: string): Promise<number[]> {
  const llmClient = getLLMClient();
  return await llmClient.embed(query);
}

/**
 * Convert BLOB to number array
 */
function blobToArray(blob: Buffer): number[] {
  const floatArray = new Float32Array(
    blob.buffer,
    blob.byteOffset,
    blob.byteLength / 4,
  );
  return Array.from(floatArray);
}

/**
 * Convert number array to BLOB
 */
function arrayToBlob(arr: number[]): Buffer {
  const floatArray = new Float32Array(arr);
  return Buffer.from(floatArray.buffer);
}

/**
 * Find a cached response for a semantically similar query
 */
export async function getCachedResponse(
  db: DatabaseInstance,
  query: string,
  provider: LLMProvider,
  model: string,
  similarityThreshold: number = DEFAULT_SIMILARITY_THRESHOLD,
): Promise<Record<string, unknown> | null> {
  try {
    // Get embedding for the query
    const queryEmbedding = await getQueryEmbedding(query);

    // Get all cache entries for this provider/model
    const cacheEntries = await db
      .select()
      .from(llmCache)
      .where(and(eq(llmCache.provider, provider), eq(llmCache.model, model)))
      .orderBy(desc(llmCache.lastUsedAt))
      .limit(100); // Check top 100 most recently used entries

    // Find the most similar entry
    let bestMatch: (typeof cacheEntries)[0] | null = null;
    let bestSimilarity = 0;

    for (const entry of cacheEntries) {
      const entryEmbedding = blobToArray(entry.queryEmbedding);
      const similarity = cosineSimilarity(queryEmbedding, entryEmbedding);

      if (similarity >= similarityThreshold && similarity > bestSimilarity) {
        bestMatch = entry;
        bestSimilarity = similarity;
      }
    }

    if (bestMatch) {
      // Update last used timestamp
      await db
        .update(llmCache)
        .set({ lastUsedAt: new Date() })
        .where(eq(llmCache.id, bestMatch.id));

      logger.debug(
        {
          query: query.slice(0, 100),
          similarity: bestSimilarity,
          cacheId: bestMatch.id,
        },
        "Cache hit for semantically similar query",
      );

      return JSON.parse(bestMatch.response) as Record<string, unknown>;
    }

    return null;
  } catch (error) {
    logger.warn({ error, query: query.slice(0, 100) }, "Error checking semantic cache");
    return null;
  }
}

/**
 * Store a response in the semantic cache
 */
export async function storeCachedResponse(
  db: DatabaseInstance,
  query: string,
  response: Record<string, unknown>,
  provider: LLMProvider,
  model: string,
): Promise<void> {
  try {
    // Get embedding for the query
    const queryEmbedding = await getQueryEmbedding(query);

    // Check cache size and evict oldest entries if needed
    const cacheCount = await db
      .select()
      .from(llmCache)
      .where(and(eq(llmCache.provider, provider), eq(llmCache.model, model)));

    if (cacheCount.length >= MAX_CACHE_SIZE) {
      // Delete oldest entries (keep most recent MAX_CACHE_SIZE - 100)
      const entriesToDelete = cacheCount
        .sort((a, b) => a.lastUsedAt.getTime() - b.lastUsedAt.getTime())
        .slice(0, cacheCount.length - (MAX_CACHE_SIZE - 100));

      for (const entry of entriesToDelete) {
        await db.delete(llmCache).where(eq(llmCache.id, entry.id));
      }

      logger.debug(
        { deletedCount: entriesToDelete.length },
        "Evicted old cache entries",
      );
    }

    // Store new cache entry
    await db.insert(llmCache).values({
      queryEmbedding: arrayToBlob(queryEmbedding),
      queryText: query,
      response: JSON.stringify(response),
      provider,
      model,
      lastUsedAt: new Date(),
    });

    logger.debug(
      { query: query.slice(0, 100), provider, model },
      "Stored response in semantic cache",
    );
  } catch (error) {
    logger.warn({ error, query: query.slice(0, 100) }, "Error storing in semantic cache");
  }
}

/**
 * Clear cache entries for a specific provider/model
 */
export async function clearCache(
  db: DatabaseInstance,
  provider?: LLMProvider,
  model?: string,
): Promise<number> {
  if (provider && model) {
    const result = await db
      .delete(llmCache)
      .where(and(eq(llmCache.provider, provider), eq(llmCache.model, model)));
    return result.changes || 0;
  } else if (provider) {
    const result = await db
      .delete(llmCache)
      .where(eq(llmCache.provider, provider));
    return result.changes || 0;
  } else {
    const result = await db.delete(llmCache);
    return result.changes || 0;
  }
}

