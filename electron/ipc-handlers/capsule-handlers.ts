import { ipcMain } from "electron";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { capsule, anchor, repurposedContent } from "../../src/server/schema.js";
import { getDb } from "../db.js";
import { extractAnchorMetadata } from "../../src/server/services/anchorExtractor.js";
import { repurposeAnchorContent } from "../../src/server/services/repurposer.js";
import { getLLMClient } from "../../src/server/services/llm/client.js";
import { getConfigLoader } from "../../src/server/services/config.js";
import { logServiceError } from "../../src/lib/logger.js";
import { safeJsonParseArray } from "../../src/lib/json-utils.js";

export function registerCapsuleHandlers() {
  // List capsules
  ipcMain.handle("capsule:list", async (_event, input: unknown) => {
    const parsed = z.object({
      summary: z.boolean().optional().default(false),
    }).optional().parse(input);
    
    const db = getDb();
    const summaryOnly = parsed?.summary ?? false;

    if (summaryOnly) {
      const capsules = await db.query.capsule.findMany({
        with: {
          anchors: {},
        },
        orderBy: [desc(capsule.createdAt)],
      });
      return capsules;
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

    return capsules;
  });

  // Get capsule by ID
  ipcMain.handle("capsule:getById", async (_event, input: unknown) => {
    const parsed = z.object({ id: z.string() }).parse(input);
    const db = getDb();

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
      throw new Error("Capsule not found");
    }

    return foundCapsule;
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

    const [newCapsule] = await db
      .insert(capsule)
      .values({
        title: parsed.title,
        promise: parsed.promise,
        cta: parsed.cta,
        offerMapping: parsed.offerMapping ?? null,
      })
      .returning();

    return newCapsule;
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

    try {
      // Extract PDF text
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
        const repurposed = await repurposeAnchorContent(
          newAnchor.id,
          db,
          llmClient,
          configLoader,
        );
        savedRepurposed.push(...repurposed);
      }

      return {
        anchor: newAnchor,
        repurposedContent: savedRepurposed,
        metadata,
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

