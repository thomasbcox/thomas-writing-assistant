/**
 * Reusable error handling hook for React components
 * Provides consistent error handling with retry functionality and user-friendly messages
 * Last Updated: 2025-12-11
 */

import { useCallback, useState } from "react";
import { translateError, getRecoverySuggestion } from "~/lib/error-messages";
import type { ToastType } from "~/components/ui/Toast";

export interface ErrorContext {
  operation?: string;
  resource?: string;
  details?: string;
}

export interface ErrorHandlerOptions {
  context?: ErrorContext;
  recovery?: () => void | Promise<void>;
  userMessage?: string;
  showRetry?: boolean;
  onError?: (error: unknown) => void;
}

export interface ErrorState {
  error: string | null;
  recovery: (() => void | Promise<void>) | null;
  recoverySuggestion: string | null;
  showRetry: boolean;
}

/**
 * Hook for consistent error handling across components
 * 
 * @example
 * ```tsx
 * const { handleError, showError, errorState, clearError } = useErrorHandler();
 * 
 * try {
 *   await mutation.mutateAsync(data);
 * } catch (error) {
 *   handleError(error, {
 *     context: { operation: "create capsule" },
 *     recovery: () => refetch(),
 *     userMessage: "Couldn't create capsule. Please try again."
 *   });
 * }
 * ```
 */
export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    recovery: null,
    recoverySuggestion: null,
    showRetry: false,
  });

  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 10000); // 10 seconds for better UX
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Handle an error with translation and optional recovery
   */
  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}) => {
      const { context, recovery, userMessage, showRetry = false, onError } = options;

      // Translate error to user-friendly message
      const translatedMessage = userMessage || translateError(error, context);
      const recoverySuggestion = getRecoverySuggestion(error);

      // Set error state
      setErrorState({
        error: translatedMessage,
        recovery: recovery || null,
        recoverySuggestion,
        showRetry: showRetry || !!recovery,
      });

      // Show toast notification
      addToast(translatedMessage, "error");

      // Call custom error handler if provided
      if (onError) {
        onError(error);
      }
    },
    [addToast],
  );

  /**
   * Show a simple error message without full error handling
   */
  const showError = useCallback(
    (message: string, type: ToastType = "error") => {
      addToast(message, type);
    },
    [addToast],
  );

  /**
   * Show a success message
   */
  const showSuccess = useCallback(
    (message: string) => {
      addToast(message, "success");
    },
    [addToast],
  );

  /**
   * Show an info message
   */
  const showInfo = useCallback(
    (message: string) => {
      addToast(message, "info");
    },
    [addToast],
  );

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      recovery: null,
      recoverySuggestion: null,
      showRetry: false,
    });
  }, []);

  /**
   * Retry the last failed operation
   */
  const retry = useCallback(async () => {
    if (errorState.recovery) {
      clearError();
      try {
        await errorState.recovery();
      } catch (error) {
        handleError(error, {
          context: { operation: "retry" },
          recovery: errorState.recovery,
          showRetry: true,
        });
      }
    }
  }, [errorState.recovery, clearError, handleError]);

  return {
    handleError,
    showError,
    showSuccess,
    showInfo,
    errorState,
    clearError,
    retry,
    toasts,
    removeToast,
  };
}



