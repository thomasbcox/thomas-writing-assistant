/**
 * Test utilities for tRPC React components
 * Provides mock tRPC Provider and helper functions for testing components that use tRPC hooks
 */

import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { jest } from "@jest/globals";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/lib/trpc/react";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

// Store mock functions in a global map for direct access
const mockHooksMap = new Map<string, jest.Mock>();

/**
 * Creates a mock tRPC API object with all routers and procedures
 * This matches the structure of the actual tRPC API
 * Uses a Proxy to handle tRPC's proxy-based API structure
 */
function createMockTRPCApi(mockHooksMap: Map<string, jest.Mock>) {
  // Helper to create a mock useQuery hook and store it in the map
  const createMockUseQuery = (path: string) => {
    const mockFn = jest.fn(() => ({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
      isFetching: false,
      status: "success" as const,
    }));
    mockHooksMap.set(path, mockFn);
    return mockFn;
  };

  // Helper to create a mock useMutation hook and store it in the map
  const createMockUseMutation = (path: string) => {
    const mockFn = jest.fn(() => ({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
      data: undefined,
      reset: jest.fn(),
    }));
    mockHooksMap.set(path, mockFn);
    return mockFn;
  };

  // Create a Proxy-based mock API that matches tRPC's structure
  const createProxy = (path: string[] = []): any => {
    return new Proxy({} as any, {
      get(_target, prop: string | symbol) {
        const propStr = prop.toString();
        const fullPath = [...path, propStr];
        
        // Special properties for tRPC API (only at root level)
        if (path.length === 0) {
          if (propStr === "Provider") {
            return ({ children }: { children: React.ReactNode }) => children;
          }
          if (propStr === "createClient") {
            return jest.fn(() => ({}));
          }
        }
        
        // If accessing useQuery, return a function that calls the stored mock
        if (propStr === "useQuery") {
          const hookKey = path.join(".") + ".useQuery";
          let mockHook = mockHooksMap.get(hookKey);
          if (!mockHook) {
            mockHook = createMockUseQuery(hookKey);
          }
          // Return a function that when called, invokes the mock and returns its result
          // This matches tRPC's expected structure where useQuery is callable
          // IMPORTANT: This function must NOT require tRPC context - it should return the mock result directly
          const hookFn = (...args: unknown[]) => {
            const result = mockHook!(...args);
            return result;
          };
          // Attach the mock function to the returned function so it can be accessed for setup
          (hookFn as any).mockImplementation = mockHook.mockImplementation.bind(mockHook);
          (hookFn as any).mockReturnValue = mockHook.mockReturnValue.bind(mockHook);
          (hookFn as any).mockResolvedValue = mockHook.mockResolvedValue?.bind(mockHook);
          return hookFn;
        }
        
        // If accessing useMutation, return a function that calls the stored mock
        if (propStr === "useMutation") {
          const hookKey = path.join(".") + ".useMutation";
          let mockHook = mockHooksMap.get(hookKey);
          if (!mockHook) {
            mockHook = createMockUseMutation(hookKey);
          }
          // Return a function that when called, invokes the mock and returns its result
          // This matches tRPC's expected structure where useMutation is callable
          // IMPORTANT: This function must NOT require tRPC context - it should return the mock result directly
          const hookFn = (...args: unknown[]) => {
            const result = mockHook!(...args);
            return result;
          };
          // Attach the mock function to the returned function so it can be accessed for setup
          (hookFn as any).mockImplementation = mockHook.mockImplementation.bind(mockHook);
          (hookFn as any).mockReturnValue = mockHook.mockReturnValue.bind(mockHook);
          (hookFn as any).mockResolvedValue = mockHook.mockResolvedValue?.bind(mockHook);
          return hookFn;
        }
        
        // Continue building the path for nested properties
        return createProxy(fullPath);
      },
    });
  };
  
  // Return the Proxy-based mock API
  return createProxy() as any;
}

// Note: Individual test files should define their own jest.mock("~/lib/trpc/react")
// to avoid conflicts. This utility provides helper functions but doesn't set up the mock
// to allow test files to have full control over the mock structure.

/**
 * Get the mocked tRPC API for setting up test data
 */
export async function getMockTRPCApi() {
  const trpcModule = await import("~/lib/trpc/react");
  return trpcModule.api;
}

/**
 * Get a mock hook directly from the map (bypasses proxy)
 * Use this when you need to access the jest mock directly
 */
export function getMockHook(hookKey: string): jest.Mock | undefined {
  return mockHooksMap.get(hookKey);
}

/**
 * Render a component with tRPC Provider and React Query
 * This ensures components that use tRPC hooks have the necessary context
 * Note: If tRPC hooks are mocked via jest.mock, the mocks will be used instead of real hooks
 */
export function renderWithTRPC(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    // Always create a real tRPC client and Provider
    // The mocks will intercept the hooks, but we need the Provider for context
    // The mocked hooks will be used when the component calls them
    // #region agent log
    (async () => { try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'trpc-test-utils.tsx:163',message:'Wrapper: About to create client',data:{hasApi:!!api,apiType:typeof api,hasCapsule:!!api?.capsule,hasList:!!api?.capsule?.list,hasUseQuery:!!api?.capsule?.list?.useQuery,isMock:!!api?.capsule?.list?.useQuery?.mockImplementation,hasProvider:!!api?.Provider,hasCreateClient:!!api?.createClient},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})+"\n"); } catch {} })();
    // #endregion
    
    const trpcClient = api.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          // Add error handler to capture transformation errors
          // @ts-expect-error - httpBatchLink might not have onError, but we'll try
          onError: (opts: any) => {
            // CAPTURE: Log tRPC transformation errors
            process.stderr.write(`\n[tRPC Link Error] ${opts?.error?.message || 'Unknown error'}\n`);
            process.stderr.write(`Error type: ${opts?.error?.constructor?.name}\n`);
            process.stderr.write(`Error stack: ${opts?.error?.stack?.substring(0, 500)}\n`);
            process.stderr.write(`Result: ${JSON.stringify(opts?.result, null, 2).substring(0, 500)}\n\n`);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'trpc-test-utils.tsx:177',message:'tRPC link error',data:{error:opts?.error?.message,errorType:opts?.error?.constructor?.name,result:opts?.result,optsKeys:Object.keys(opts||{})},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'I'})}).catch(()=>{});
            // #endregion
          },
        }),
      ],
    });
    // #region agent log
    (async () => { try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'trpc-test-utils.tsx:178',message:'Wrapper: Created trpcClient',data:{hasClient:!!trpcClient},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})+"\n"); } catch {} })();
    // #endregion

    return (
      <QueryClientProvider client={queryClient}>
        <api.Provider client={trpcClient} queryClient={queryClient}>
          {children}
        </api.Provider>
      </QueryClientProvider>
    );
  };

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Helper to set up mock tRPC query responses
 */
export async function mockTRPCQuery(
  router: string,
  procedure: string,
  data: any,
  options?: { isLoading?: boolean; isError?: boolean; error?: Error },
) {
  // #region agent log
  try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'trpc-test-utils.tsx:166',message:'mockTRPCQuery called',data:{router,procedure,hasOptions:!!options},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+"\n"); } catch {}
  // #endregion
  
  // Access mock directly from the map instead of through the proxy
  const hookKey = `${router}.${procedure}.useQuery`;
  let mockHook = mockHooksMap.get(hookKey);
  
  // #region agent log
  try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'trpc-test-utils.tsx:172',message:'Accessing mockHook from map',data:{hookKey,hasMockHook:!!mockHook,isFunction:typeof mockHook==='function',isJestMock:!!mockHook?.mockReturnValue},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+"\n"); } catch {}
  // #endregion
  
  // Create mock if it doesn't exist
  if (!mockHook) {
    mockHook = jest.fn(() => ({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
      isFetching: false,
      status: "success" as const,
    }));
    mockHooksMap.set(hookKey, mockHook);
  }
  
  // Set the return value
  mockHook.mockReturnValue({
    data: options?.isError ? undefined : data,
    isLoading: options?.isLoading ?? false,
    isError: options?.isError ?? false,
    error: options?.error ?? null,
    refetch: jest.fn(),
    isRefetching: false,
    isFetching: false,
    status: options?.isError ? "error" : options?.isLoading ? "loading" : "success",
  });
  
  // #region agent log
  try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'trpc-test-utils.tsx:189',message:'mockReturnValue called successfully',data:{router,procedure,hookKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+"\n"); } catch {}
  // #endregion
}

/**
 * Helper to set up mock tRPC mutation responses
 */
export async function mockTRPCMutation(
  router: string,
  procedure: string,
  options?: {
    mutate?: jest.Mock;
    mutateAsync?: jest.Mock;
    isPending?: boolean;
    isError?: boolean;
    error?: Error;
    data?: any;
  },
) {
  // #region agent log
  try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'trpc-test-utils.tsx:220',message:'mockTRPCMutation called',data:{router,procedure,hasOptions:!!options},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+"\n"); } catch {}
  // #endregion
  
  // Access mock directly from the map instead of through the proxy
  const hookKey = `${router}.${procedure}.useMutation`;
  let mockHook = mockHooksMap.get(hookKey);
  
  // #region agent log
  try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'trpc-test-utils.tsx:226',message:'Accessing mockHook from map',data:{hookKey,hasMockHook:!!mockHook,isFunction:typeof mockHook==='function',isJestMock:!!mockHook?.mockReturnValue},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+"\n"); } catch {}
  // #endregion
  
  // Create mock if it doesn't exist
  if (!mockHook) {
    mockHook = jest.fn(() => ({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
      data: undefined,
      reset: jest.fn(),
    }));
    mockHooksMap.set(hookKey, mockHook);
  }
  
  // Set the return value
  mockHook.mockReturnValue({
    mutate: options?.mutate ?? jest.fn(),
    mutateAsync: options?.mutateAsync ?? jest.fn(),
    isPending: options?.isPending ?? false,
    isError: options?.isError ?? false,
    error: options?.error ?? null,
    isSuccess: !options?.isError && !options?.isPending,
    data: options?.data,
    reset: jest.fn(),
  });
  
  // #region agent log
  try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'trpc-test-utils.tsx:250',message:'mockReturnValue called successfully for mutation',data:{router,procedure,hookKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+"\n"); } catch {}
  // #endregion
}
