import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  analyzeConcept,
  enrichMetadata,
  chatEnrichConcept,
  expandDefinition,
  type ConceptFormData,
  type ChatMessage,
} from "~/server/services/conceptEnricher";
import { getDependencies } from "~/server/dependencies";
import { logServiceError } from "~/lib/logger";

const conceptFormDataSchema = z.object({
  title: z.string(),
  description: z.string(),
  content: z.string(),
  creator: z.string(),
  source: z.string(),
  year: z.string(),
});

const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.date(),
  suggestions: z.array(z.any()).optional(),
  actions: z.array(z.any()).optional(),
});

export const enrichmentRouter = createTRPCRouter({
  /**
   * Analyze a concept and get initial suggestions
   */
  analyze: publicProcedure
    .input(conceptFormDataSchema)
    .mutation(async ({ input }) => {
      try {
        const { llmClient, configLoader } = getDependencies();

        const result = await analyzeConcept(input as ConceptFormData, llmClient, configLoader);

        return result;
      } catch (error) {
        logServiceError(error, "enrichment.analyze", { conceptTitle: input.title });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to analyze concept: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Fetch metadata (author, year, source) for a concept
   */
  enrichMetadata: publicProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { llmClient, configLoader } = getDependencies();

        const result = await enrichMetadata(input.title, input.description, llmClient, configLoader);

        return result;
      } catch (error) {
        logServiceError(error, "enrichment.enrichMetadata", { conceptTitle: input.title });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to enrich metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Conversational chat for enrichment
   */
  chat: publicProcedure
    .input(
      z.object({
        message: z.string(),
        conceptData: conceptFormDataSchema,
        chatHistory: z.array(chatMessageSchema),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const llmClient = getLLMClient();
        const configLoader = getConfigLoader();

        // Convert chat history dates
        const history: ChatMessage[] = input.chatHistory.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
        }));

        const result = await chatEnrichConcept(
          input.message,
          input.conceptData as ConceptFormData,
          history,
          llmClient,
          configLoader,
        );

        return result;
      } catch (error) {
        logServiceError(error, "enrichment.chat", { conceptTitle: input.conceptData.title });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to process chat message: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Expand a definition
   */
  expandDefinition: publicProcedure
    .input(
      z.object({
        currentDefinition: z.string(),
        conceptTitle: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { llmClient, configLoader } = getDependencies();

        const expanded = await expandDefinition(
          input.currentDefinition,
          input.conceptTitle,
          llmClient,
          configLoader,
        );

        return { expanded };
      } catch (error) {
        logServiceError(error, "enrichment.expandDefinition", { conceptTitle: input.conceptTitle });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to expand definition: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});

