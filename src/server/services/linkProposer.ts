/**
 * Link Proposer Service
 * Uses Drizzle ORM for database access
 */

import { getLLMClient } from "./llm/client";
import { getConfigLoader } from "./config";
import { logServiceError, logger } from "~/lib/logger";
import type { LLMClient } from "./llm/client";
import type { ConfigLoader } from "./config";
import type { getCurrentDb } from "~/server/db";
import { eq, and, not, notInArray, inArray } from "drizzle-orm";
import { concept, link, linkName } from "~/server/schema";

type Database = ReturnType<typeof getCurrentDb>;

export interface LinkProposal {
  source: string;
  target: string;
  target_title: string;
  forward_name: string;
  confidence: number;
  reasoning: string;
}

export async function proposeLinksForConcept(
  conceptId: string,
  maxProposals: number = 5,
  database?: Database,
  llmClient?: LLMClient,
  configLoader?: ConfigLoader,
): Promise<LinkProposal[]> {
  const startTime = Date.now();
  const { db } = await import("~/server/db");
  const dbInstance = database ?? db;
  const client = llmClient ?? getLLMClient();
  const config = configLoader ?? getConfigLoader();

  logger.info(
    {
      service: "linkProposer",
      operation: "proposeLinksForConcept",
      conceptId,
      maxProposals,
    },
    "Starting link proposal generation",
  );

  const targetConcept = await dbInstance.query.concept.findFirst({
    where: eq(concept.id, conceptId),
  });

  if (!targetConcept) {
    logger.warn(
      {
        service: "linkProposer",
        operation: "proposeLinksForConcept",
        conceptId,
      },
      "Target concept not found",
    );
    return [];
  }

  logger.debug(
    {
      service: "linkProposer",
      operation: "proposeLinksForConcept",
      conceptId,
      conceptTitle: targetConcept.title,
    },
    "Target concept loaded",
  );

  // Get all concepts except this one and already-linked ones
  logger.debug(
    {
      service: "linkProposer",
      operation: "proposeLinksForConcept",
      conceptId,
    },
    "Querying existing links",
  );

  const existingLinks = await dbInstance
    .select()
    .from(link)
    .where(eq(link.sourceId, conceptId));

  const linkedIds = new Set(existingLinks.map((l) => l.targetId));

  logger.debug(
    {
      service: "linkProposer",
      operation: "proposeLinksForConcept",
      conceptId,
      existingLinksCount: existingLinks.length,
      linkedIdsCount: linkedIds.size,
    },
    "Existing links loaded",
  );

  const allLinkedIds = Array.from(linkedIds);
  const conditions = [
    not(eq(concept.id, conceptId)),
    eq(concept.status, "active"),
  ];

  if (allLinkedIds.length > 0) {
    conditions.push(notInArray(concept.id, allLinkedIds as string[]));
  }

  const candidates = await dbInstance
    .select()
    .from(concept)
    .where(and(...conditions)!)
    .limit(20); // Limit for token efficiency

  logger.debug(
    {
      service: "linkProposer",
      operation: "proposeLinksForConcept",
      conceptId,
      candidatesCount: candidates.length,
    },
    "Candidate concepts loaded",
  );

  if (candidates.length === 0) {
    logger.info(
      {
        service: "linkProposer",
        operation: "proposeLinksForConcept",
        conceptId,
      },
      "No candidate concepts available for linking",
    );
    return [];
  }

  // Use LLM to propose links
  const proposals = await proposeLinksWithLLM(
    targetConcept,
    candidates,
    maxProposals,
    client,
    config,
    dbInstance,
  );

  const totalDuration = Date.now() - startTime;
  logger.info(
    {
      service: "linkProposer",
      operation: "proposeLinksForConcept",
      conceptId,
      totalDuration,
      proposalsGenerated: proposals.length,
      proposalsDetails: proposals.map((p) => ({
        target: p.target,
        targetTitle: p.target_title,
        forwardName: p.forward_name,
        confidence: p.confidence,
      })),
    },
    "Link proposals generated successfully",
  );

  return proposals;
}

async function proposeLinksWithLLM(
  sourceConcept: {
    id: string;
    title: string;
    description: string | null;
    content: string;
  },
  candidates: Array<{
    id: string;
    title: string;
    description: string | null;
    content: string;
  }>,
  maxProposals: number,
  llmClient: LLMClient,
  configLoader: ConfigLoader,
  database: Database,
): Promise<LinkProposal[]> {
  // Build candidate descriptions
  const candidateDescriptions = candidates.map((candidate, i) => ({
    id: candidate.id,
    title: candidate.title,
    content_preview: candidate.content.slice(0, 500),
  }));

  // Get available link names
  const linkNames = await database
    .select()
    .from(linkName)
    .where(eq(linkName.isDeleted, false));

  const defaultNames = [
    "belongs to",
    "references",
    "is a subset of",
    "builds on",
    "contradicts",
    "related to",
    "example of",
    "prerequisite for",
    "extends",
    "similar to",
    "part of",
    "contains",
    "inspired by",
    "opposes",
  ];

  const allLinkNames = [
    ...defaultNames,
    ...linkNames.map((ln) => ln.forwardName),
  ].join(", ");

  const systemPrompt = configLoader.getSystemPrompt(
    "You are analyzing relationships between concepts in a knowledge graph. Propose meaningful, typed links.",
  );

  const prompt = `Analyze the relationship between this concept and the candidate concepts below.

SOURCE CONCEPT:
Title: ${sourceConcept.title}
Description: ${sourceConcept.description ?? "None"}
Content Preview: ${sourceConcept.content.slice(0, 500)}

CANDIDATE CONCEPTS:
${candidateDescriptions
  .map(
    (c, i) => `
${i + 1}. ID: ${c.id}
   Title: ${c.title}
   Content Preview: ${c.content_preview}`,
  )
  .join("\n")}

AVAILABLE LINK NAMES: ${allLinkNames}

For each candidate concept, determine:
1. If there's a meaningful relationship (confidence 0.0-1.0)
2. The most appropriate link name from the available list
3. A brief reasoning

Return a JSON object with a "proposals" array:
{
  "proposals": [
    {
      "target_id": "concept-id",
      "forward_name": "link name",
      "confidence": 0.85,
      "reasoning": "Brief explanation"
    }
  ]
}

Only include proposals with confidence >= 0.5. Limit to ${maxProposals} proposals.`;

  try {
    logger.debug(
      {
        service: "linkProposer",
        operation: "proposeLinksWithLLM",
        sourceConceptId: sourceConcept.id,
        candidateCount: candidates.length,
        maxProposals,
        promptLength: prompt.length,
        systemPromptLength: systemPrompt.length,
        provider: llmClient.getProvider(),
        model: llmClient.getModel(),
      },
      "Calling LLM for link proposals",
    );

    const llmStartTime = Date.now();
    const response = await llmClient.completeJSON(prompt, systemPrompt);
    const llmDuration = Date.now() - llmStartTime;

    logger.debug(
      {
        service: "linkProposer",
        operation: "proposeLinksWithLLM",
        llmDuration,
        responseKeys: Object.keys(response),
      },
      "LLM response received",
    );

    const proposals = (response.proposals as Array<{
      target_id: string;
      forward_name: string;
      confidence: number;
      reasoning: string;
    }>) ?? [];

    logger.debug(
      {
        service: "linkProposer",
        operation: "proposeLinksWithLLM",
        proposalsReceived: proposals.length,
      },
      "Processing LLM proposals",
    );

    // Enrich with target concept titles
    const enrichedProposals: LinkProposal[] = [];

    for (const proposal of proposals.slice(0, maxProposals)) {
      const candidate = candidates.find((c) => c.id === proposal.target_id);

      if (candidate && proposal.confidence >= 0.5) {
        enrichedProposals.push({
          source: sourceConcept.id,
          target: proposal.target_id,
          target_title: candidate.title,
          forward_name: proposal.forward_name,
          confidence: proposal.confidence,
          reasoning: proposal.reasoning,
        });
      }
    }

    logger.debug(
      {
        service: "linkProposer",
        operation: "proposeLinksWithLLM",
        enrichedProposalsCount: enrichedProposals.length,
        filteredOut: proposals.length - enrichedProposals.length,
      },
      "Enriched and filtered proposals",
    );

    return enrichedProposals.sort((a, b) => b.confidence - a.confidence);
  } catch (error) {
    logger.error(
      {
        service: "linkProposer",
        operation: "proposeLinksWithLLM",
        sourceConceptId: sourceConcept.id,
        error: error instanceof Error ? error.message : String(error),
      },
      "Link proposal generation failed",
    );
    logServiceError(error, "linkProposer", {
      sourceConceptId: sourceConcept.id,
      sourceConceptTitle: sourceConcept.title,
      candidateCount: candidates.length,
      maxProposals: maxProposals,
    });
    return [];
  }
}
