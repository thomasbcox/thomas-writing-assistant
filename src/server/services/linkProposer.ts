/**
 * Link Proposer Service
 * Uses Drizzle ORM for database access
 */

import { logServiceError, logger } from "~/lib/logger";
import type { LLMClient } from "./llm/client";
import type { ConfigLoader } from "./config";
import { eq, and, not, notInArray, inArray } from "drizzle-orm";
import { concept, link, linkName } from "~/server/schema";
import { getOrCreateEmbeddingWithContext } from "./embeddingOrchestrator";
import { getVectorIndex } from "./vectorIndex";
import { escapeTemplateContent } from "./promptUtils";
import type { ServiceContext } from "~/server/dependencies";
import {
  getOrCreateContextSession,
  generateSessionKey,
  type ContextMessage,
} from "./llm/contextSession";

import type { DatabaseInstance } from "~/server/db";
type Database = DatabaseInstance;

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
  context: ServiceContext,
): Promise<LinkProposal[]> {
  const dbInstance = context.db;
  const client = context.llm;
  const config = context.config;

  // Validate config before generating content
  try {
    config.validateConfigForContentGeneration();
  } catch (error) {
    logServiceError(error, "linkProposer", {
      conceptId,
      maxProposals,
    });
    throw error;
  }

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
  const allLinkedIds = Array.from(linkedIds);

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

  // Get the source concept for embedding generation
  const sourceConcept = await dbInstance
    .select()
    .from(concept)
    .where(eq(concept.id, conceptId))
    .limit(1);

  if (sourceConcept.length === 0) {
    logger.warn({ conceptId }, "Source concept not found");
    return [];
  }

  const sourceConceptData = sourceConcept[0];
  const textToEmbed = `${sourceConceptData.title}\n${sourceConceptData.description || ""}\n${sourceConceptData.content}`;

  // Ensure source concept has an embedding and get it for search
  const model = client.getProvider() === "openai" ? "text-embedding-3-small" : "text-embedding-004";
  const sourceEmbedding = await getOrCreateEmbeddingWithContext(conceptId, textToEmbed, dbInstance, model);

  // Use VectorIndex directly for fast in-memory search (exclude already linked concepts)
  const index = getVectorIndex();
  const similarConcepts = index.search(
    sourceEmbedding,
    100, // Limit to 100 most similar (increased from 20 for better recall with <1000 concepts)
    0.0, // No minimum similarity threshold (we'll let LLM decide)
    [conceptId, ...allLinkedIds], // Exclude source and already linked
  );

  if (similarConcepts.length === 0) {
    logger.info(
      {
        service: "linkProposer",
        operation: "proposeLinksForConcept",
        conceptId,
      },
      "No similar concepts found via vector search",
    );
    return [];
  }

  // Get the actual concept records for the similar concepts
  const candidateIds = similarConcepts.map((sc) => sc.conceptId);
  const candidates = await dbInstance
    .select()
    .from(concept)
    .where(
      and(
        inArray(concept.id, candidateIds),
        eq(concept.status, "active"),
      )!,
    );

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
  logger.info(
    {
      service: "linkProposer",
      operation: "proposeLinksForConcept",
      conceptId,
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

  // Get prompts from config with fallback to defaults
  const systemPromptDefault = "You are analyzing relationships between concepts in a knowledge graph. Propose meaningful, typed links.";
  const systemPrompt = configLoader.getSystemPrompt(
    configLoader.getPrompt("linkProposer.systemPrompt", systemPromptDefault)
  );

  // Build candidate descriptions for context
  const candidateDescriptions = candidates.map((candidate, i) => ({
    id: candidate.id,
    title: candidate.title,
    content_preview: candidate.content.slice(0, 500),
  }));

  const candidateList = candidateDescriptions
    .map(
      (c, i) => `
${i + 1}. ID: ${c.id}
   Title: ${c.title}
   Content Preview: ${c.content_preview}`,
    )
    .join("\n");

  // Create or get context session with candidate concepts loaded
  const sessionKey = generateSessionKey("link-proposer", sourceConcept.id);
  const staticContent = `Here are the candidate concepts in the knowledge graph that you can reference:

${candidateList}

Available link names: ${allLinkNames}

You will be asked to propose links between a source concept and these candidate concepts.`;
  
  const contextSession = await getOrCreateContextSession(
    database,
    sessionKey,
    llmClient.getProvider(),
    llmClient.getModel(),
    [
      {
        role: "user",
        content: staticContent,
      },
    ],
    candidates.map((c) => c.id),
  );

  // Create cache for the large static content if it's large enough
  if (staticContent.length >= 2000) {
    const { createCacheForSession } = await import("./llm/contextSession");
    await createCacheForSession(
      database,
      sessionKey,
      llmClient.getProvider(),
      staticContent,
      llmClient,
    );
  }

  // Build the link proposal query (references concepts already in context)
  const promptTemplate = configLoader.getPrompt(
    "linkProposer.userPromptTemplate",
    `Analyze the relationship between this source concept and the candidate concepts that were provided earlier.

SOURCE CONCEPT:
Title: {{sourceTitle}}
Description: {{sourceDescription}}
Content Preview: {{sourceContentPreview}}

For each candidate concept (referenced by their IDs), determine:
1. If there's a meaningful relationship (confidence 0.0-1.0)
2. The most appropriate link name from the available list
3. A brief reasoning

Response format (structured output will ensure valid JSON):
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

Only include proposals with confidence >= 0.5. Limit to {{maxProposals}} proposals.`
  );

  // Replace template variables (escape user content to prevent prompt injection)
  const prompt = promptTemplate
    .replace(/\{\{sourceTitle\}\}/g, escapeTemplateContent(sourceConcept.title))
    .replace(/\{\{sourceDescription\}\}/g, escapeTemplateContent(sourceConcept.description ?? "None"))
    .replace(/\{\{sourceContentPreview\}\}/g, escapeTemplateContent((sourceConcept.content ?? "").slice(0, 500)))
    .replace(/\{\{maxProposals\}\}/g, String(maxProposals));

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
        sessionId: contextSession.id,
      },
      "Calling LLM for link proposals with context session",
    );

    const llmStartTime = Date.now();
    
    // Convert context session messages to conversation history format
    const conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = 
      contextSession.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    const response = await llmClient.completeJSON(
      prompt,
      systemPrompt,
      conversationHistory,
      database,
      true, // useCache
      sessionKey, // Pass session key to enable context cache lookup
    );
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
