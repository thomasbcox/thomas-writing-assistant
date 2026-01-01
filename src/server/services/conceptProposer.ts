import { getLLMClient } from "./llm/client";
import { getConfigLoader } from "./config";
import { logServiceError, logger } from "~/lib/logger";
import type { LLMClient } from "./llm/client";
import type { ConfigLoader } from "./config";

/**
 * Smart chunking function that preserves sentence and paragraph boundaries
 * Takes chunks from beginning, middle, and end of document
 */
function smartChunkText(text: string, chunkSize: number): string {
  // Split into paragraphs first (double newlines)
  const paragraphs = text.split(/\n\s*\n/);
  
  // If we have few paragraphs, fall back to sentence-based chunking
  if (paragraphs.length < 10) {
    return smartChunkBySentences(text, chunkSize);
  }
  
  // Strategy: Take paragraphs from beginning, middle, and end
  // Prioritize paragraphs with headings (lines starting with #, ##, etc.)
  const chunks: string[] = [];
  const targetChunkSize = chunkSize;
  
  // Beginning chunk: take paragraphs until we reach target size
  let beginningChunk = "";
  for (let i = 0; i < paragraphs.length && beginningChunk.length < targetChunkSize; i++) {
    const para = paragraphs[i];
    if (beginningChunk.length + para.length > targetChunkSize) {
      // Try to complete the paragraph if it's not too long
      if (para.length < targetChunkSize * 0.3) {
        beginningChunk += "\n\n" + para;
      }
      break;
    }
    beginningChunk += (beginningChunk ? "\n\n" : "") + para;
  }
  chunks.push(beginningChunk);
  
  // Middle chunk: sample from middle section
  const middleStart = Math.floor(paragraphs.length * 0.4);
  const middleEnd = Math.floor(paragraphs.length * 0.6);
  let middleChunk = "";
  
  // Prioritize paragraphs with headings
  const middleParagraphs = paragraphs.slice(middleStart, middleEnd);
  const withHeadings = middleParagraphs.filter(p => /^#+\s/.test(p.trim()));
  const withoutHeadings = middleParagraphs.filter(p => !/^#+\s/.test(p.trim()));
  
  // Add paragraphs with headings first, then others
  const prioritizedMiddle = [...withHeadings, ...withoutHeadings];
  
  for (const para of prioritizedMiddle) {
    if (middleChunk.length + para.length > targetChunkSize) {
      break;
    }
    middleChunk += (middleChunk ? "\n\n" : "") + para;
  }
  
  if (middleChunk) {
    chunks.push(middleChunk);
  }
  
  // End chunk: take paragraphs from the end
  let endChunk = "";
  for (let i = paragraphs.length - 1; i >= 0 && endChunk.length < targetChunkSize; i--) {
    const para = paragraphs[i];
    if (endChunk.length + para.length > targetChunkSize) {
      break;
    }
    endChunk = para + (endChunk ? "\n\n" : "") + endChunk;
  }
  
  if (endChunk) {
    chunks.push(endChunk);
  }
  
  return chunks.join("\n\n[... section break ...]\n\n");
}

/**
 * Fallback chunking by sentences when paragraph-based chunking isn't suitable
 */
function smartChunkBySentences(text: string, chunkSize: number): string {
  // Split by sentence boundaries (period, exclamation, question mark followed by space)
  const sentences = text.split(/([.!?]\s+)/);
  const chunks: string[] = [];
  
  // Beginning chunk
  let beginningChunk = "";
  for (let i = 0; i < sentences.length && beginningChunk.length < chunkSize; i++) {
    beginningChunk += sentences[i];
  }
  chunks.push(beginningChunk);
  
  // Middle chunk
  const middleStart = Math.floor(sentences.length * 0.4);
  const middleEnd = Math.floor(sentences.length * 0.6);
  const middleChunk = sentences.slice(middleStart, middleEnd).join("");
  if (middleChunk) {
    chunks.push(middleChunk);
  }
  
  // End chunk
  let endChunk = "";
  for (let i = sentences.length - 1; i >= 0 && endChunk.length < chunkSize; i--) {
    endChunk = sentences[i] + endChunk;
  }
  if (endChunk) {
    chunks.push(endChunk);
  }
  
  return chunks.join("\n\n[... section break ...]\n\n");
}

export interface ConceptCandidate {
  title: string;
  content: string;
  summary: string;
  description?: string;
}

export async function generateConceptCandidates(
  text: string,
  instructions: string | undefined,
  maxCandidates: number,
  defaultCreator?: string,
  defaultYear?: string,
  llmClient?: LLMClient,
  configLoader?: ConfigLoader,
): Promise<ConceptCandidate[]> {
  const startTime = Date.now();
  // Use provided instances or fall back to singletons for backward compatibility
  const client = llmClient ?? getLLMClient();
  const config = configLoader ?? getConfigLoader();

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

  // For large documents, use a smarter sampling strategy:
  // - If text is under 50k chars, use it all
  // - If longer, take first 30k, middle 30k, and last 30k (up to 90k total)
  // This ensures we capture content from throughout the document
  let textToAnalyze: string;
  if (text.length <= 50000) {
    textToAnalyze = text;
    logger.debug({
      service: "conceptProposer",
      operation: "generateConceptCandidates",
      strategy: "full_text",
      textToAnalyzeLength: textToAnalyze.length,
    }, "Using full text for analysis");
  } else {
    textToAnalyze = smartChunkText(text, 30000);
    logger.debug({
      service: "conceptProposer",
      operation: "generateConceptCandidates",
      strategy: "smart_chunked",
      textToAnalyzeLength: textToAnalyze.length,
      originalLength: text.length,
    }, "Using smart chunking strategy for large document");
  }

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

Return a JSON object with a "concepts" array:
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

  // Replace template variables
  const prompt = promptTemplate
    .replace(/\{\{maxCandidates\}\}/g, String(maxCandidates))
    .replace(/\{\{textToAnalyze\}\}/g, textToAnalyze)
    .replace(/\{\{instructions\}\}/g, instructionText);

  try {
    logger.debug({
      service: "conceptProposer",
      operation: "generateConceptCandidates",
      promptLength: prompt.length,
      systemPromptLength: systemPrompt.length,
      textToAnalyzeLength: textToAnalyze.length,
    }, "Calling LLM for concept extraction");

    const llmStartTime = Date.now();
    const response = await client.completeJSON(prompt, systemPrompt);
    const llmDuration = Date.now() - llmStartTime;

    logger.info({
      service: "conceptProposer",
      operation: "generateConceptCandidates",
      llmDuration,
      responseKeys: Object.keys(response),
    }, "LLM response received");

    const concepts = (response.concepts as ConceptCandidate[]) ?? [];

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
        responseKeys: Object.keys(response),
        responsePreview: JSON.stringify(response).slice(0, 500),
      }, "LLM returned invalid or empty concepts array");
      logServiceError(
        new Error(`LLM returned invalid or empty concepts array. Response: ${JSON.stringify(response).slice(0, 500)}`),
        "conceptProposer",
        {
          textLength: text.length,
          textToAnalyzeLength: textToAnalyze.length,
          maxCandidates,
          hasInstructions: !!instructions,
          responseKeys: Object.keys(response),
          llmResponsePreview: JSON.stringify(response).slice(0, 2000),
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
          textToAnalyzeLength: textToAnalyze.length,
          maxCandidates,
          conceptsReceived: concepts.length,
          llmResponsePreview: JSON.stringify(response).slice(0, 2000),
        },
      );
      return [];
    }

    const totalDuration = Date.now() - startTime;
    logger.info({
      service: "conceptProposer",
      operation: "generateConceptCandidates",
      totalDuration,
      llmDuration,
      conceptsGenerated: validConcepts.length,
      conceptsTitles: validConcepts.map((c) => c.title),
    }, "Successfully generated concept candidates");

    // Add default metadata if provided
    return validConcepts.map((concept) => ({
      ...concept,
      // Metadata will be added by the caller
    }));
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logger.error({
      service: "conceptProposer",
      operation: "generateConceptCandidates",
      totalDuration,
      error: error instanceof Error ? error.message : String(error),
    }, "Concept generation failed");
    logServiceError(error, "conceptProposer", {
      textLength: text.length,
      textToAnalyzeLength: textToAnalyze.length,
      maxCandidates,
      hasInstructions: !!instructions,
      duration: totalDuration,
      provider: client.getProvider(),
      model: client.getModel(),
    });
    return [];
  }
}

