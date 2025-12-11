/**
 * Data quality router - provides data validation and quality reports
 * Last Updated: 2025-12-11
 */

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { generateDataQualityReport } from "~/lib/data-validation";
import { db } from "~/server/db";

export const dataQualityRouter = createTRPCRouter({
  getReport: publicProcedure.query(async () => {
    // Fetch all data
    const concepts = await db.concept.findMany({
      where: { status: "active" },
    });
    const links = await db.link.findMany();
    const capsules = await db.capsule.findMany();
    const anchors = await db.anchor.findMany();

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

