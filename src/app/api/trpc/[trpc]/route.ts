import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { logTRPCError } from "~/lib/logger";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    // Log errors in all environments with full context for AI analysis
    onError: ({ path, error, input, type }) => {
      logTRPCError(error, {
        path: path ?? undefined,
        type,
        input,
        requestId: req.headers.get("x-request-id") ?? undefined,
      });
    },
  });

export { handler as GET, handler as POST };

