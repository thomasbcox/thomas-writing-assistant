/**
 * Vector Index Service
 * Provides approximate nearest neighbor (ANN) search using a simple in-memory index
 * 
 * This implementation uses a sorted array with binary search for simplicity.
 * For production use with large datasets (>10k vectors), consider using HNSWlib or SQLite-VSS.
 */

import { getCurrentDb } from "~/server/db";
import type { DatabaseInstance } from "~/server/db";
import { conceptEmbedding } from "~/server/schema";
import { logger } from "~/lib/logger";

interface IndexEntry {
  conceptId: string;
  embedding: number[];
  norm: number; // Pre-computed L2 norm for faster cosine similarity
}

/**
 * In-memory vector index for fast similarity search
 */
class VectorIndex {
  private entries: IndexEntry[] = [];
  private isDirty = false;
  private indexPath: string | null = null;

  /**
   * Initialize the index from the database
   */
  async initialize(db?: DatabaseInstance): Promise<void> {
    const dbInstance = db ?? getCurrentDb();
    const embeddings = await dbInstance
            .select({
              conceptId: conceptEmbedding.conceptId,
              embedding: conceptEmbedding.embedding,
            })
            .from(conceptEmbedding);

    this.entries = [];

    for (const emb of embeddings) {
      try {
        // Handle both binary (Buffer) and legacy JSON text formats
        let embeddingVector: number[];
        const embeddingData = emb.embedding;
        
        if (Buffer.isBuffer(embeddingData)) {
          // Binary format: Convert blob to Float32Array, then to number[]
          const floatArray = new Float32Array(embeddingData.buffer, embeddingData.byteOffset, embeddingData.byteLength / 4);
          embeddingVector = Array.from(floatArray);
        } else if (typeof embeddingData === "string") {
          // Legacy JSON format: Parse JSON
          embeddingVector = JSON.parse(embeddingData) as number[];
        } else {
          logger.warn({ conceptId: emb.conceptId, embeddingDataType: typeof embeddingData }, "Unknown embedding format, skipping");
          continue;
        }

        // Pre-compute L2 norm for faster cosine similarity
        const norm = Math.sqrt(embeddingVector.reduce((sum, val) => sum + val * val, 0));

        this.entries.push({
          conceptId: String(emb.conceptId),
          embedding: embeddingVector,
          norm,
        });
      } catch (error) {
        logger.warn({ conceptId: emb.conceptId, error }, "Failed to load embedding into index, skipping");
      }
    }

    logger.info({ count: this.entries.length }, "Vector index initialized");
  }

  /**
   * Add or update an embedding in the index
   */
  addEmbedding(conceptId: string, embedding: number[]): void {
    // Remove existing entry if present
    this.entries = this.entries.filter((e) => e.conceptId !== conceptId);

    // Pre-compute L2 norm
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));

    this.entries.push({
      conceptId,
      embedding,
      norm,
    });

    this.isDirty = true;
  }

  /**
   * Remove an embedding from the index
   */
  removeEmbedding(conceptId: string): void {
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => e.conceptId !== conceptId);
    
    if (this.entries.length < before) {
      this.isDirty = true;
    }
  }

  /**
   * Search for similar vectors using cosine similarity
   * @param queryEmbedding The query vector
   * @param limit Maximum number of results
   * @param minSimilarity Minimum similarity threshold (0-1)
   * @param excludeConceptIds Concept IDs to exclude from results
   * @returns Array of concept IDs with similarity scores, sorted by similarity (highest first)
   */
  search(
    queryEmbedding: number[],
    limit: number = 20,
    minSimilarity: number = 0.0,
    excludeConceptIds: string[] = [],
  ): Array<{ conceptId: string; similarity: number }> {
    // Pre-compute query norm
    const queryNorm = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));

    const similarities: Array<{ conceptId: string; similarity: number }> = [];

    for (const entry of this.entries) {
      // Skip excluded concepts
      if (excludeConceptIds.includes(entry.conceptId)) {
        continue;
      }

      // Fast cosine similarity using pre-computed norms
      let dotProduct = 0;
      for (let i = 0; i < queryEmbedding.length && i < entry.embedding.length; i++) {
        dotProduct += queryEmbedding[i] * entry.embedding[i];
      }

      const denominator = queryNorm * entry.norm;
      if (denominator === 0) {
        continue;
      }

      const similarity = dotProduct / denominator;

      if (similarity >= minSimilarity) {
        similarities.push({
          conceptId: entry.conceptId,
          similarity,
        });
      }
    }

    // Sort by similarity (highest first) and limit
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Get the number of entries in the index
   */
  size(): number {
    return this.entries.length;
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.entries = [];
    this.isDirty = true;
  }
}

// Singleton instance
let vectorIndex: VectorIndex | null = null;

/**
 * Get or create the vector index instance
 */
export function getVectorIndex(): VectorIndex {
  if (!vectorIndex) {
    vectorIndex = new VectorIndex();
  }
  return vectorIndex;
}

/**
 * Initialize the vector index from the database
 * Should be called on app startup
 */
export async function initializeVectorIndex(): Promise<void> {
  const index = getVectorIndex();
  await index.initialize();
}

/**
 * Reset the vector index (useful for testing)
 */
export function resetVectorIndex(): void {
  vectorIndex = null;
}

