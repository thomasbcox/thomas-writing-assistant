"use client";

import { ConceptEnrichmentStudio } from "~/components/enrichment/ConceptEnrichmentStudio";
import { use } from "react";

export const dynamic = "force-dynamic";

export default function ConceptEnrichmentPage({
  params,
}: {
  params: Promise<{ conceptId: string }>;
}) {
  const { conceptId } = use(params);

  return <ConceptEnrichmentStudio conceptId={conceptId} />;
}

