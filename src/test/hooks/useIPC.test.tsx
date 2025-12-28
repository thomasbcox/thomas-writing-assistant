/**
 * Tests for IPC React hooks
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { useIPCQuery, useIPCMutation } from "~/hooks/useIPC";

// Mock IPC client
jest.mock("~/lib/ipc-client", () => ({
  ipc: {
    concept: {
      list: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe("useIPCQuery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch data on mount", async () => {
    const { ipc } = jest.requireMock("~/lib/ipc-client");
    const mockData = [{ id: "1", title: "Test" }];
    ipc.concept.list.mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useIPCQuery(() => ipc.concept.list({ includeTrash: false })),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("should handle errors", async () => {
    const { ipc } = jest.requireMock("~/lib/ipc-client");
    const error = new Error("Test error");
    ipc.concept.list.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useIPCQuery(() => ipc.concept.list({ includeTrash: false })),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.data).toBeNull();
  });

  it("should not fetch when enabled is false", () => {
    const { ipc } = jest.requireMock("~/lib/ipc-client");

    renderHook(() =>
      useIPCQuery(() => ipc.concept.list({ includeTrash: false }), { enabled: false }),
    );

    expect(ipc.concept.list).not.toHaveBeenCalled();
  });

  it("should refetch when refetch is called", async () => {
    const { ipc } = jest.requireMock("~/lib/ipc-client");
    const mockData = [{ id: "1", title: "Test" }];
    ipc.concept.list.mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useIPCQuery(() => ipc.concept.list({ includeTrash: false })),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(ipc.concept.list).toHaveBeenCalledTimes(1);

    await result.current.refetch?.();

    await waitFor(() => {
      expect(ipc.concept.list).toHaveBeenCalledTimes(2);
    });
  });
});

describe("useIPCMutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should execute mutation", async () => {
    const { ipc } = jest.requireMock("~/lib/ipc-client");
    const mockData = { id: "1", title: "New Concept" };
    ipc.concept.create.mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useIPCMutation(ipc.concept.create),
    );

    expect(result.current.isLoading).toBe(false);

    result.current.mutate({
      title: "New Concept",
      content: "Content",
      creator: "Creator",
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(ipc.concept.create).toHaveBeenCalledWith({
      title: "New Concept",
      content: "Content",
      creator: "Creator",
    });
  });

  it("should handle mutation errors", async () => {
    const { ipc } = jest.requireMock("~/lib/ipc-client");
    const error = new Error("Test error");
    ipc.concept.create.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useIPCMutation(ipc.concept.create),
    );

    result.current.mutate({
      title: "New Concept",
      content: "Content",
      creator: "Creator",
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(error);
  });

  it("should call onSuccess callback", async () => {
    const { ipc } = jest.requireMock("~/lib/ipc-client");
    const mockData = { id: "1", title: "New Concept" };
    const onSuccess = jest.fn();
    ipc.concept.create.mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useIPCMutation(ipc.concept.create, { onSuccess }),
    );

    result.current.mutate({
      title: "New Concept",
      content: "Content",
      creator: "Creator",
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });
  });

  it("should call onError callback", async () => {
    const { ipc } = jest.requireMock("~/lib/ipc-client");
    const error = new Error("Test error");
    const onError = jest.fn();
    ipc.concept.create.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useIPCMutation(ipc.concept.create, { onError }),
    );

    result.current.mutate({
      title: "New Concept",
      content: "Content",
      creator: "Creator",
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it("should support mutateAsync", async () => {
    const { ipc } = jest.requireMock("~/lib/ipc-client");
    const mockData = { id: "1", title: "New Concept" };
    ipc.concept.create.mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useIPCMutation(ipc.concept.create),
    );

    const promise = result.current.mutateAsync({
      title: "New Concept",
      content: "Content",
      creator: "Creator",
    });

    const data = await promise;
    expect(data).toEqual(mockData);
  });
});

