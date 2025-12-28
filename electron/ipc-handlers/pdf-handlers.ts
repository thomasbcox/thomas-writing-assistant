import { ipcMain } from "electron";
import { z } from "zod";
import { logServiceError } from "../../src/lib/logger.js";

export function registerPdfHandlers() {
  // Extract text from PDF
  ipcMain.handle("pdf:extractText", async (_event, input: unknown) => {
    const parsed = z.object({
      fileData: z.string(), // Base64 encoded PDF file
      fileName: z.string().optional(),
    }).parse(input);

    try {
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

      const pdfBuffer = Buffer.from(parsed.fileData, "base64");
      const parser = new PDFParse({ data: pdfBuffer });

      const textResult = await parser.getText();
      const infoResult = await parser.getInfo();

      return {
        text: textResult.text,
        numPages: textResult.total,
        info: infoResult.info,
        metadata: infoResult.metadata,
        fileName: parsed.fileName,
      };
    } catch (error) {
      logServiceError(error, "pdfExtractor", {
        fileName: parsed.fileName,
        hasFileData: !!parsed.fileData,
      });
      throw new Error(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  });
}

