/**
 * Text processing utilities
 * Pure functions for text manipulation - no side effects, fully testable
 */

/**
 * Sliding window chunking function that processes the entire document
 * Uses overlapping windows to ensure 100% coverage without information loss
 * 
 * @param text The full text to chunk
 * @param chunkSize Target size for each chunk in characters (default: 30000)
 * @param overlap Overlap between chunks in characters (default: 5000)
 * @returns Array of text chunks covering the entire document
 */
export function slidingWindowChunk(text: string, chunkSize: number = 30000, overlap: number = 5000): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  if (text.length <= chunkSize) {
    // Document fits in one chunk
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  // Ensure overlap is strictly less than chunkSize to prevent infinite loops
  const effectiveOverlap = Math.min(overlap, chunkSize - 1);

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // If this isn't the last chunk, try to end at a sentence boundary
    if (end < text.length) {
      // Look for sentence boundary within the last 20% of the chunk
      const searchStart = Math.max(start + Math.floor(chunkSize * 0.5), end - Math.floor(chunkSize * 0.2));
      const searchEnd = Math.min(text.length, end + 1000); // Allow some flexibility
      const searchText = text.slice(searchStart, searchEnd);
      
      // Find last sentence boundary (period, exclamation, question mark followed by space/newline)
      const sentenceMatch = searchText.match(/[.!?][\s\n]+/g);
      if (sentenceMatch && sentenceMatch.length > 0) {
        const lastMatch = sentenceMatch[sentenceMatch.length - 1];
        const matchIndex = searchText.lastIndexOf(lastMatch);
        if (matchIndex !== -1) {
          end = searchStart + matchIndex + lastMatch.length;
        }
      } else {
        // Fall back to paragraph boundary (double newline)
        const paraMatch = searchText.match(/\n\s*\n/g);
        if (paraMatch && paraMatch.length > 0) {
          const lastMatch = paraMatch[paraMatch.length - 1];
          const matchIndex = searchText.lastIndexOf(lastMatch);
          if (matchIndex !== -1) {
            end = searchStart + matchIndex + lastMatch.length;
          }
        }
      }
    }

    // Ensure we don't get stuck if boundary search failed or wasn't applicable
    if (end <= start) {
      end = Math.min(start + chunkSize, text.length);
    }

    const chunk = text.slice(start, end);
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }

    // Prepare for next iteration
    if (end >= text.length) {
      break;
    }

    // Move start position forward with overlap
    // Ensure we make progress: next start must be > current start
    const nextStart = end - effectiveOverlap;
    start = Math.max(start + 1, nextStart);
  }

  return chunks;
}

