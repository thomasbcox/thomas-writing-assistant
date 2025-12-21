import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "~/lib/trpc/react";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

/**
 * Test wrapper component that provides tRPC and React Query context
 * for component tests
 * 
 * This wrapper creates a minimal tRPC client that can be used with mocked hooks.
 * For tests that mock hooks directly, the mocks will override the real hooks.
 */
export function TestWrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  const [trpcClient] = React.useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </api.Provider>
    </QueryClientProvider>
  );
}
