"use client";

import { ConceptEnrichmentStudio } from "~/components/enrichment/ConceptEnrichmentStudio";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { ConceptFormData } from "~/server/services/conceptEnricher";

function NewConceptEnrichmentContent() {
  const searchParams = useSearchParams();

  // Get candidate data from URL params
  const initialData: Partial<ConceptFormData> = {
    title: searchParams.get("title") ?? "",
    description: searchParams.get("definition") ?? searchParams.get("description") ?? "",
    content: searchParams.get("content") ?? "",
    creator: searchParams.get("creator") ?? "",
    source: searchParams.get("source") ?? "",
    year: searchParams.get("year") ?? "",
  };

  // Combine definition and application into content if not provided separately
  if (!initialData.content && searchParams.get("application")) {
    const definition = searchParams.get("definition") ?? "";
    const application = searchParams.get("application") ?? "";
    initialData.content = `## Core Definition\n${definition}\n\n## Managerial Application\n${application}`;
  }

  return <ConceptEnrichmentStudio initialData={initialData} />;
}

export default function NewConceptEnrichmentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <NewConceptEnrichmentContent />
    </Suspense>
  );
}

