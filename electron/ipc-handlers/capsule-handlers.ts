import { ipcMain } from "electron";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { capsule, anchor, repurposedContent } from "../../src/server/schema.js";
import { getDb } from "../db.js";
import { extractAnchorMetadata } from "../../src/server/services/anchorExtractor.js";
import { repurposeAnchorContent } from "../../src/server/services/repurposer.js";
import { getLLMClient } from "../../src/server/services/llm/client.js";
import { getConfigLoader } from "../../src/server/services/config.js";
import { logger, logServiceError } from "../../src/lib/logger.js";
import { safeJsonParseArray } from "../../src/lib/json-utils.js";
import { serializeCapsule, serializeAnchor, serializeRepurposedContent, serializeCapsuleWithAnchors } from "../../src/lib/serializers.js";

export function registerCapsuleHandlers() {
  // List capsules
  ipcMain.handle("capsule:list", async (_event, input: unknown) => {
    const parsed = z.object({
      summary: z.boolean().optional().default(false),
    }).optional().parse(input);
    
    const db = getDb();
    const summaryOnly = parsed?.summary ?? false;

    logger.info({ operation: "capsule:list", summary: summaryOnly }, "Fetching capsules");

    if (summaryOnly) {
      const capsules = await db.query.capsule.findMany({
        with: {
          anchors: {},
        },
        orderBy: [desc(capsule.createdAt)],
      });
      logger.info({ operation: "capsule:list", count: capsules.length, summary: true }, "Capsules fetched successfully");
      return capsules.map(serializeCapsule);
    }

    const capsules = await db.query.capsule.findMany({
      with: {
        anchors: {
          with: {
            repurposedContent: true,
          },
        },
      },
      orderBy: [desc(capsule.createdAt)],
    });

    logger.info({ operation: "capsule:list", count: capsules.length }, "Capsules fetched successfully");
    return capsules.map(serializeCapsuleWithAnchors);
  });

  // Get capsule by ID
  ipcMain.handle("capsule:getById", async (_event, input: unknown) => {
    const parsed = z.object({ id: z.string() }).parse(input);
    const db = getDb();

    logger.info({ operation: "capsule:getById", capsuleId: parsed.id }, "Fetching capsule by ID");

    const foundCapsule = await db.query.capsule.findFirst({
      where: eq(capsule.id, parsed.id),
      with: {
        anchors: {
          with: {
            repurposedContent: true,
          },
        },
      },
    });

    if (!foundCapsule) {
      logger.warn({ operation: "capsule:getById", capsuleId: parsed.id }, "Capsule not found");
      throw new Error("Capsule not found");
    }

    logger.info({ operation: "capsule:getById", capsuleId: parsed.id, anchorsCount: foundCapsule.anchors?.length ?? 0 }, "Capsule fetched successfully");
    return serializeCapsuleWithAnchors(foundCapsule);
  });

  // Create capsule
  ipcMain.handle("capsule:create", async (_event, input: unknown) => {
    const parsed = z.object({
      title: z.string().min(1),
      promise: z.string().min(1),
      cta: z.string().min(1),
      offerMapping: z.string().optional(),
    }).parse(input);
    
    const db = getDb();

    logger.info({ operation: "capsule:create", title: parsed.title, offerMapping: parsed.offerMapping }, "Creating capsule");

    const [newCapsule] = await db
      .insert(capsule)
      .values({
        title: parsed.title,
        promise: parsed.promise,
        cta: parsed.cta,
        offerMapping: parsed.offerMapping ?? null,
      })
      .returning();

    logger.info({ operation: "capsule:create", capsuleId: newCapsule.id, title: parsed.title }, "Capsule created successfully");
    return serializeCapsule(newCapsule);
  });

  // Create anchor from PDF
  ipcMain.handle("capsule:createAnchorFromPDF", async (_event, input: unknown) => {
    const parsed = z.object({
      capsuleId: z.string(),
      fileData: z.string(), // Base64 encoded PDF
      fileName: z.string().optional(),
      autoRepurpose: z.boolean().default(false),
    }).parse(input);
    
    const db = getDb();

    logger.info({ operation: "capsule:createAnchorFromPDF", capsuleId: parsed.capsuleId, fileName: parsed.fileName, autoRepurpose: parsed.autoRepurpose }, "Creating anchor from PDF");

    try {
      // Extract PDF text
      logger.info({ operation: "capsule:createAnchorFromPDF", step: "extractText" }, "Extracting text from PDF");
      const pdfParseModule = await import("pdf-parse");
      type PDFParseModule = {
        default?: {
          PDFParse?: new (options: { data: Buffer }) => PDFParser;
        };
        PDFParse?: new (options: { data: Buffer }) => PDFParser;
      };
      
      interface PDFParser {
        getText(): Promise<{ text: string; total: number }>;
      }
      
      const module = pdfParseModule as unknown as PDFParseModule;
      const PDFParse = module.default?.PDFParse || module.PDFParse || (pdfParseModule as unknown as new (options: { data: Buffer }) => PDFParser);

      const pdfBuffer = Buffer.from(parsed.fileData, "base64");
      const parser = new PDFParse({ data: pdfBuffer });
      const textResult = await parser.getText();
      const pdfText = textResult.text;

      if (!pdfText || pdfText.trim().length === 0) {
        throw new Error("PDF appears to be empty or could not extract text");
      }

      // Verify capsule exists
      const foundCapsule = await db.query.capsule.findFirst({
        where: eq(capsule.id, parsed.capsuleId),
      });

      if (!foundCapsule) {
        throw new Error("Capsule not found");
      }

      const llmClient = getLLMClient();
      const configLoader = getConfigLoader();

      // Extract metadata
      const metadata = await extractAnchorMetadata(
        pdfText,
        llmClient,
        configLoader,
      );

      // Create anchor
      const [newAnchor] = await db
        .insert(anchor)
        .values({
          capsuleId: parsed.capsuleId,
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

      // Generate repurposed content if requested
      const savedRepurposed = [];
      if (parsed.autoRepurpose) {
        logger.info({ operation: "capsule:createAnchorFromPDF", step: "repurpose", anchorId: newAnchor.id }, "Generating repurposed content");
        const painPoints = newAnchor.painPoints ? JSON.parse(newAnchor.painPoints) : null;
        const solutionSteps = newAnchor.solutionSteps ? JSON.parse(newAnchor.solutionSteps) : null;
        const repurposed = await repurposeAnchorContent(
          newAnchor.title,
          newAnchor.content,
          painPoints,
          solutionSteps,
          llmClient,
          configLoader,
        );
        savedRepurposed.push(...repurposed);
        logger.info({ operation: "capsule:createAnchorFromPDF", step: "repurpose", count: savedRepurposed.length }, "Repurposed content generated");
      }

      logger.info({ operation: "capsule:createAnchorFromPDF", anchorId: newAnchor.id, capsuleId: parsed.capsuleId, repurposedCount: savedRepurposed.length }, "Anchor created from PDF successfully");
      return {
        anchor: serializeAnchor(newAnchor),
        repurposedContent: savedRepurposed.map((rc) => ({
          id: "", // Not saved to DB yet, empty ID
          anchorId: newAnchor.id,
          type: rc.type,
          content: rc.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      };
    } catch (error) {
      logServiceError(error, "capsule.createAnchorFromPDF", {
        capsuleId: parsed.capsuleId,
        fileName: parsed.fileName,
      });
      throw new Error(
        `Failed to create anchor from PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  });

  // Additional capsule handlers can be added here following the same pattern
  // For now, these are the essential ones used by components
}

