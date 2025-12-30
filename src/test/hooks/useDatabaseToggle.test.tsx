/**
 * Tests for useDatabaseToggle hook
 * 
 * Note: This hook is largely stubbed in Electron apps - it shows a toast
 * message informing users that database toggle is not available.
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDatabaseToggle } from "~/hooks/useDatabaseToggle";

describe("useDatabaseToggle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useDatabaseToggle());

    expect(result.current.currentDatabase).toBe("dev");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isProd).toBe(false);
    expect(typeof result.current.toggleDatabase).toBe("function");
  });

  it("should use external toast when provided", async () => {
    const externalAddToast = jest.fn();
    const externalToast = { addToast: externalAddToast };

    const { result } = renderHook(() => useDatabaseToggle(externalToast));

    await act(async () => {
      await result.current.toggleDatabase();
    });

    expect(externalAddToast).toHaveBeenCalledWith(
      "Database toggle is not available in Electron app. Use NODE_ENV to switch databases.",
      "info"
    );
  });

  it("should return consistent isProd based on currentDatabase", () => {
    const { result } = renderHook(() => useDatabaseToggle());

    // Default is "dev", so isProd should be false
    expect(result.current.isProd).toBe(false);
    expect(result.current.currentDatabase).toBe("dev");
  });

  it("should have all expected properties in return value", () => {
    const { result } = renderHook(() => useDatabaseToggle());

    expect(result.current).toHaveProperty("currentDatabase");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("toggleDatabase");
    expect(result.current).toHaveProperty("isProd");
  });

  it("should always show dev database in Electron context", () => {
    const { result } = renderHook(() => useDatabaseToggle());

    // In Electron, the hook always shows "dev" as the current database
    // (actual database is determined by NODE_ENV in main process)
    expect(result.current.currentDatabase).toBe("dev");
  });
});
