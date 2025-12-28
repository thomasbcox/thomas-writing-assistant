import { getLLMClient } from "./llm/client";
import { getConfigLoader } from "./config";
import { logServiceError, logger } from "~/lib/logger";
export async function generateConceptCandidates(text, instructions, maxCandidates, defaultCreator, defaultYear, llmClient, configLoader) {
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
    let textToAnalyze;
    if (text.length <= 50000) {
        textToAnalyze = text;
        logger.debug({
            service: "conceptProposer",
            operation: "generateConceptCandidates",
            strategy: "full_text",
            textToAnalyzeLength: textToAnalyze.length,
        }, "Using full text for analysis");
    }
    else {
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
    const systemPrompt = config.getSystemPrompt("You are analyzing text to extract distinct, standalone concepts. Each concept should be a complete idea that can stand alone.");
    const instructionText = instructions
        ? `\n\nSPECIFIC INSTRUCTIONS:\n${instructions}\n`
        : "";
    const prompt = `Analyze the following text and extract ${maxCandidates} distinct core concepts.

Each concept should be:
- A complete, standalone idea (typically 1-2 pages worth of content)
- Clearly distinct from other concepts
- Have a clear title and summary
- Include the full content text

TEXT TO ANALYZE:
${textToAnalyze}
${instructionText}

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

Extract the content directly from the source text when possible. Only generate content if the source text doesn't contain enough detail.`;
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
        const concepts = response.concepts ?? [];
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
            logServiceError(new Error(`LLM returned invalid or empty concepts array. Response: ${JSON.stringify(response).slice(0, 500)}`), "conceptProposer", {
                textLength: text.length,
                textToAnalyzeLength: textToAnalyze.length,
                maxCandidates,
                hasInstructions: !!instructions,
                responseKeys: Object.keys(response),
                llmResponsePreview: JSON.stringify(response).slice(0, 2000),
            });
            return [];
        }
        // Filter out any invalid concepts
        const validConcepts = concepts.filter((c) => c && typeof c.title === "string" && typeof c.content === "string");
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
            logServiceError(new Error("All concepts were invalid after filtering"), "conceptProposer", {
                textLength: text.length,
                textToAnalyzeLength: textToAnalyze.length,
                maxCandidates,
                conceptsReceived: concepts.length,
                llmResponsePreview: JSON.stringify(response).slice(0, 2000),
            });
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
    }
    catch (error) {
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
//# sourceMappingURL=conceptProposer.js.map