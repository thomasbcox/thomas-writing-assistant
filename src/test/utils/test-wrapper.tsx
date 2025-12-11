/**
 * Test wrapper for React components that use tRPC hooks
 * Provides QueryClient and tRPC Provider context for testing
 * 
 * Last Updated: 2025-12-11
 */

import React from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "~/lib/trpc/react";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "~/server/api/root";

// Create a mock tRPC client (won't actually make requests in tests)
const createMockTRPCClient = () => {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "http://localhost:3000/api/trpc",
        transformer: superjson,
      }),
    ],
  });
};

interface TestWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that provides QueryClient and tRPC Provider for tests
 * This allows components using tRPC hooks to render without errors
 * The actual hooks are mocked at the module level, but they still need the React Query context
 */
export function TestWrapper({ children }: TestWrapperProps) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: Infinity,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  const [trpcClient] = React.useState(() => createMockTRPCClient());

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </api.Provider>
    </QueryClientProvider>
  );
}

/**
 * Custom render function that wraps components with TestWrapper
 * Use this instead of render() from @testing-library/react for components using tRPC
 */
export function renderWithTRPC(ui: React.ReactElement) {
  return render(ui, {
    wrapper: TestWrapper,
  });
}

