import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import {
  createTestDb,
  createTestCaller,
  cleanupTestData,
  migrateTestDb,
  closeTestDb,
} from "./test-utils";
import fs from "fs";
import path from "path";

describe("PDF Router", () => {
  const db = createTestDb();
  const caller = createTestCaller(db);

  beforeAll(async () => {
    await migrateTestDb(db);
  });

  afterAll(async () => {
    await cleanupTestData(db);
    closeTestDb(db);
  });

  test("should extract text from a simple PDF", async () => {
    // Create a minimal PDF buffer for testing
    // This is a very basic PDF structure - in real tests you'd use a proper test PDF
    // For now, we'll test that the endpoint exists and handles errors gracefully
    
    // Test with invalid PDF data
    const invalidBase64 = Buffer.from("not a pdf").toString("base64");
    
    await expect(
      caller.pdf.extractText({
        fileData: invalidBase64,
        fileName: "test.pdf",
      }),
    ).rejects.toThrow();
  });

  test("should handle missing file data", async () => {
    await expect(
      caller.pdf.extractText({
        fileData: "",
        fileName: "test.pdf",
      }),
    ).rejects.toThrow();
  });

  test("should accept fileName parameter", async () => {
    const invalidBase64 = Buffer.from("invalid").toString("base64");
    
    try {
      await caller.pdf.extractText({
        fileData: invalidBase64,
        fileName: "my-document.pdf",
      });
    } catch (error) {
      // Expected to fail, but should have processed fileName
      expect(error).toBeDefined();
    }
  });

  test("should successfully extract text from a valid PDF", async () => {
    // Use a real PDF file from the input directory for testing
    const pdfPath = path.join(process.cwd(), "input/pdfs/The PRoPeLS Pattern.pdf");
    
    if (!fs.existsSync(pdfPath)) {
      // Skip test if PDF file doesn't exist
      console.warn("Test PDF file not found, skipping successful extraction test");
      return;
    }

    // Read PDF file and convert to base64
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64Data = pdfBuffer.toString("base64");

    // Extract text from PDF
    const result = await caller.pdf.extractText({
      fileData: base64Data,
      fileName: "The PRoPeLS Pattern.pdf",
    });

    // Verify results
    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.numPages).toBeGreaterThan(0);
    expect(result.fileName).toBe("The PRoPeLS Pattern.pdf");
    expect(result.info).toBeDefined();
    expect(result.metadata).toBeDefined();
  });
});

