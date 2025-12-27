/**
 * PDF text extraction service
 * Accepts PDF parser as dependency for testability
 */

export interface PDFParser {
  getText(): Promise<{ text: string; total: number }>;
  getInfo(): Promise<{ info: Record<string, unknown>; metadata: Record<string, unknown> }>;
}

export interface PDFParseConstructor {
  new (options: { data: Buffer }): PDFParser;
}

export interface PDFExtractionResult {
  text: string;
  numPages: number;
  info: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

/**
 * Extracts text and metadata from a PDF buffer
 * @param pdfBuffer - The PDF file as a Buffer
 * @param PDFParse - The PDF parser constructor (for dependency injection)
 * @returns Extracted text and metadata
 */
export async function extractPDFText(
  pdfBuffer: Buffer,
  PDFParse: PDFParseConstructor,
): Promise<PDFExtractionResult> {
  const parser = new PDFParse({ data: pdfBuffer });
  const textResult = await parser.getText();
  const infoResult = await parser.getInfo();

  return {
    text: textResult.text,
    numPages: textResult.total,
    info: infoResult.info,
    metadata: infoResult.metadata,
  };
}
