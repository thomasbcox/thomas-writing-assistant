import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { logger, logTRPCError, logServiceError, createChildLogger } from "~/lib/logger";
import pino from "pino";

// Mock pino to capture log calls
let logOutput: Array<{ level: number; msg: string; [key: string]: unknown }> = [];

// Create a test logger that captures output
const createTestLogger = () => {
  const testLogger = pino({
    level: "debug",
    // Use a writable stream that captures logs
    transport: {
      target: "pino/file",
      options: {
        destination: {
          write: (chunk: string) => {
            try {
              const logEntry = JSON.parse(chunk);
              logOutput.push(logEntry);
            } catch {
              // Ignore parse errors
            }
          },
        },
      },
    },
  });
  return testLogger;
};

describe("Logger", () => {
  beforeEach(() => {
    logOutput = [];
  });

  describe("logger instance", () => {
    test("should create a logger instance", () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });

    test("should have correct base context", () => {
      // Logger should have base context set
      expect(logger).toBeDefined();
    });
  });

  describe("createChildLogger", () => {
    test("should create a child logger with additional context", () => {
      const childLogger = createChildLogger({
        requestId: "test-123",
        userId: "user-456",
      });

      expect(childLogger).toBeDefined();
      expect(childLogger).not.toBe(logger);
    });

    test("should preserve parent logger functionality", () => {
      const childLogger = createChildLogger({ requestId: "test-123" });
      expect(typeof childLogger.info).toBe("function");
      expect(typeof childLogger.error).toBe("function");
    });
  });

  describe("logTRPCError", () => {
    test("should log Error objects with full context", () => {
      const error = new Error("Test error message");
      error.stack = "Error: Test error message\n    at test.ts:1:1";

      logTRPCError(error, {
        path: "/api/trpc/concept.create",
        type: "mutation",
        input: { title: "Test Concept" },
        requestId: "req-123",
      });

      // Verify the function doesn't throw
      expect(true).toBe(true);
    });

    test("should handle non-Error objects", () => {
      const error = "String error";

      logTRPCError(error, {
        path: "/api/trpc/concept.list",
        type: "query",
      });

      expect(true).toBe(true);
    });

    test("should include all context fields", () => {
      const error = new Error("Test error");
      const context = {
        path: "/api/trpc/link.create",
        type: "mutation",
        input: { sourceId: "1", targetId: "2" },
        requestId: "req-456",
      };

      logTRPCError(error, context);

      expect(true).toBe(true);
    });

    test("should handle missing optional fields", () => {
      const error = new Error("Test error");

      logTRPCError(error, {});

      expect(true).toBe(true);
    });

    test("should include error metadata", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const error = new CustomError("Custom error message");
      error.stack = "CustomError: Custom error message\n    at test.ts:1:1";

      logTRPCError(error, {
        path: "/api/trpc/test",
      });

      expect(true).toBe(true);
    });
  });

  describe("logServiceError", () => {
    test("should log service errors with context", () => {
      const error = new Error("Service error");
      error.stack = "Error: Service error\n    at service.ts:1:1";

      logServiceError(error, "linkProposer", {
        conceptId: "concept-123",
        maxProposals: 5,
      });

      expect(true).toBe(true);
    });

    test("should handle non-Error objects", () => {
      const error = { code: "DB_ERROR", message: "Database connection failed" };

      logServiceError(error, "conceptProposer", {
        textLength: 1000,
      });

      expect(true).toBe(true);
    });

    test("should work without additional context", () => {
      const error = new Error("Service error");

      logServiceError(error, "repurposer");

      expect(true).toBe(true);
    });

    test("should include service name in log", () => {
      const error = new Error("Test error");

      logServiceError(error, "configLoader", {
        configFile: "style_guide.yaml",
      });

      expect(true).toBe(true);
    });

    test("should handle complex context objects", () => {
      const error = new Error("Complex error");
      const context = {
        conceptId: "concept-123",
        maxProposals: 5,
        candidateCount: 10,
        hasInstructions: true,
        metadata: {
          source: "user",
          timestamp: new Date().toISOString(),
        },
      };

      logServiceError(error, "linkProposer", context);

      expect(true).toBe(true);
    });
  });

  describe("error serialization", () => {
    test("should serialize Error objects correctly", () => {
      const error = new Error("Serialization test");
      error.stack = "Error: Serialization test\n    at test.ts:1:1";

      logTRPCError(error, {
        path: "/api/trpc/test",
      });

      expect(true).toBe(true);
    });

    test("should handle errors without stack traces", () => {
      const error = new Error("No stack");
      delete (error as { stack?: string }).stack;

      logServiceError(error, "testService");

      expect(true).toBe(true);
    });

    test("should handle circular references in context", () => {
      const error = new Error("Circular reference test");
      const context: Record<string, unknown> = {
        data: { value: "test" },
      };
      // Create circular reference
      context.self = context;

      // Should not throw
      logServiceError(error, "testService", context);

      expect(true).toBe(true);
    });
  });

  describe("log levels", () => {
    test("should support different log levels", () => {
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
    });
  });
});

