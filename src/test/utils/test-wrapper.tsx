import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "~/lib/trpc/react";

/**
 * Test wrapper component that provides tRPC and React Query context
 * for component tests
 */
export function TestWrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  const [trpcClient] = React.useState(() =>
    api.createClient({
      links: [],
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
