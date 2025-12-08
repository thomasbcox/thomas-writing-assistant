import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { logServiceError } from "~/lib/logger";

export const pdfRouter = createTRPCRouter({
  extractText: publicProcedure
    .input(
      z.object({
        fileData: z.string(), // Base64 encoded PDF file
        fileName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Dynamic import for pdf-parse v2 (works in both ESM and CommonJS)
        // pdf-parse v2 uses a class-based API
        const pdfParseModule = await import("pdf-parse");
        
        // Type guard for pdf-parse module structure
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

        // Decode base64 PDF data
        const pdfBuffer = Buffer.from(input.fileData, "base64");

        // Create PDFParse instance with buffer
        const parser = new PDFParse({ data: pdfBuffer });

        // Extract text from PDF using v2 API
        const textResult = await parser.getText();

        // Get document info
        const infoResult = await parser.getInfo();

        return {
          text: textResult.text,
          numPages: textResult.total,
          info: infoResult.info,
          metadata: infoResult.metadata,
          fileName: input.fileName,
        };
      } catch (error) {
        logServiceError(error, "pdfExtractor", {
          fileName: input.fileName,
          hasFileData: !!input.fileData,
        });
        throw new Error(
          `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),
});

