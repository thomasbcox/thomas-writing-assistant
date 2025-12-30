/**
 * Comprehensive tests for Toast components and useToast hook
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { renderHook } from "@testing-library/react";
import { Toast, ToastContainer, useToast } from "~/components/ui/Toast";

describe("Toast component", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render message", () => {
    const onClose = jest.fn();
    render(<Toast message="Test message" type="info" onClose={onClose} />);
    
    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  it("should render close button", () => {
    const onClose = jest.fn();
    render(<Toast message="Test" type="info" onClose={onClose} />);
    
    const closeButton = screen.getByRole("button");
    expect(closeButton).toBeInTheDocument();
  });

  it("should call onClose when close button clicked", () => {
    const onClose = jest.fn();
    render(<Toast message="Test" type="info" onClose={onClose} />);
    
    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should auto-close after duration", () => {
    const onClose = jest.fn();
    render(<Toast message="Test" type="info" duration={3000} onClose={onClose} />);
    
    expect(onClose).not.toHaveBeenCalled();
    
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should use default duration of 3000ms", () => {
    const onClose = jest.fn();
    render(<Toast message="Test" type="info" onClose={onClose} />);
    
    act(() => {
      jest.advanceTimersByTime(2999);
    });
    expect(onClose).not.toHaveBeenCalled();
    
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should render with success styling", () => {
    const onClose = jest.fn();
    const { container } = render(<Toast message="Success!" type="success" onClose={onClose} />);
    
    const toastDiv = container.firstChild as HTMLElement;
    expect(toastDiv.className).toContain("bg-green-600");
  });

  it("should render with error styling", () => {
    const onClose = jest.fn();
    const { container } = render(<Toast message="Error!" type="error" onClose={onClose} />);
    
    const toastDiv = container.firstChild as HTMLElement;
    expect(toastDiv.className).toContain("bg-red-600");
  });

  it("should render with warning styling", () => {
    const onClose = jest.fn();
    const { container } = render(<Toast message="Warning!" type="warning" onClose={onClose} />);
    
    const toastDiv = container.firstChild as HTMLElement;
    expect(toastDiv.className).toContain("bg-yellow-600");
  });

  it("should render with info styling", () => {
    const onClose = jest.fn();
    const { container } = render(<Toast message="Info" type="info" onClose={onClose} />);
    
    const toastDiv = container.firstChild as HTMLElement;
    expect(toastDiv.className).toContain("bg-blue-600");
  });

  it("should clear timer on unmount", () => {
    const onClose = jest.fn();
    const { unmount } = render(<Toast message="Test" type="info" duration={5000} onClose={onClose} />);
    
    unmount();
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // onClose should not be called after unmount
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ToastContainer component", () => {
  it("should render empty when no toasts", () => {
    const onRemove = jest.fn();
    const { container } = render(<ToastContainer toasts={[]} onRemove={onRemove} />);
    
    const toastContainer = container.firstChild as HTMLElement;
    expect(toastContainer.children.length).toBe(0);
  });

  it("should render multiple toasts", () => {
    const onRemove = jest.fn();
    const toasts = [
      { id: "1", message: "Toast 1", type: "success" as const },
      { id: "2", message: "Toast 2", type: "error" as const },
      { id: "3", message: "Toast 3", type: "info" as const },
    ];
    
    render(<ToastContainer toasts={toasts} onRemove={onRemove} />);
    
    expect(screen.getByText("Toast 1")).toBeInTheDocument();
    expect(screen.getByText("Toast 2")).toBeInTheDocument();
    expect(screen.getByText("Toast 3")).toBeInTheDocument();
  });

  it("should call onRemove with correct id when toast closed", () => {
    const onRemove = jest.fn();
    const toasts = [
      { id: "toast-1", message: "First toast", type: "info" as const },
    ];
    
    render(<ToastContainer toasts={toasts} onRemove={onRemove} />);
    
    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);
    
    expect(onRemove).toHaveBeenCalledWith("toast-1");
  });

  it("should have fixed positioning", () => {
    const onRemove = jest.fn();
    const { container } = render(<ToastContainer toasts={[]} onRemove={onRemove} />);
    
    const toastContainer = container.firstChild as HTMLElement;
    expect(toastContainer.className).toContain("fixed");
    expect(toastContainer.className).toContain("top-4");
    expect(toastContainer.className).toContain("right-4");
    expect(toastContainer.className).toContain("z-50");
  });
});

describe("useToast hook", () => {
  it("should initialize with empty toasts array", () => {
    const { result } = renderHook(() => useToast());
    
    expect(result.current.toasts).toEqual([]);
  });

  it("should add toast with addToast", () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast("Test message", "success");
    });
    
    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].message).toBe("Test message");
    expect(result.current.toasts[0].type).toBe("success");
    expect(result.current.toasts[0].id).toBeDefined();
  });

  it("should generate unique ids for each toast", () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast("First", "info");
      result.current.addToast("Second", "info");
    });
    
    expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id);
  });

  it("should remove toast with removeToast", () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast("Test", "info");
    });
    
    const toastId = result.current.toasts[0].id;
    
    act(() => {
      result.current.removeToast(toastId);
    });
    
    expect(result.current.toasts.length).toBe(0);
  });

  it("should remove correct toast when multiple exist", () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast("First", "info");
      result.current.addToast("Second", "success");
      result.current.addToast("Third", "error");
    });
    
    const secondToastId = result.current.toasts[1].id;
    
    act(() => {
      result.current.removeToast(secondToastId);
    });
    
    expect(result.current.toasts.length).toBe(2);
    expect(result.current.toasts.map(t => t.message)).toEqual(["First", "Third"]);
  });

  it("should handle removing non-existent toast gracefully", () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast("Test", "info");
    });
    
    act(() => {
      result.current.removeToast("non-existent-id");
    });
    
    // Original toast should still be there
    expect(result.current.toasts.length).toBe(1);
  });

  it("should return stable function references", () => {
    const { result, rerender } = renderHook(() => useToast());
    
    const initialAddToast = result.current.addToast;
    const initialRemoveToast = result.current.removeToast;
    
    rerender();
    
    expect(result.current.addToast).toBe(initialAddToast);
    expect(result.current.removeToast).toBe(initialRemoveToast);
  });

  it("should add error toast", () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast("Error occurred", "error");
    });
    
    expect(result.current.toasts[0].type).toBe("error");
  });

  it("should add warning toast", () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast("Warning message", "warning");
    });
    
    expect(result.current.toasts[0].type).toBe("warning");
  });
});

