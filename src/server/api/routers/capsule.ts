/**
 * Capsule Router - tRPC procedures for capsule content management
 * Uses Drizzle ORM for database access
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { eq, desc, sql } from "drizzle-orm";
import { capsule, anchor, repurposedContent } from "~/server/schema";
import { extractAnchorMetadata } from "~/server/services/anchorExtractor";
import { repurposeAnchorContent } from "~/server/services/repurposer";
import { getDependencies } from "~/server/dependencies";
import { logServiceError } from "~/lib/logger";
import { safeJsonParseArray } from "~/lib/json-utils";

export const capsuleRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        summary: z.boolean().optional().default(false), // If true, only return counts, not full nested data
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const summaryOnly = input?.summary ?? false;

      if (summaryOnly) {
        // Lightweight query for dashboard - only get capsules with anchors (no repurposedContent)
        // Load anchors without their nested repurposedContent relation
        const capsules = await ctx.db.query.capsule.findMany({
          with: {
            anchors: {
              // Don't include repurposedContent relation
            },
          },
          orderBy: [desc(capsule.createdAt)],
        });

        return capsules;
      }

      // Full query with all nested data for detailed views
      const capsules = await ctx.db.query.capsule.findMany({
        with: {
          anchors: {
            with: {
              repurposedContent: true,
            },
          },
        },
        orderBy: [desc(capsule.createdAt)],
      });

      return capsules;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const foundCapsule = await ctx.db.query.capsule.findFirst({
        where: eq(capsule.id, input.id),
        with: {
          anchors: {
            with: {
              repurposedContent: true,
            },
          },
        },
      });

      if (!foundCapsule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Capsule not found",
        });
      }

      return foundCapsule;
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
      const [newCapsule] = await ctx.db
        .insert(capsule)
        .values({
          title: input.title,
          promise: input.promise,
          cta: input.cta,
          offerMapping: input.offerMapping ?? null,
        })
        .returning();

      return newCapsule;
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
      const [newAnchor] = await ctx.db
        .insert(anchor)
        .values({
          capsuleId: input.capsuleId,
          title: input.title,
          content: input.content,
          painPoints: input.painPoints ? JSON.stringify(input.painPoints) : null,
          solutionSteps: input.solutionSteps
            ? JSON.stringify(input.solutionSteps)
            : null,
          proof: input.proof ?? null,
        })
        .returning();

      return newAnchor;
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
      const [newRepurposed] = await ctx.db
        .insert(repurposedContent)
        .values({
          anchorId: input.anchorId,
          type: input.type,
          content: input.content,
          guidance: input.guidance ?? null,
        })
        .returning();

      return newRepurposed;
    }),

  createAnchorFromPDF: publicProcedure
    .input(
      z.object({
        capsuleId: z.string(),
        fileData: z.string(), // Base64 encoded PDF file
        fileName: z.string().optional(),
        autoRepurpose: z.boolean().default(true),
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
        const PDFParse =
          module.default?.PDFParse ||
          module.PDFParse ||
          (pdfParseModule as unknown as new (options: { data: Buffer }) => PDFParser);

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
        const foundCapsule = await ctx.db.query.capsule.findFirst({
          where: eq(capsule.id, input.capsuleId),
        });

        if (!foundCapsule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Capsule not found",
          });
        }

        // Step 3: Extract metadata using AI
        const llmClient = getLLMClient();
        const configLoader = getConfigLoader();
        const metadata = await extractAnchorMetadata(
          pdfText,
          llmClient,
          configLoader,
        );

        // Step 4: Create anchor
        const [newAnchor] = await ctx.db
          .insert(anchor)
          .values({
            capsuleId: input.capsuleId,
            title: metadata.title,
            content: pdfText,
            painPoints:
              metadata.painPoints.length > 0
                ? JSON.stringify(metadata.painPoints)
                : null,
            solutionSteps:
              metadata.solutionSteps.length > 0
                ? JSON.stringify(metadata.solutionSteps)
                : null,
            proof: metadata.proof ?? null,
          })
          .returning();

        // Step 5: Generate repurposed content if requested
        const savedRepurposed = [];
        if (input.autoRepurpose) {
          const repurposed = await repurposeAnchorContent(
            metadata.title,
            pdfText,
            metadata.painPoints.length > 0 ? metadata.painPoints : null,
            metadata.solutionSteps.length > 0 ? metadata.solutionSteps : null,
            llmClient,
            configLoader,
          );

          // Save repurposed content
          for (const item of repurposed) {
            const [saved] = await ctx.db
              .insert(repurposedContent)
              .values({
                anchorId: newAnchor.id,
                type: item.type,
                content: item.content,
                guidance: item.guidance ?? null,
              })
              .returning();
            savedRepurposed.push(saved);
          }
        }

        // Return anchor with repurposed content
        const fullAnchor = await ctx.db.query.anchor.findFirst({
          where: eq(anchor.id, newAnchor.id),
          with: {
            repurposedContent: true,
          },
        });

        return {
          anchor: fullAnchor!,
          repurposedContent: savedRepurposed,
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
        updateData.painPoints =
          data.painPoints.length > 0 ? JSON.stringify(data.painPoints) : null;
      }
      if (data.solutionSteps !== undefined) {
        updateData.solutionSteps =
          data.solutionSteps.length > 0
            ? JSON.stringify(data.solutionSteps)
            : null;
      }
      if (data.proof !== undefined) updateData.proof = data.proof || null;

      const [updatedAnchor] = await ctx.db
        .update(anchor)
        .set(updateData)
        .where(eq(anchor.id, id))
        .returning();

      if (!updatedAnchor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Anchor not found",
        });
      }

      return updatedAnchor;
    }),

  deleteAnchor: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Delete repurposed content first (cascade handled by DB)
      await ctx.db
        .delete(repurposedContent)
        .where(eq(repurposedContent.anchorId, input.id));

      // Delete anchor
      const foundAnchor = await ctx.db.query.anchor.findFirst({
        where: eq(anchor.id, input.id),
      });

      if (!foundAnchor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Anchor not found",
        });
      }

      await ctx.db.delete(anchor).where(eq(anchor.id, input.id));

      return foundAnchor;
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

      const [updatedRepurposed] = await ctx.db
        .update(repurposedContent)
        .set(data)
        .where(eq(repurposedContent.id, id))
        .returning();

      if (!updatedRepurposed) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Repurposed content not found",
        });
      }

      return updatedRepurposed;
    }),

  deleteRepurposedContent: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const foundRepurposed = await ctx.db.query.repurposedContent.findFirst({
        where: eq(repurposedContent.id, input.id),
      });

      if (!foundRepurposed) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Repurposed content not found",
        });
      }

      await ctx.db
        .delete(repurposedContent)
        .where(eq(repurposedContent.id, input.id));

      return foundRepurposed;
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
        const foundAnchor = await ctx.db.query.anchor.findFirst({
          where: eq(anchor.id, input.anchorId),
        });

        if (!foundAnchor) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Anchor not found",
          });
        }

        // Parse pain points and solution steps
        const painPoints =
          safeJsonParseArray<string>(foundAnchor.painPoints, []) ?? [];
        const solutionSteps =
          safeJsonParseArray<string>(foundAnchor.solutionSteps, []) ?? [];

        // Generate new repurposed content
        const { llmClient, configLoader } = getDependencies();
        const repurposed = await repurposeAnchorContent(
          foundAnchor.title,
          foundAnchor.content,
          Array.isArray(painPoints) ? painPoints : null,
          Array.isArray(solutionSteps) ? solutionSteps : null,
          llmClient,
          configLoader,
        );

        // Delete existing repurposed content
        await ctx.db
          .delete(repurposedContent)
          .where(eq(repurposedContent.anchorId, input.anchorId));

        // Save new repurposed content
        const savedRepurposed = [];
        for (const item of repurposed) {
          const [saved] = await ctx.db
            .insert(repurposedContent)
            .values({
              anchorId: input.anchorId,
              type: item.type,
              content: item.content,
              guidance: item.guidance ?? null,
            })
            .returning();
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
