/**
 * Tests for useTimer hook
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTimer } from "../../hooks/useTimer";

describe("useTimer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should initialize with zero elapsed time", () => {
    const { result } = renderHook(() => useTimer(false));

    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.formattedTime).toBe("0s");
    expect(result.current.showCounter).toBe(false);
  });

  it("should start counting when isActive is true", () => {
    const { result } = renderHook(() => useTimer(true));

    expect(result.current.elapsedSeconds).toBe(0);

    // Advance time by 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedSeconds).toBe(3);
    expect(result.current.formattedTime).toBe("3s");
    expect(result.current.showCounter).toBe(false);
  });

  it("should show counter after 5 seconds", () => {
    const { result } = renderHook(() => useTimer(true));

    // Advance time by 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.elapsedSeconds).toBe(5);
    expect(result.current.showCounter).toBe(true);
  });

  it("should format time with minutes for longer durations", () => {
    const { result } = renderHook(() => useTimer(true));

    // Advance time by 75 seconds (1m 15s)
    act(() => {
      jest.advanceTimersByTime(75000);
    });

    expect(result.current.elapsedSeconds).toBe(75);
    expect(result.current.formattedTime).toBe("1m 15s");
  });

  it("should reset when isActive becomes false", () => {
    const { result, rerender } = renderHook(
      ({ isActive }) => useTimer(isActive),
      { initialProps: { isActive: true } }
    );

    // Advance time by 10 seconds
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(result.current.elapsedSeconds).toBe(10);

    // Set isActive to false
    rerender({ isActive: false });

    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.showCounter).toBe(false);
  });

  it("should restart when isActive toggles back to true", () => {
    const { result, rerender } = renderHook(
      ({ isActive }) => useTimer(isActive),
      { initialProps: { isActive: true } }
    );

    // Advance time by 10 seconds
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(result.current.elapsedSeconds).toBe(10);

    // Toggle off then on
    rerender({ isActive: false });
    rerender({ isActive: true });

    // Should have reset
    expect(result.current.elapsedSeconds).toBe(0);

    // Start counting again
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedSeconds).toBe(3);
  });

  it("should clean up interval on unmount", () => {
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const { unmount } = renderHook(() => useTimer(true));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});

