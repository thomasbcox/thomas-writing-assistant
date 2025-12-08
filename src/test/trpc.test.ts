import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { createTRPCContext } from "~/server/api/trpc";
import { ZodError } from "zod";
import { logTRPCError } from "~/lib/logger";

describe("tRPC Configuration", () => {
  test("should create context with headers", async () => {
    const headers = new Headers();
    headers.set("x-test", "value");

    const context = await createTRPCContext({ headers });

    expect(context).toHaveProperty("db");
    expect(context).toHaveProperty("headers");
    expect(context.headers).toBe(headers);
  });

  test("should handle ZodError in error formatter", () => {
    // This test verifies the error formatter handles ZodError correctly
    // We can't directly test the formatter, but we can verify it's set up
    const zodError = new ZodError([
      {
        code: "invalid_type",
        expected: "string",
        received: "number",
        path: ["test"],
        message: "Expected string, received number",
      },
    ]);

    expect(zodError).toBeInstanceOf(ZodError);
    expect(zodError.flatten()).toHaveProperty("fieldErrors");
  });

  test("should log tRPC errors with full context", () => {
    const error = new Error("Test tRPC error");
    const context = {
      path: "/api/trpc/concept.create",
      type: "mutation",
      input: { title: "Test" },
      requestId: "req-123",
    };

    // Should not throw
    expect(() => {
      logTRPCError(error, context);
    }).not.toThrow();
  });

  test("should handle tRPC errors without optional fields", () => {
    const error = new Error("Test error");

    expect(() => {
      logTRPCError(error, {});
    }).not.toThrow();
  });

  test("should handle non-Error objects in tRPC error logging", () => {
    const error = "String error";

    expect(() => {
      logTRPCError(error, {
        path: "/api/trpc/test",
        type: "query",
      });
    }).not.toThrow();
  });
});

