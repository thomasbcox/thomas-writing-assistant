/**
 * IPC Handler Wrapper
 * 
 * Provides centralized error handling for all IPC handlers:
 * - Consistent error logging via logServiceError
 * - Error sanitization for production (prevents stack trace leakage)
 * - Reduces boilerplate try/catch repetition
 */

import { logServiceError } from "../../src/lib/logger.js";

/**
 * Higher-order function that wraps IPC handlers with centralized error handling
 * 
 * @param handler - The IPC handler function to wrap
 * @param handlerName - Name of the handler for logging (e.g., "ai:getSettings")
 * @returns Wrapped handler function with error handling
 */
export function handleIpc<TArgs extends unknown[], TReturn>(
  handler: (event: Electron.IpcMainInvokeEvent, ...args: TArgs) => Promise<TReturn>,
  handlerName: string,
): (event: Electron.IpcMainInvokeEvent, ...args: TArgs) => Promise<TReturn> {
  return async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      // Centralized logging with full context
      logServiceError(error, handlerName, {
        args: args.length > 0 ? args : undefined,
      });
      
      // Sanitize error for UI (don't leak stack traces in production)
      if (error instanceof Error) {
        // In production, only send message; in dev, include more context
        const isDev = process.env.NODE_ENV === "development";
        if (isDev) {
          throw error; // Full error in development
        } else {
          throw new Error(error.message); // Sanitized in production
        }
      }
      throw new Error("Unknown internal error");
    }
  };
}
