/**
 * Error message translation utilities
 * Translates technical errors to user-friendly, actionable messages
 * Last Updated: 2025-12-11
 */

export interface ErrorContext {
  operation?: string;
  resource?: string;
  details?: string;
}

/**
 * Translate technical error messages to user-friendly ones
 */
export function translateError(error: unknown, context?: ErrorContext): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // LLM/API errors
  if (lowerMessage.includes("model not found") || lowerMessage.includes("404") || lowerMessage.includes("is not found")) {
    return "The AI model is temporarily unavailable. We're trying an alternative model. If this persists, check your API key in Settings.";
  }

  if (lowerMessage.includes("api key") || lowerMessage.includes("authentication") || lowerMessage.includes("unauthorized")) {
    return "API key issue detected. Please check your API key in Settings and ensure it's valid.";
  }

  if (lowerMessage.includes("rate limit") || lowerMessage.includes("quota")) {
    return "API rate limit reached. Please wait a moment and try again, or check your API usage limits.";
  }

  if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
    return "Request timed out. The AI service may be slow. Please try again in a moment.";
  }

  // PDF errors
  if (lowerMessage.includes("pdf") && (lowerMessage.includes("extract") || lowerMessage.includes("parse"))) {
    return "Unable to extract text from PDF. Please ensure the PDF is not password-protected and contains readable text.";
  }

  if (lowerMessage.includes("pdf") && lowerMessage.includes("file")) {
    return "PDF file error. Please ensure you've selected a valid PDF file.";
  }

  // Config errors
  if (lowerMessage.includes("yaml") || lowerMessage.includes("invalid yaml")) {
    return "Invalid YAML format. Please check your configuration syntax and try again.";
  }

  if (lowerMessage.includes("config") && lowerMessage.includes("not found")) {
    return "Configuration file not found. The system will use default settings.";
  }

  // Database errors
  if (lowerMessage.includes("database") || lowerMessage.includes("prisma")) {
    return "Database error occurred. Please try again. If the problem persists, check your database connection.";
  }

  // Network errors
  if (lowerMessage.includes("network") || lowerMessage.includes("fetch") || lowerMessage.includes("connection")) {
    return "Network error. Please check your internet connection and try again.";
  }

  // Generic fallback - use context if available
  if (context?.operation) {
    return `Unable to ${context.operation}. ${errorMessage}`;
  }

  // Final fallback
  if (!errorMessage || errorMessage === "null" || errorMessage === "undefined") {
    return "An unexpected error occurred. Please try again.";
  }
  return errorMessage;
}

/**
 * Get recovery suggestions for common errors
 */
export function getRecoverySuggestion(error: unknown): string | null {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes("api key") || lowerMessage.includes("authentication")) {
    return "Go to Settings to update your API key";
  }

  if (lowerMessage.includes("model not found") || lowerMessage.includes("404")) {
    return "The system will automatically try alternative models";
  }

  if (lowerMessage.includes("rate limit") || lowerMessage.includes("quota")) {
    return "Wait a few minutes before trying again";
  }

  if (lowerMessage.includes("pdf") && lowerMessage.includes("extract")) {
    return "Try a different PDF file or ensure it's not corrupted";
  }

  return null;
}

