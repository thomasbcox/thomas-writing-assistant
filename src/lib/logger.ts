import pino from "pino";
import { env } from "~/env";

/**
 * Structured logger optimized for AI readability and analysis
 * 
 * Features:
 * - Pure JSON logs for easy AI parsing
 * - Full context (stack traces, input, path, etc.)
 * - Request correlation IDs for tracing
 * - Log levels: debug, info, warn, error
 * - Pretty printing in development, JSON in production
 */
export const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  // Use pretty printing in development for human readability
  // Use JSON in production for AI parsing
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
            singleLine: false,
            hideObject: false,
          },
        }
      : {
          target: "pino/file",
          options: {
            destination: "./logs/app.log",
            mkdir: true,
          },
        },
  // Base logger context
  base: {
    env: env.NODE_ENV,
    app: "thomas-writing-assistant",
  },
  // Serialize error objects for full stack traces
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

/**
 * Create a child logger with additional context
 * Useful for request-scoped logging with correlation IDs
 */
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Helper to log tRPC errors with full context
 */
export function logTRPCError(
  error: unknown,
  context: {
    path?: string;
    type?: string;
    input?: unknown;
    requestId?: string;
  },
) {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  logger.error(
    {
      err: errorObj,
      path: context.path,
      type: context.type,
      input: context.input,
      requestId: context.requestId,
      // Include full stack trace
      stack: errorObj.stack,
      // Error metadata
      errorType: errorObj.constructor.name,
      errorMessage: errorObj.message,
    },
    `tRPC error on ${context.path ?? "<no-path>"}`,
  );
}

/**
 * Helper to log service errors with full context
 */
export function logServiceError(
  error: unknown,
  service: string,
  context?: Record<string, unknown>,
) {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  logger.error(
    {
      err: errorObj,
      service,
      ...context,
      stack: errorObj.stack,
      errorType: errorObj.constructor.name,
      errorMessage: errorObj.message,
    },
    `Error in ${service}`,
  );
}

