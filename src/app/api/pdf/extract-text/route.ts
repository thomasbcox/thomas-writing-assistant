/**
 * REST API route to extract text from PDF
 * POST /api/pdf/extract-text
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody } from "~/server/api/helpers";
import { logServiceError } from "~/lib/logger";
import { extractPDFText, type PDFParseConstructor } from "~/server/services/pdfExtractor";

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

    // Import PDF parser - use dynamic import for lazy loading
    // In tests, this will use the mock from setup.ts
    const pdfParseModule = await import("pdf-parse");
    
    type PDFParseModule = {
      default?: {
        PDFParse?: PDFParseConstructor;
      };
      PDFParse?: PDFParseConstructor;
    };
    
    const module = pdfParseModule as unknown as PDFParseModule;
    // Try multiple access patterns for compatibility
    const PDFParse = module.default?.PDFParse || module.PDFParse || (pdfParseModule as unknown as PDFParseConstructor);
    
    if (!PDFParse || typeof PDFParse !== "function") {
      throw new Error("PDF parser not found in pdf-parse module");
    }

    const pdfBuffer = Buffer.from(input.fileData, "base64");
    const result = await extractPDFText(pdfBuffer, PDFParse);

    return NextResponse.json({
      ...result,
      fileName: input.fileName,
    });
  } catch (error) {
    logServiceError(error, "pdfExtractor", {
      fileName: fileName || "unknown",
    });
    return handleApiError(error);
  }
}
