/**
 * REST API route to create anchor from PDF
 * POST /api/capsules/[id]/anchors/from-pdf
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody, getDb } from "~/server/api/helpers";
import { extractAnchorMetadata } from "~/server/services/anchorExtractor";
import { getLLMClient } from "~/server/services/llm/client";
import { getConfigLoader } from "~/server/services/config";

const createAnchorFromPDFSchema = z.object({
  fileData: z.string(), // Base64 encoded PDF
  fileName: z.string().optional(),
  autoRepurpose: z.boolean().optional().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = getDb();
    const { id: capsuleId } = await params;
    const body = await parseJsonBody(request);
    const input = createAnchorFromPDFSchema.parse(body);

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
    }
    
    const module = pdfParseModule as unknown as PDFParseModule;
    const PDFParse = module.default?.PDFParse || module.PDFParse || (pdfParseModule as unknown as new (options: { data: Buffer }) => PDFParser);

    const pdfBuffer = Buffer.from(input.fileData, "base64");
    const parser = new PDFParse({ data: pdfBuffer });
    const textResult = await parser.getText();
    const pdfText = textResult.text;

    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json(
        { error: "PDF appears to be empty or could not extract text" },
        { status: 400 },
      );
    }

    const llmClient = getLLMClient();
    const configLoader = getConfigLoader();

    // Step 2: Extract metadata from PDF text
    const metadata = await extractAnchorMetadata(pdfText, llmClient, configLoader);

    // Step 3: Create anchor (use pdfText as content)
    const anchor = await db.anchor.create({
      data: {
        capsuleId,
        title: metadata.title,
        content: pdfText,
        painPoints: metadata.painPoints.length > 0 ? JSON.stringify(metadata.painPoints) : null,
        solutionSteps: metadata.solutionSteps.length > 0 ? JSON.stringify(metadata.solutionSteps) : null,
        proof: metadata.proof,
      },
    });

    // Generate repurposed content if requested
    let repurposedContent = [];
    if (input.autoRepurpose) {
      const { repurposeAnchorContent } = await import("~/server/services/repurposer");
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
        const created = await db.repurposedContent.create({
          data: {
            anchorId: anchor.id,
            type: item.type,
            content: item.content,
            guidance: item.guidance ?? null,
          },
        });
        repurposedContent.push(created);
      }
    }

    return NextResponse.json({
      anchor: {
        ...anchor,
        repurposedContent,
      },
      repurposedContent,
      metadata: {
        title: metadata.title,
        painPoints: metadata.painPoints,
        solutionSteps: metadata.solutionSteps,
        proof: metadata.proof,
      },
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

