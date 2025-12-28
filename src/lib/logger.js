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
    transport: env.NODE_ENV === "development"
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
export function createChildLogger(context) {
    return logger.child(context);
}
/**
 * Helper to log tRPC errors with full context
 */
export function logTRPCError(error, context) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error({
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
    }, `tRPC error on ${context.path ?? "<no-path>"}`);
}
/**
 * Helper to log service errors with full context
 * Enhanced for AI-first diagnosis with comprehensive error information
 */
export function logServiceError(error, service, context) {
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
        errorCause: errorObj.cause,
        // Additional context
        ...context,
        // Environment context
        nodeEnv: process.env.NODE_ENV,
        // Request context if available
        ...(context?.requestId ? { requestId: context.requestId } : {}),
        ...(context?.path ? { path: context.path } : {}),
        ...(context?.method ? { method: context.method } : {}),
    };
    logger.error(errorContext, `Error in ${service}: ${errorObj.message}`);
}
//# sourceMappingURL=logger.js.map