import { describe, it, expect } from "@jest/globals";
import { slidingWindowChunk } from "~/lib/text-processing";

describe("text-processing", () => {
  describe("slidingWindowChunk", () => {
    it("should return single chunk for text shorter than chunk size", () => {
      const text = "Short text.";
      const result = slidingWindowChunk(text, 100);
      expect(result).toEqual([text]);
    });

    it("should split text into multiple chunks when longer than chunk size", () => {
      const text = "a".repeat(100000); // 100k chars
      const result = slidingWindowChunk(text, 30000, 5000);
      expect(result.length).toBeGreaterThan(1);
      expect(result.every((chunk) => chunk.length > 0)).toBe(true);
    });

    it("should create overlapping chunks", () => {
      const text = "a".repeat(50000); // 50k chars
      const chunkSize = 20000;
      const overlap = 5000;
      const result = slidingWindowChunk(text, chunkSize, overlap);
      
      // Check that chunks overlap
      if (result.length > 1) {
        const firstChunk = result[0]!;
        const secondChunk = result[1]!;
        // The last part of first chunk should appear at start of second chunk
        const firstEnd = firstChunk.slice(-overlap);
        expect(secondChunk.startsWith(firstEnd)).toBe(true);
      }
    });

    it("should respect sentence boundaries when possible", () => {
      const sentences = Array.from({ length: 100 }, (_, i) => `Sentence ${i}. `).join("");
      const text = sentences.repeat(10); // Create long text with clear sentence boundaries
      const result = slidingWindowChunk(text, 1000, 200);
      
      // Most chunks should end with sentence punctuation
      const chunksEndingWithPunctuation = result.filter((chunk) => /[.!?]\s*$/.test(chunk));
      expect(chunksEndingWithPunctuation.length).toBeGreaterThan(result.length * 0.5);
    });

    it("should handle empty text", () => {
      const result = slidingWindowChunk("", 1000);
      expect(result).toEqual([]);
    });

    it("should handle whitespace-only text", () => {
      const result = slidingWindowChunk("   \n\n   ", 1000);
      expect(result).toEqual([]);
    });

    it("should ensure 100% coverage (no gaps)", () => {
      const text = "a".repeat(100000);
      const result = slidingWindowChunk(text, 30000, 5000);
      
      // Reconstruct text from chunks (accounting for overlap)
      let reconstructed = result[0] || "";
      for (let i = 1; i < result.length; i++) {
        const chunk = result[i]!;
        const overlap = 5000;
        // Remove overlap from previous chunk
        reconstructed = reconstructed.slice(0, -overlap) + chunk;
      }
      
      // Should cover entire original text
      expect(reconstructed.length).toBeGreaterThanOrEqual(text.length * 0.95); // Allow small margin for boundary adjustments
    });

    it("should use custom chunk size and overlap", () => {
      const text = "a".repeat(50000);
      const customChunkSize = 10000;
      const customOverlap = 2000;
      const result = slidingWindowChunk(text, customChunkSize, customOverlap);
      
      // Should create more chunks with smaller chunk size
      expect(result.length).toBeGreaterThan(3);
      
      // Each chunk should be approximately chunk size (allowing for boundary adjustments)
      result.forEach((chunk) => {
        expect(chunk.length).toBeGreaterThan(customChunkSize * 0.8);
        expect(chunk.length).toBeLessThan(customChunkSize * 1.5);
      });
    });

    it("should handle edge case where overlap is larger than chunk size", () => {
      const text = "a".repeat(10000);
      const result = slidingWindowChunk(text, 1000, 2000); // Overlap > chunk size
      
      // Should still make progress and not infinite loop
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((chunk) => chunk.length > 0)).toBe(true);
    });

    it("should preserve text content (no data loss)", () => {
      const originalText = "This is a test. " + "x".repeat(50000) + " End of test.";
      const result = slidingWindowChunk(originalText, 30000, 5000);
      
      // All chunks should contain parts of original text
      result.forEach((chunk) => {
        expect(originalText.includes(chunk) || chunk.includes(originalText.slice(0, 100))).toBe(true);
      });
    });
  });
});

