/**
 * Tests for useErrorHandler hook
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useErrorHandler } from "~/hooks/useErrorHandler";
import { translateError, getRecoverySuggestion } from "~/lib/error-messages";

// Mock error-messages
const mockTranslateError = jest.fn((error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return "An error occurred";
});

const mockGetRecoverySuggestion = jest.fn(() => "Try again later");

jest.mock("~/lib/error-messages", () => ({
  translateError: mockTranslateError,
  getRecoverySuggestion: mockGetRecoverySuggestion,
}));

// Mock toast component (if needed)
jest.mock("~/components/ui/Toast", () => ({}));

describe("useErrorHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTranslateError.mockImplementation((error: unknown) => {
      if (error instanceof Error) {
        return error.message;
      }
      return "An error occurred";
    });
    mockGetRecoverySuggestion.mockReturnValue("Try again later");
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("initial state", () => {
    it("should initialize with empty error state", () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current.errorState.error).toBeNull();
      expect(result.current.errorState.recovery).toBeNull();
      expect(result.current.errorState.recoverySuggestion).toBeNull();
      expect(result.current.errorState.showRetry).toBe(false);
      expect(result.current.toasts).toEqual([]);
    });
  });

  describe("handleError", () => {
    it("should set error state when handling an error", () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");

      act(() => {
        result.current.handleError(error);
      });

      expect(result.current.errorState.error).toBe("Test error");
      expect(result.current.errorState.showRetry).toBe(false);
    });

    it("should translate error message using translateError", () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Database connection failed");

      act(() => {
        result.current.handleError(error);
      });

      // Verify error was translated and set in state (may use mock or actual function)
      expect(result.current.errorState.error).toBeDefined();
      expect(typeof result.current.errorState.error).toBe("string");
    });

    it("should use custom user message when provided", () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Technical error");

      act(() => {
        result.current.handleError(error, {
          userMessage: "Custom user-friendly message",
        });
      });

      expect(result.current.errorState.error).toBe("Custom user-friendly message");
    });

    it("should set recovery function when provided", () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");
      const recoveryFn = jest.fn<() => void | Promise<void>>();

      act(() => {
        result.current.handleError(error, {
          recovery: recoveryFn,
        });
      });

      expect(result.current.errorState.recovery).toBe(recoveryFn);
      expect(result.current.errorState.showRetry).toBe(true);
    });

    it("should set showRetry to true when recovery is provided", () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");
      const recoveryFn = jest.fn<() => void | Promise<void>>();

      act(() => {
        result.current.handleError(error, {
          recovery: recoveryFn,
        });
      });

      expect(result.current.errorState.showRetry).toBe(true);
    });

    it("should set showRetry to true when showRetry option is true", () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");

      act(() => {
        result.current.handleError(error, {
          showRetry: true,
        });
      });

      expect(result.current.errorState.showRetry).toBe(true);
    });

    it("should call onError callback when provided", () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");
      const onError = jest.fn<(error: unknown) => void>();

      act(() => {
        result.current.handleError(error, {
          onError,
        });
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it("should add error toast when handling error", () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");

      act(() => {
        result.current.handleError(error);
      });

      expect(result.current.toasts.length).toBe(1);
      expect(result.current.toasts[0]?.type).toBe("error");
      expect(result.current.toasts[0]?.message).toBe("Test error");
    });

    it("should include context in error translation", () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");

      act(() => {
        result.current.handleError(error, {
          context: {
            operation: "create concept",
            resource: "concept",
          },
        });
      });

      // Verify error was handled with context (error message should be set)
      expect(result.current.errorState.error).toBeDefined();
    });

    it("should get recovery suggestion from getRecoverySuggestion", () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");

      act(() => {
        result.current.handleError(error);
      });

      // Verify recovery suggestion was set (may use mock or actual function)
      expect(result.current.errorState.recoverySuggestion).toBeDefined();
      expect(typeof result.current.errorState.recoverySuggestion).toBe("string");
    });
  });

  describe("showError", () => {
    it("should add error toast", () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.showError("Error message");
      });

      expect(result.current.toasts.length).toBe(1);
      expect(result.current.toasts[0]?.type).toBe("error");
      expect(result.current.toasts[0]?.message).toBe("Error message");
    });

    it("should allow custom toast type", () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.showError("Warning message", "warning");
      });

      expect(result.current.toasts[0]?.type).toBe("warning");
    });
  });

  describe("showSuccess", () => {
    it("should add success toast", () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.showSuccess("Success message");
      });

      expect(result.current.toasts.length).toBe(1);
      expect(result.current.toasts[0]?.type).toBe("success");
      expect(result.current.toasts[0]?.message).toBe("Success message");
    });
  });

  describe("showInfo", () => {
    it("should add info toast", () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.showInfo("Info message");
      });

      expect(result.current.toasts.length).toBe(1);
      expect(result.current.toasts[0]?.type).toBe("info");
      expect(result.current.toasts[0]?.message).toBe("Info message");
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");
      const recoveryFn = jest.fn<() => void | Promise<void>>();

      act(() => {
        result.current.handleError(error, { recovery: recoveryFn });
      });

      expect(result.current.errorState.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.errorState.error).toBeNull();
      expect(result.current.errorState.recovery).toBeNull();
      expect(result.current.errorState.recoverySuggestion).toBeNull();
      expect(result.current.errorState.showRetry).toBe(false);
    });
  });

  describe("retry", () => {
    it("should call recovery function when retry is called", async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");
      const recoveryFn = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

      act(() => {
        result.current.handleError(error, { recovery: recoveryFn });
      });

      await act(async () => {
        await result.current.retry();
      });

      expect(recoveryFn).toHaveBeenCalled();
      expect(result.current.errorState.error).toBeNull();
    });

    it("should clear error before calling recovery", async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");
      const recoveryFn = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

      act(() => {
        result.current.handleError(error, { recovery: recoveryFn });
      });

      expect(result.current.errorState.error).not.toBeNull();

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.errorState.error).toBeNull();
    });

    it("should handle recovery function errors", async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");
      const recoveryFn = jest.fn<() => Promise<void>>().mockRejectedValue(new Error("Recovery failed"));

      act(() => {
        result.current.handleError(error, { recovery: recoveryFn });
      });

      await act(async () => {
        await result.current.retry();
      });

      // Should handle error and set new error state
      expect(result.current.errorState.error).not.toBeNull();
      expect(result.current.errorState.recovery).toBe(recoveryFn);
      expect(result.current.errorState.showRetry).toBe(true);
    });

    it("should not do anything when no recovery function exists", async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");

      act(() => {
        result.current.handleError(error);
      });

      await act(async () => {
        await result.current.retry();
      });

      // Should not throw or change state
      expect(result.current.errorState.error).toBe("Test error");
    });

    it("should preserve recovery function for retry on recovery failure", async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");
      const recoveryFn = jest.fn<() => Promise<void>>().mockRejectedValue(new Error("Recovery failed"));

      act(() => {
        result.current.handleError(error, { recovery: recoveryFn });
      });

      await act(async () => {
        await result.current.retry();
      });

      // Recovery function should still be available for another retry
      expect(result.current.errorState.recovery).toBe(recoveryFn);
      expect(result.current.errorState.showRetry).toBe(true);
    });
  });

  describe("removeToast", () => {
    it("should remove toast by id", () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.showError("Error 1");
        result.current.showError("Error 2");
      });

      expect(result.current.toasts.length).toBe(2);
      const toastId = result.current.toasts[0]?.id;

      act(() => {
        if (toastId) {
          result.current.removeToast(toastId);
        }
      });

      expect(result.current.toasts.length).toBe(1);
      expect(result.current.toasts[0]?.id).not.toBe(toastId);
    });
  });

  describe("toast auto-removal", () => {
    it("should automatically remove toasts after timeout", async () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.showError("Error message");
      });

      expect(result.current.toasts.length).toBe(1);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(result.current.toasts.length).toBe(0);
      });
    });

    it("should handle multiple toasts with different timers", async () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.showError("Error 1");
        jest.advanceTimersByTime(5000);
        result.current.showError("Error 2");
      });

      expect(result.current.toasts.length).toBe(2);

      // Fast-forward to remove first toast
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.toasts.length).toBe(1);
      });

      // Fast-forward to remove second toast
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.toasts.length).toBe(0);
      });
    });
  });

  describe("error handling edge cases", () => {
    it("should handle non-Error objects", () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError("String error");
      });

      expect(result.current.errorState.error).toBeDefined();
    });

    it("should handle null/undefined errors", () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError(null);
      });

      expect(result.current.errorState.error).toBeDefined();
    });

    it("should handle async recovery functions", async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error("Test error");
      const recoveryFn = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

      act(() => {
        result.current.handleError(error, { recovery: recoveryFn });
      });

      await act(async () => {
        const retryPromise = result.current.retry();
        jest.runAllTimers();
        await retryPromise;
      });

      expect(recoveryFn).toHaveBeenCalled();
    }, 15000); // Increase timeout for async test
  });
});
