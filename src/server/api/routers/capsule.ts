import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { extractAnchorMetadata } from "~/server/services/anchorExtractor";
import { repurposeAnchorContent } from "~/server/services/repurposer";
import { getLLMClient } from "~/server/services/llm/client";
import { getConfigLoader } from "~/server/services/config";
import { logServiceError } from "~/lib/logger";
import { safeJsonParseArray } from "~/lib/json-utils";
import type { AnchorWithRepurposed } from "~/types/database";

export const capsuleRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    const capsules = await ctx.db.capsule.findMany({
      include: {
        anchors: {
          include: {
            repurposedContent: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return capsules;
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const capsule = await ctx.db.capsule.findUnique({
        where: { id: input.id },
        include: {
          anchors: {
            include: {
              repurposedContent: true,
            },
          },
        },
      });

      if (!capsule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Capsule not found",
        });
      }

      return capsule;
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        promise: z.string().min(1),
        cta: z.string().min(1),
        offerMapping: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const capsule = await ctx.db.capsule.create({
        data: {
          title: input.title,
          promise: input.promise,
          cta: input.cta,
          offerMapping: input.offerMapping,
        },
      });

      return capsule;
    }),

  createAnchor: publicProcedure
    .input(
      z.object({
        capsuleId: z.string(),
        title: z.string().min(1),
        content: z.string().min(1),
        painPoints: z.array(z.string()).optional(),
        solutionSteps: z.array(z.string()).optional(),
        proof: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const anchor = await ctx.db.anchor.create({
        data: {
          capsuleId: input.capsuleId,
          title: input.title,
          content: input.content,
          painPoints: input.painPoints ? JSON.stringify(input.painPoints) : null,
          solutionSteps: input.solutionSteps
            ? JSON.stringify(input.solutionSteps)
            : null,
          proof: input.proof,
        },
      });

      return anchor;
    }),

  createRepurposedContent: publicProcedure
    .input(
      z.object({
        anchorId: z.string(),
        type: z.string().min(1),
        content: z.string().min(1),
        guidance: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const repurposed = await ctx.db.repurposedContent.create({
        data: {
          anchorId: input.anchorId,
          type: input.type,
          content: input.content,
          guidance: input.guidance,
        },
      });

      return repurposed;
    }),

  createAnchorFromPDF: publicProcedure
    .input(
      z.object({
        capsuleId: z.string(),
        fileData: z.string(), // Base64 encoded PDF file
        fileName: z.string().optional(),
        autoRepurpose: z.boolean().default(true), // Whether to automatically generate repurposed content
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Step 1: Extract text from PDF
        const pdfParseModule = await import("pdf-parse");
        
        type PDFParseModule = {
          default?: {
            PDFParse?: new (options: { data: Buffer }) => PDFParser;
          };
          PDFParse?: new (options: { data: Buffer }) => PDFParser;
        };
        
        interface PDFParser {
          getText(): Promise<{ text: string; total: number }>;
          getInfo(): Promise<{ info: unknown; metadata: unknown }>;
        }
        
        const module = pdfParseModule as unknown as PDFParseModule;
        const PDFParse = module.default?.PDFParse || module.PDFParse || (pdfParseModule as unknown as new (options: { data: Buffer }) => PDFParser);

        const pdfBuffer = Buffer.from(input.fileData, "base64");
        const parser = new PDFParse({ data: pdfBuffer });
        const textResult = await parser.getText();
        const pdfText = textResult.text;

        if (!pdfText || pdfText.trim().length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "PDF appears to be empty or could not extract text",
          });
        }

        // Step 2: Verify capsule exists
        const capsule = await ctx.db.capsule.findUnique({
          where: { id: input.capsuleId },
        });

        if (!capsule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Capsule not found",
          });
        }

        // Step 3: Extract metadata (title, pain points, solution steps) using AI
        const llmClient = getLLMClient();
        const configLoader = getConfigLoader();
        const metadata = await extractAnchorMetadata(pdfText, llmClient, configLoader);

        // Step 4: Create anchor
        const anchor = await ctx.db.anchor.create({
          data: {
            capsuleId: input.capsuleId,
            title: metadata.title,
            content: pdfText,
            painPoints: metadata.painPoints.length > 0 ? JSON.stringify(metadata.painPoints) : null,
            solutionSteps: metadata.solutionSteps.length > 0 ? JSON.stringify(metadata.solutionSteps) : null,
            proof: metadata.proof,
          },
        });

        // Step 5: Generate repurposed content if requested
        let repurposedContent = [];
        if (input.autoRepurpose) {
          const repurposed = await repurposeAnchorContent(
            metadata.title,
            pdfText,
            metadata.painPoints.length > 0 ? metadata.painPoints : null,
            metadata.solutionSteps.length > 0 ? metadata.solutionSteps : null,
            llmClient,
            configLoader,
          );

          // Save repurposed content to database
          for (const item of repurposed) {
            const saved = await ctx.db.repurposedContent.create({
              data: {
                anchorId: anchor.id,
                type: item.type,
                content: item.content,
                guidance: item.guidance,
              },
            });
            repurposedContent.push(saved);
          }
        }

        // Return anchor with repurposed content
        return {
          anchor: {
            ...anchor,
            repurposedContent,
          } as AnchorWithRepurposed,
          repurposedContent,
          metadata: {
            title: metadata.title,
            painPoints: metadata.painPoints,
            solutionSteps: metadata.solutionSteps,
            proof: metadata.proof,
          },
        };
      } catch (error) {
        logServiceError(error, "createAnchorFromPDF", {
          capsuleId: input.capsuleId,
          fileName: input.fileName,
          hasFileData: !!input.fileData,
          autoRepurpose: input.autoRepurpose,
        });

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create anchor from PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  updateAnchor: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
        painPoints: z.array(z.string()).optional(),
        solutionSteps: z.array(z.string()).optional(),
        proof: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const updateData: {
        title?: string;
        content?: string;
        painPoints?: string | null;
        solutionSteps?: string | null;
        proof?: string | null;
      } = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.painPoints !== undefined) {
        updateData.painPoints = data.painPoints.length > 0 ? JSON.stringify(data.painPoints) : null;
      }
      if (data.solutionSteps !== undefined) {
        updateData.solutionSteps = data.solutionSteps.length > 0 ? JSON.stringify(data.solutionSteps) : null;
      }
      if (data.proof !== undefined) updateData.proof = data.proof || null;

      const anchor = await ctx.db.anchor.update({
        where: { id },
        data: updateData,
      });

      return anchor;
    }),

  deleteAnchor: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Delete repurposed content first (cascade)
      await ctx.db.repurposedContent.deleteMany({
        where: { anchorId: input.id },
      });

      // Delete anchor
      const anchor = await ctx.db.anchor.delete({
        where: { id: input.id },
      });

      return anchor;
    }),

  updateRepurposedContent: publicProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().min(1).optional(),
        type: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const repurposed = await ctx.db.repurposedContent.update({
        where: { id },
        data,
      });

      return repurposed;
    }),

  deleteRepurposedContent: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const repurposed = await ctx.db.repurposedContent.delete({
        where: { id: input.id },
      });

      return repurposed;
    }),

  regenerateRepurposedContent: publicProcedure
    .input(
      z.object({
        anchorId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the anchor
        const anchor = await ctx.db.anchor.findUnique({
          where: { id: input.anchorId },
        });

        if (!anchor) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Anchor not found",
          });
        }

        // Parse pain points and solution steps
        const painPoints = safeJsonParseArray<string>(anchor.painPoints, []) ?? [];
        const solutionSteps = safeJsonParseArray<string>(anchor.solutionSteps, []) ?? [];

        // Generate new repurposed content
        const llmClient = getLLMClient();
        const configLoader = getConfigLoader();
        const repurposed = await repurposeAnchorContent(
          anchor.title,
          anchor.content,
          Array.isArray(painPoints) ? painPoints : null,
          Array.isArray(solutionSteps) ? solutionSteps : null,
          llmClient,
          configLoader,
        );

        // Delete existing repurposed content
        await ctx.db.repurposedContent.deleteMany({
          where: { anchorId: input.anchorId },
        });

        // Save new repurposed content
        const savedRepurposed = [];
        for (const item of repurposed) {
          const saved = await ctx.db.repurposedContent.create({
            data: {
              anchorId: input.anchorId,
              type: item.type,
              content: item.content,
              guidance: item.guidance,
            },
          });
          savedRepurposed.push(saved);
        }

        return savedRepurposed;
      } catch (error) {
        logServiceError(error, "regenerateRepurposedContent", {
          anchorId: input.anchorId,
        });

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to regenerate repurposed content: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});

