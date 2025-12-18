/**
 * React Query hooks for blog post generation API
 */

import { useMutation } from "@tanstack/react-query";
import type { BlogPost, BlogPostInput } from "~/server/services/blogPostGenerator";

// Re-export types for convenience
export type { BlogPost, BlogPostInput } from "~/server/services/blogPostGenerator";

// Generate blog post
export function useGenerateBlogPost() {
  return useMutation<BlogPost, Error, BlogPostInput>({
    mutationFn: async (input) => {
      const response = await fetch("/api/blog-posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate blog post");
      }
      return response.json();
    },
  });
}
