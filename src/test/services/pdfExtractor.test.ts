import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { extractPDFText, type PDFParseConstructor } from "~/server/services/pdfExtractor";

describe("pdfExtractor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("extractPDFText", () => {
    it("should extract text from PDF buffer", async () => {
      const mockGetText = jest.fn<() => Promise<{ text: string; total: number }>>().mockResolvedValue({
        text: "This is extracted PDF text content.",
        total: 1,
      });
      const mockGetInfo = jest.fn<() => Promise<{ info: Record<string, unknown>; metadata: Record<string, unknown> }>>().mockResolvedValue({
        info: {},
        metadata: {},
      });
      
      const MockParser = jest.fn().mockImplementation(() => ({
        getText: mockGetText,
        getInfo: mockGetInfo,
      })) as unknown as PDFParseConstructor;

      const pdfBuffer = Buffer.from("fake pdf content");
      const result = await extractPDFText(pdfBuffer, MockParser);

      expect(result.text).toBe("This is extracted PDF text content.");
      expect(result.numPages).toBe(1);
      expect(MockParser).toHaveBeenCalledWith({ data: pdfBuffer });
    });

    it("should handle multi-page PDFs", async () => {
      const mockGetText = jest.fn<() => Promise<{ text: string; total: number }>>().mockResolvedValue({
        text: "Page 1 content\n\nPage 2 content",
        total: 2,
      });
      const mockGetInfo = jest.fn<() => Promise<{ info: Record<string, unknown>; metadata: Record<string, unknown> }>>().mockResolvedValue({
        info: {},
        metadata: {},
      });
      
      const MockParser = jest.fn().mockImplementation(() => ({
        getText: mockGetText,
        getInfo: mockGetInfo,
      })) as unknown as PDFParseConstructor;

      const pdfBuffer = Buffer.from("fake pdf content");
      const result = await extractPDFText(pdfBuffer, MockParser);

      expect(result.text).toContain("Page 1 content");
      expect(result.text).toContain("Page 2 content");
      expect(result.numPages).toBe(2);
    });

    it("should handle empty PDFs", async () => {
      const mockGetText = jest.fn<() => Promise<{ text: string; total: number }>>().mockResolvedValue({
        text: "",
        total: 0,
      });
      const mockGetInfo = jest.fn<() => Promise<{ info: Record<string, unknown>; metadata: Record<string, unknown> }>>().mockResolvedValue({
        info: {},
        metadata: {},
      });
      
      const MockParser = jest.fn().mockImplementation(() => ({
        getText: mockGetText,
        getInfo: mockGetInfo,
      })) as unknown as PDFParseConstructor;

      const pdfBuffer = Buffer.from("fake pdf content");
      const result = await extractPDFText(pdfBuffer, MockParser);

      expect(result.text).toBe("");
      expect(result.numPages).toBe(0);
    });

    it("should handle PDF parsing errors", async () => {
      const MockParser = jest.fn().mockImplementation(() => {
        throw new Error("Invalid PDF format");
      }) as unknown as PDFParseConstructor;

      const pdfBuffer = Buffer.from("invalid pdf content");
      
      await expect(extractPDFText(pdfBuffer, MockParser)).rejects.toThrow("Invalid PDF format");
    });

    it("should handle PDFs with special characters", async () => {
      const mockGetText = jest.fn<() => Promise<{ text: string; total: number }>>().mockResolvedValue({
        text: "Text with special chars: ©®™€£¥",
        total: 1,
      });
      const mockGetInfo = jest.fn<() => Promise<{ info: Record<string, unknown>; metadata: Record<string, unknown> }>>().mockResolvedValue({
        info: {},
        metadata: {},
      });
      
      const MockParser = jest.fn().mockImplementation(() => ({
        getText: mockGetText,
        getInfo: mockGetInfo,
      })) as unknown as PDFParseConstructor;

      const pdfBuffer = Buffer.from("fake pdf content");
      const result = await extractPDFText(pdfBuffer, MockParser);

      expect(result.text).toContain("©®™€£¥");
    });
  });
});
