/**
 * REST API route to extract text from PDF
 * POST /api/pdf/extract-text
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody } from "~/server/api/helpers";
import { logServiceError } from "~/lib/logger";

const extractTextSchema = z.object({
  fileData: z.string(), // Base64 encoded PDF file
  fileName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let fileName: string | undefined;
  try {
    const body = await parseJsonBody(request);
    const input = extractTextSchema.parse(body);
    fileName = input.fileName; // Store fileName before processing

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
    const infoResult = await parser.getInfo();

    return NextResponse.json({
      text: textResult.text,
      numPages: textResult.total,
      info: infoResult.info,
      metadata: infoResult.metadata,
      fileName: input.fileName,
    });
  } catch (error) {
    logServiceError(error, "pdfExtractor", {
      fileName: fileName || "unknown",
    });
    return handleApiError(error);
  }
}

