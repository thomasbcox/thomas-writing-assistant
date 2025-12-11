import { getLLMClient } from "./llm/client";
import { getConfigLoader } from "./config";
import { logServiceError, logger } from "~/lib/logger";
import type { LLMClient } from "./llm/client";
import type { ConfigLoader } from "./config";

export interface ConceptCandidate {
  title: string;
  coreDefinition: string;
  managerialApplication: string;
  content: string;
  description?: string; // For backward compatibility - will be derived from coreDefinition
  summary?: string; // For backward compatibility
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
    const chunkSize = 30000;
    const first = text.slice(0, chunkSize);
    const middle = text.slice(Math.floor(text.length / 2) - chunkSize / 2, Math.floor(text.length / 2) + chunkSize / 2);
    const last = text.slice(-chunkSize);
    textToAnalyze = `${first}\n\n[... middle section ...]\n\n${middle}\n\n[... end section ...]\n\n${last}`;
    logger.debug({
      service: "conceptProposer",
      operation: "generateConceptCandidates",
      strategy: "sampled",
      textToAnalyzeLength: textToAnalyze.length,
      originalLength: text.length,
      chunkSize,
    }, "Using sampled text strategy for large document");
  }

  const systemPrompt = config.getSystemPrompt(
    "You are extracting foundational mental models, frameworks, and principles that function as discrete, atomic 'Orienting Tools' for managers. Focus on simple, named building blocks that serve as prerequisites for understanding more complex topics.",
  );

  const instructionText = instructions
    ? `\n\nSPECIFIC INSTRUCTIONS:\n${instructions}\n`
    : "";

  const prompt = `Analyze the following text and extract ${maxCandidates} distinct foundational concepts that meet ALL of these criteria:

**PHASE 1: ASSESS AND FILTER (Foundational Utility)**

Harvest ONLY ideas that meet ALL of these criteria:

1. **Singular Model (Atomic):** The idea must represent one distinct, named mental model, framework, or core principle—not a collection of tips or multiple ideas.

2. **Explanatory Structure:** The concept must be a system, process, quadrant, hierarchy, or step-by-step protocol that organizes complexity.

3. **Foundational Utility:** The model is a basic, high-value concept that serves as a necessary prerequisite or anchor for understanding more complex topics (regardless of how "obvious" it seems).

**PHASE 2: EXTRACTION AND FORMATTING (The Atomic Concept Card)**

For each concept that meets the above criteria, extract and format it as follows:

**1. Concept Title (The Noun)**
- Use the official, named model or the most concise, memorable phrase.
- Format: Clear, specific noun phrase (e.g., "The Accountability Loop", "Johari Window", "Growth Mindset").

**2. Core Definition (The Insight)**
- State the function or purpose of the model in 1-3 sentences.
- Provide a brief, authoritative summary of what the model is and what it explains.
- Example: "A four-step cycle (Observe, Orient, Decide, Act) that explains how competitive, dynamic environments actually work, emphasizing that the speed of Orienting (sensemaking) is key to success."

**3. Managerial Application (The Atomic Trigger)**
- State the high-level utility or managerial challenge the model addresses, not the full implementation process.
- Provide a concise action prompt or utility statement.
- Example: "Use this four-step loop (Initiate, Negotiate, Perform, Accept) to ensure mutual agreement on performance, preventing upset and front-loading clarity."

**4. Full Content**
- The complete extracted text from the source material that explains this concept, preserving original formatting when possible.
- Extract directly from the source text when available. Only generate if the source doesn't contain enough detail.

TEXT TO ANALYZE:
${textToAnalyze}
${instructionText}

Return a JSON object with a "concepts" array:
{
  "concepts": [
    {
      "title": "Concept Title (noun phrase, named model)",
      "coreDefinition": "1-3 sentence definition explaining what the model is and what it explains",
      "managerialApplication": "Concise utility statement or action prompt for managers",
      "content": "Full content text extracted from source (or generated if source insufficient)"
    }
  ]
}

IMPORTANT: Only extract concepts that meet ALL three Phase 1 criteria. Skip tips, collections of advice, or ideas without explanatory structure. Prioritize simple, named building blocks over complex multi-part systems.`;

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
          hasCoreDefinition: !!c?.coreDefinition,
          hasManagerialApplication: !!c?.managerialApplication,
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

    // Filter out any invalid concepts and map to new format
    const validConcepts = concepts.filter(
      (c) => 
        c && 
        typeof c.title === "string" && 
        c.title.trim().length > 0 &&
        typeof c.content === "string" &&
        c.content.trim().length > 0 &&
        typeof c.coreDefinition === "string" &&
        c.coreDefinition.trim().length > 0 &&
        typeof c.managerialApplication === "string" &&
        c.managerialApplication.trim().length > 0
    ).map((c) => ({
      title: c.title,
      coreDefinition: c.coreDefinition || c.summary || c.description || "",
      managerialApplication: c.managerialApplication || "",
      content: c.content,
      description: c.coreDefinition || c.description || "", // For backward compatibility
      summary: c.summary || c.coreDefinition || "", // For backward compatibility
    }));

    if (validConcepts.length === 0) {
      logger.warn({
        service: "conceptProposer",
        operation: "generateConceptCandidates",
        conceptsReceived: concepts.length,
        invalidConceptsDetails: concepts.map((c, i) => ({
          index: i,
          concept: c,
          isValid: !!(
            c && 
            typeof c.title === "string" && 
            typeof c.content === "string" &&
            typeof c.coreDefinition === "string" &&
            typeof c.managerialApplication === "string"
          ),
          titleValid: typeof c?.title === "string",
          contentValid: typeof c?.content === "string",
          coreDefinitionValid: typeof c?.coreDefinition === "string",
          managerialApplicationValid: typeof c?.managerialApplication === "string",
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

