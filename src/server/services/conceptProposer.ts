import { logServiceError, logger } from "~/lib/logger";
import type { ServiceContext } from "~/server/dependencies";
import { concept } from "~/server/schema";
import { eq } from "drizzle-orm";
import { slidingWindowChunk } from "~/lib/text-processing";
import { escapeTemplateContent } from "./promptUtils";
import { getVectorIndex } from "./vectorIndex";

export interface ConceptCandidate {
  title: string;
  content: string;
  summary: string;
  description?: string;
  // Duplicate detection fields (optional for backward compatibility)
  isDuplicate?: boolean;
  existingConceptId?: string;
  similarity?: number;
}

export async function generateConceptCandidates(
  text: string,
  instructions: string | undefined,
  maxCandidates: number,
  context: ServiceContext,
  defaultCreator?: string,
  defaultYear?: string,
): Promise<ConceptCandidate[]> {
  const startTime = Date.now();
  const client = context.llm;
  const config = context.config;

  // Validate config before generating content
  try {
    config.validateConfigForContentGeneration();
  } catch (error) {
    logServiceError(error, "conceptProposer", {
      textLength: text.length,
      maxCandidates,
    });
    throw error;
  }

  logger.info({
    service: "conceptProposer",
    operation: "generateConceptCandidates",
    textLength: text.length,
    maxCandidates,
    hasInstructions: !!instructions,
    hasDefaultCreator: !!defaultCreator,
    hasDefaultYear: !!defaultYear,
    provider: client.getProvider(),
    model: client.getModel(),
  }, "Starting concept generation");

  // Use sliding window chunking to process entire document
  // This ensures 100% coverage without information loss
  const chunks = slidingWindowChunk(text, 30000, 5000);
  
  logger.debug({
    service: "conceptProposer",
    operation: "generateConceptCandidates",
    strategy: "sliding_window",
    chunkCount: chunks.length,
    totalLength: text.length,
    averageChunkLength: chunks.length > 0 ? Math.round(text.length / chunks.length) : 0,
  }, "Using sliding window chunking to process entire document");

  const systemPromptDefault = "You are analyzing text to extract distinct, standalone concepts. Each concept should be a complete idea that can stand alone.";
  const systemPrompt = config.getSystemPrompt(
    config.getPrompt("conceptProposer.systemPrompt", systemPromptDefault)
  );

  const instructionText = instructions
    ? `\n\nSPECIFIC INSTRUCTIONS:\n${instructions}\n`
    : "";

  // Get user prompt template from config
  const promptTemplate = config.getPrompt(
    "conceptProposer.userPromptTemplate",
    `Analyze the following text and extract {{maxCandidates}} distinct core concepts.

Each concept should be:
- A complete, standalone idea (typically 1-2 pages worth of content)
- Clearly distinct from other concepts
- Have a clear title and summary
- Include the full content text

TEXT TO ANALYZE:
{{textToAnalyze}}
{{instructions}}

Response format (structured output will ensure valid JSON):
{
  "concepts": [
    {
      "title": "Concept Title",
      "description": "Short description for search",
      "summary": "Brief summary",
      "content": "Full content text (extracted from the source text, preserving original formatting)"
    }
  ]
}

Extract the content directly from the source text when possible. Only generate content if the source text doesn't contain enough detail.`
  );

  // Process all chunks and merge results
  const allConcepts: ConceptCandidate[] = [];
  const conceptsPerChunk = Math.max(1, Math.ceil(maxCandidates / chunks.length));

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkNumber = i + 1;
    
    logger.debug({
      service: "conceptProposer",
      operation: "generateConceptCandidates",
      chunkNumber,
      totalChunks: chunks.length,
      chunkLength: chunk.length,
    }, `Processing chunk ${chunkNumber} of ${chunks.length}`);

    // Escape user content to prevent prompt injection (using static import)

    // Replace template variables (escape user content to prevent prompt injection)
    const prompt = promptTemplate
      .replace(/\{\{maxCandidates\}\}/g, String(conceptsPerChunk))
      .replace(/\{\{textToAnalyze\}\}/g, escapeTemplateContent(chunk))
      .replace(/\{\{instructions\}\}/g, escapeTemplateContent(instructionText));

    try {
      logger.debug({
        service: "conceptProposer",
        operation: "generateConceptCandidates",
        chunkNumber,
        promptLength: prompt.length,
        systemPromptLength: systemPrompt.length,
        chunkLength: chunk.length,
      }, `Calling LLM for concept extraction (chunk ${chunkNumber})`);

      const llmStartTime = Date.now();
      const response = await client.completeJSON(prompt, systemPrompt);
      const llmDuration = Date.now() - llmStartTime;

      logger.info({
        service: "conceptProposer",
        operation: "generateConceptCandidates",
        chunkNumber,
        llmDuration,
        responseKeys: Object.keys(response),
      }, `LLM response received for chunk ${chunkNumber}`);

      const chunkConcepts = (response.concepts as ConceptCandidate[]) ?? [];
      allConcepts.push(...chunkConcepts);
    } catch (error) {
      logger.error({
        service: "conceptProposer",
        operation: "generateConceptCandidates",
        chunkNumber,
        error,
      }, `Failed to process chunk ${chunkNumber}, continuing with other chunks`);
      // Continue processing other chunks even if one fails
    }
  }

  // Deduplicate concepts across chunks by title (case-insensitive)
  const seenTitles = new Set<string>();
  const uniqueConcepts: ConceptCandidate[] = [];
  
  for (const concept of allConcepts) {
    const normalizedTitle = concept.title?.toLowerCase().trim();
    if (normalizedTitle && !seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      uniqueConcepts.push(concept);
    }
  }

  // Limit to maxCandidates
  const concepts = uniqueConcepts.slice(0, maxCandidates);

  logger.debug({
    service: "conceptProposer",
    operation: "generateConceptCandidates",
    conceptsReceived: concepts.length,
    conceptsDetails: concepts.map((c, i) => ({
      index: i,
      hasTitle: !!c?.title,
      titleLength: c?.title?.length ?? 0,
      hasContent: !!c?.content,
      contentLength: c?.content?.length ?? 0,
      hasSummary: !!c?.summary,
      hasDescription: !!c?.description,
    })),
  }, "Processing LLM response");

  // Validate that we got concepts
  if (!Array.isArray(concepts) || concepts.length === 0) {
    logger.warn({
      service: "conceptProposer",
      operation: "generateConceptCandidates",
      chunkCount: chunks.length,
    }, "No concepts generated from any chunk");
    logServiceError(
      new Error("No concepts generated from any chunk"),
      "conceptProposer",
      {
        textLength: text.length,
        chunkCount: chunks.length,
        maxCandidates,
        hasInstructions: !!instructions,
      },
    );
    return [];
  }

  // Filter out any invalid concepts
  const validConcepts = concepts.filter(
    (c) => c && typeof c.title === "string" && typeof c.content === "string",
  );

  if (validConcepts.length === 0) {
    logger.warn({
      service: "conceptProposer",
      operation: "generateConceptCandidates",
      conceptsReceived: concepts.length,
      invalidConceptsDetails: concepts.map((c, i) => ({
        index: i,
        concept: c,
        isValid: !!(c && typeof c.title === "string" && typeof c.content === "string"),
        titleValid: typeof c?.title === "string",
        contentValid: typeof c?.content === "string",
      })),
    }, "All concepts were invalid after filtering");
    logServiceError(
      new Error("All concepts were invalid after filtering"),
      "conceptProposer",
      {
        textLength: text.length,
        chunkCount: chunks.length,
        maxCandidates,
        conceptsReceived: concepts.length,
      },
    );
    return [];
  }

  // Filter out duplicates using vector search
  // Use static import for findSimilarConcepts
  const db = context.db;
  const filteredConcepts: ConceptCandidate[] = [];
  const duplicateThreshold = 0.85; // High similarity threshold for duplicates

  for (const candidate of validConcepts) {
    const candidateText = `${candidate.title}\n${candidate.description || ""}\n${candidate.content}`;
    
    // Generate embedding for candidate to use in search
    const candidateEmbedding = await client.embed(candidateText);
    
    // Find similar existing concepts using VectorIndex directly (fast in-memory search)
    const index = getVectorIndex();
    const similarConcepts = index.search(
      candidateEmbedding,
      10, // Check top 10 most similar
      duplicateThreshold, // Only consider high similarity matches
      [], // Don't exclude any concepts
    );

    if (similarConcepts.length > 0) {
      // Found a potential duplicate - return it with flags so user can decide
      const existingConcept = await db
        .select()
        .from(concept)
        .where(eq(concept.id, similarConcepts[0].conceptId))
        .limit(1);

      if (existingConcept.length > 0) {
        logger.info({
          service: "conceptProposer",
          operation: "generateConceptCandidates",
          candidateTitle: candidate.title,
          existingConceptId: existingConcept[0].id,
          existingConceptTitle: existingConcept[0].title,
          similarity: similarConcepts[0].similarity,
        }, "Found potential duplicate concept candidate - returning with flag for user decision");
        
        // Return candidate with duplicate flags instead of filtering it out
        filteredConcepts.push({
          ...candidate,
          isDuplicate: true,
          existingConceptId: existingConcept[0].id,
          similarity: similarConcepts[0].similarity,
        });
        continue; // Skip adding it again as a regular candidate
      }
    }

    // No duplicate found, add to results as regular candidate
    filteredConcepts.push(candidate);
  }

  const totalDuration = Date.now() - startTime;
  const duplicatesFound = filteredConcepts.filter((c) => c.isDuplicate === true).length;
  logger.info({
    service: "conceptProposer",
    operation: "generateConceptCandidates",
    totalDuration,
    conceptsGenerated: validConcepts.length,
    conceptsReturned: filteredConcepts.length,
    duplicatesFound,
    conceptsTitles: filteredConcepts.map((c) => c.title),
  }, "Successfully generated concept candidates with duplicate detection");

  // Add default metadata if provided
  return filteredConcepts.map((concept) => ({
    ...concept,
    // Metadata will be added by the caller
  }));
}

