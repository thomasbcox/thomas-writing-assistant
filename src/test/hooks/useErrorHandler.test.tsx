/**
 * Tests for useErrorHandler hook
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { useErrorHandler } from "~/hooks/useErrorHandler";

// Note: In ESM mode, jest.mock doesn't work the same way, so we test with actual behavior

describe("useErrorHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should initialize with clean state", () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.errorState.error).toBeNull();
    expect(result.current.errorState.recovery).toBeNull();
    expect(result.current.errorState.recoverySuggestion).toBeNull();
    expect(result.current.errorState.showRetry).toBe(false);
    expect(result.current.toasts).toEqual([]);
  });

  it("should handle error and set error state", () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error("Test error"), {
        context: { operation: "test operation" },
      });
    });

    // The actual translateError uses "Unable to {operation}. {message}" format
    expect(result.current.errorState.error).toBe("Unable to test operation. Test error");
    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].type).toBe("error");
  });

  it("should use custom user message when provided", () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error("Technical error"), {
        userMessage: "Something went wrong, please try again",
      });
    });

    expect(result.current.errorState.error).toBe("Something went wrong, please try again");
  });

  it("should set recovery function when provided", () => {
    const mockRecovery = jest.fn();
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error("Test error"), {
        recovery: mockRecovery,
      });
    });

    expect(result.current.errorState.recovery).toBe(mockRecovery);
    expect(result.current.errorState.showRetry).toBe(true);
  });

  it("should clear error state", () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error("Test error"));
    });

    expect(result.current.errorState.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.errorState.error).toBeNull();
    expect(result.current.errorState.recovery).toBeNull();
    expect(result.current.errorState.showRetry).toBe(false);
  });

  it("should show success message", () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.showSuccess("Operation completed successfully");
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].message).toBe("Operation completed successfully");
    expect(result.current.toasts[0].type).toBe("success");
  });

  it("should show info message", () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.showInfo("Here's some information");
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].message).toBe("Here's some information");
    expect(result.current.toasts[0].type).toBe("info");
  });

  it("should show error message via showError", () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.showError("Something went wrong");
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].message).toBe("Something went wrong");
    expect(result.current.toasts[0].type).toBe("error");
  });

  it("should remove toast by id", () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.showError("Error 1");
      result.current.showError("Error 2");
    });

    expect(result.current.toasts.length).toBe(2);

    const toastId = result.current.toasts[0].id;
    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts.length).toBe(1);
  });

  it("should auto-remove toast after timeout", () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.showError("This will disappear");
    });

    expect(result.current.toasts.length).toBe(1);

    // Fast-forward 10 seconds
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(result.current.toasts.length).toBe(0);
  });

  it("should call onError callback when provided", () => {
    const onErrorCallback = jest.fn();
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error("Test error");

    act(() => {
      result.current.handleError(testError, {
        onError: onErrorCallback,
      });
    });

    expect(onErrorCallback).toHaveBeenCalledWith(testError);
  });

  it("should execute retry and clear error on success", async () => {
    const mockRecovery = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error("Test error"), {
        recovery: mockRecovery,
      });
    });

    expect(result.current.errorState.error).not.toBeNull();

    await act(async () => {
      await result.current.retry();
    });

    expect(mockRecovery).toHaveBeenCalled();
    expect(result.current.errorState.error).toBeNull();
  });
});
