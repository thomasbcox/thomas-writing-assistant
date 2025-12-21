/**
 * Data quality router - provides data validation and quality reports
 * Uses Drizzle ORM for database access
 */

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { generateDataQualityReport } from "~/lib/data-validation";
import { eq } from "drizzle-orm";
import { concept, link, capsule, anchor } from "~/server/schema";

export const dataQualityRouter = createTRPCRouter({
  getReport: publicProcedure.query(async ({ ctx }) => {
    // Fetch all data
    const concepts = await ctx.db
      .select()
      .from(concept)
      .where(eq(concept.status, "active"));

    const links = await ctx.db.select().from(link);
    const capsules = await ctx.db.select().from(capsule);
    const anchors = await ctx.db.select().from(anchor);

    // Create a set of concept IDs for quick lookup
    const conceptIds = new Set(concepts.map((c) => c.id));

    // Generate quality report
    const report = generateDataQualityReport(
      concepts,
      links,
      capsules,
      anchors,
      (id: string) => conceptIds.has(id),
    );

    return report;
  }),
});
