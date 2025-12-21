import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { conceptRouter } from "~/server/api/routers/concept";
import { linkRouter } from "~/server/api/routers/link";
import { linkNameRouter } from "~/server/api/routers/linkName";
import { capsuleRouter } from "~/server/api/routers/capsule";
import { aiRouter } from "~/server/api/routers/ai";
import { pdfRouter } from "~/server/api/routers/pdf";
import { configRouter } from "~/server/api/routers/config";
import { enrichmentRouter } from "~/server/api/routers/enrichment";
import { dataQualityRouter } from "~/server/api/routers/dataQuality";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  concept: conceptRouter,
  link: linkRouter,
  linkName: linkNameRouter,
  capsule: capsuleRouter,
  ai: aiRouter,
  pdf: pdfRouter,
  config: configRouter,
  enrichment: enrichmentRouter,
  dataQuality: dataQualityRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
