/**
 * Blog Posts API hooks
 * TODO: Implement IPC handlers for blog post generation
 */

import { useIPCMutation } from "~/hooks/useIPC";
import type { BlogPost } from "~/server/services/blogPostGenerator";

export interface GenerateBlogPostInput {
  topic: string;
  title?: string;
  conceptIds: string[];
  targetLength?: "short" | "medium" | "long";
  tone?: "informative" | "conversational" | "authoritative" | "personal";
  includeCTA?: boolean;
  ctaText?: string;
}

export function useGenerateBlogPost() {
  // TODO: Create IPC handler for blog post generation
  // For now, return a stub that throws an error
  return useIPCMutation<BlogPost, GenerateBlogPostInput>(
    async (input) => {
      throw new Error("Blog post generation not yet implemented via IPC. Please use the service directly.");
    },
  );
}

