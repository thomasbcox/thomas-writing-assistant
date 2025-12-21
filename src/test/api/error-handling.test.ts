/**
 * Tests for error handling in API routes
 * Tests various error scenarios and edge cases
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { NextRequest } from "next/server";

// Mock database
const mockDb = {
  concept: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  link: {
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  capsule: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock("~/server/db", () => ({
  db: mockDb,
}));

jest.mock("~/server/api/helpers", () => ({
  getDb: jest.fn(() => mockDb),
  handleApiError: jest.fn((error) => {
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ error: "Unknown error" }), { status: 500 });
  }),
  parseJsonBody: jest.fn(async (request) => {
    return await request.json();
  }),
}));

describe("API Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Database errors", () => {
    it("should handle database connection errors", async () => {
      const { GET } = await import("~/app/api/concepts/route");
      jest.mocked(mockDb.concept.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest("http://localhost/api/concepts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("should handle database query errors", async () => {
      const { POST } = await import("~/app/api/concepts/route");
      jest.mocked(mockDb.concept.create).mockRejectedValue(
        new Error("Unique constraint violation"),
      );

      const request = new NextRequest("http://localhost/api/concepts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          description: "Test",
          content: "Test",
          creator: "Test",
          source: "Test",
          year: "2024",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe("Validation errors", () => {
    it("should handle invalid JSON in request body", async () => {
      const { POST } = await import("~/app/api/concepts/route");
      const { parseJsonBody } = await import("~/server/api/helpers");
      jest.mocked(parseJsonBody).mockRejectedValue(new Error("Invalid JSON"));

      const request = new NextRequest("http://localhost/api/concepts", {
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle missing required fields", async () => {
      const { POST } = await import("~/app/api/concepts/route");

      const request = new NextRequest("http://localhost/api/concepts", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
          title: "",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.error).toBeDefined();
    });
  });

  describe("Not found errors", () => {
    it("should handle concept not found", async () => {
      const { GET } = await import("~/app/api/concepts/[id]/route");
      jest.mocked(mockDb.concept.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/concepts/non-existent");
      const response = await GET(request, { params: { id: "non-existent" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("not found");
    });
  });

  describe("Concurrent operation handling", () => {
    it("should handle concurrent create operations", async () => {
      const { POST } = await import("~/app/api/concepts/route");
      
      // Simulate concurrent requests
      const request1 = new NextRequest("http://localhost/api/concepts", {
        method: "POST",
        body: JSON.stringify({
          title: "Concept 1",
          description: "Test",
          content: "Test",
          creator: "Test",
          source: "Test",
          year: "2024",
        }),
      });

      const request2 = new NextRequest("http://localhost/api/concepts", {
        method: "POST",
        body: JSON.stringify({
          title: "Concept 2",
          description: "Test",
          content: "Test",
          creator: "Test",
          source: "Test",
          year: "2024",
        }),
      });

      jest.mocked(mockDb.concept.create)
        .mockResolvedValueOnce({ id: "1", title: "Concept 1" } as any)
        .mockResolvedValueOnce({ id: "2", title: "Concept 2" } as any);

      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2),
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });
  });

  describe("Edge cases", () => {
    it("should handle very long input strings", async () => {
      const { POST } = await import("~/app/api/concepts/route");
      const longContent = "x".repeat(100000);

      const request = new NextRequest("http://localhost/api/concepts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          description: "Test",
          content: longContent,
          creator: "Test",
          source: "Test",
          year: "2024",
        }),
      });

      jest.mocked(mockDb.concept.create).mockResolvedValue({
        id: "1",
        title: "Test",
        content: longContent,
      } as any);

      const response = await POST(request);
      expect(response.status).toBe(201);
    });

    it("should handle special characters in input", async () => {
      const { POST } = await import("~/app/api/concepts/route");
      const specialContent = "Test with special chars: <>&\"'";

      const request = new NextRequest("http://localhost/api/concepts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          description: "Test",
          content: specialContent,
          creator: "Test",
          source: "Test",
          year: "2024",
        }),
      });

      jest.mocked(mockDb.concept.create).mockResolvedValue({
        id: "1",
        content: specialContent,
      } as any);

      const response = await POST(request);
      expect(response.status).toBe(201);
    });

    it("should handle unicode characters", async () => {
      const { POST } = await import("~/app/api/concepts/route");
      const unicodeContent = "Test with unicode: 你好世界 🌍";

      const request = new NextRequest("http://localhost/api/concepts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          description: "Test",
          content: unicodeContent,
          creator: "Test",
          source: "Test",
          year: "2024",
        }),
      });

      jest.mocked(mockDb.concept.create).mockResolvedValue({
        id: "1",
        content: unicodeContent,
      } as any);

      const response = await POST(request);
      expect(response.status).toBe(201);
    });
  });
});
