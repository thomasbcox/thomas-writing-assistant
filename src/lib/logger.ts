/**
 * Structured logger optimized for AI readability and analysis
 * 
 * Features:
 * - Pure JSON logs for easy AI parsing
 * - Full context (stack traces, input, path, etc.)
 * - Request correlation IDs for tracing
 * - Log levels: debug, info, warn, error
 * - Pretty printing in development, JSON in production
 * 
 * Note: In renderer/browser environments, falls back to console logging
 * since pino is a Node.js-only library.
 */

// Check if we're in a Node.js environment (main process, not renderer)
const isNodeEnvironment = typeof process !== "undefined" && process.env && (typeof (globalThis as any).window === "undefined");

let logger: any;

if (isNodeEnvironment) {
  // In Node.js (main process), use pino
  // Dynamic import with require for Node.js environments
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pino = require("pino");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { env } = require("~/env");
    
    logger = pino({
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
  } catch (error) {
    // Fallback to console if pino fails to load
    logger = createConsoleLogger();
  }
} else {
  // In browser/renderer, use console-based logger
  logger = createConsoleLogger();
}

// Console logger for browser/renderer environments
function createConsoleLogger() {
  return {
    debug: (obj: any, msg?: string) => {
      if (msg) {
        console.debug(`[DEBUG] ${msg}`, obj);
      } else {
        console.debug(obj);
      }
    },
    info: (obj: any, msg?: string) => {
      if (msg) {
        console.info(`[INFO] ${msg}`, obj);
      } else {
        console.info(obj);
      }
    },
    warn: (obj: any, msg?: string) => {
      if (msg) {
        console.warn(`[WARN] ${msg}`, obj);
      } else {
        console.warn(obj);
      }
    },
    error: (obj: any, msg?: string) => {
      if (msg) {
        console.error(`[ERROR] ${msg}`, obj);
      } else {
        console.error(obj);
      }
    },
    child: () => createConsoleLogger(),
  };
}

export { logger };

/**
 * Create a child logger with additional context
 * Useful for request-scoped logging with correlation IDs
 */
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Helper to log service errors with full context
 * Enhanced for AI-first diagnosis with comprehensive error information
 */
export function logServiceError(
  error: unknown,
  service: string,
  context?: Record<string, unknown>,
) {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  // Build comprehensive error context for AI diagnosis
  const errorContext = {
    err: errorObj,
    service,
    timestamp: new Date().toISOString(),
    // Error metadata
    errorType: errorObj.constructor.name,
    errorName: errorObj.name,
    errorMessage: errorObj.message,
    stack: errorObj.stack,
    // Error cause chain (for nested errors)
    errorCause: (errorObj as any).cause,
    // Additional context
    ...context,
    // Environment context (only in Node.js)
    ...(typeof process !== "undefined" && process.env ? { nodeEnv: process.env.NODE_ENV } : {}),
    // Request context if available
    ...(context?.requestId ? { requestId: context.requestId } : {}),
    ...(context?.path ? { path: context.path } : {}),
    ...(context?.method ? { method: context.method } : {}),
  };

  logger.error(
    errorContext,
    `Error in ${service}: ${errorObj.message}`,
  );
}

