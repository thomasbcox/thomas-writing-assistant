import { getLLMClient } from "./llm/client";
import { getConfigLoader } from "./config";
import { logger, logServiceError } from "~/lib/logger";
import type { LLMClient } from "./llm/client";
import type { ConfigLoader } from "./config";

export interface ExtractedAnchorMetadata {
  title: string;
  painPoints: string[];
  solutionSteps: string[];
  proof?: string;
}

export async function extractAnchorMetadata(
  pdfContent: string,
  llmClient?: LLMClient,
  configLoader?: ConfigLoader,
): Promise<ExtractedAnchorMetadata> {
  const startTime = Date.now();
  // Use provided instances or fall back to singletons for backward compatibility
  const client = llmClient ?? getLLMClient();
  const config = configLoader ?? getConfigLoader();

  // Validate config before generating content
  try {
    config.validateConfigForContentGeneration();
  } catch (error) {
    logServiceError(error, "anchorExtractor", {
      contentLength: pdfContent.length,
    });
    throw error;
  }

  logger.info({
    service: "anchorExtractor",
    operation: "extractAnchorMetadata",
    contentLength: pdfContent.length,
  }, "Starting anchor metadata extraction");

  const systemPromptDefault = "You are analyzing a blog post or article to extract key metadata for capsule content strategy. Extract the title, pain points, solution steps, and proof points.";
  const systemPrompt = config.getSystemPrompt(
    config.getPrompt("anchorExtractor.systemPrompt", systemPromptDefault)
  );

  // Truncate content if too long (keep first 4000 chars for analysis)
  const contentPreview = pdfContent.slice(0, 4000);
  const isTruncated = pdfContent.length > 4000;

  const prompt = `Analyze this blog post/article and extract key metadata:

${isTruncated ? "[Content truncated for analysis]\n\n" : ""}${contentPreview}

Extract the following:
1. **Title**: A compelling, SEO-friendly title for this anchor post
2. **Pain Points**: 3-5 specific pain points or problems this content addresses (as a JSON array)
3. **Solution Steps**: 3-7 key solution steps or takeaways (as a JSON array)
4. **Proof** (optional): Any proof points, statistics, or evidence mentioned

Return a JSON object:
{
  "title": "extracted title",
  "painPoints": ["pain point 1", "pain point 2", ...],
  "solutionSteps": ["step 1", "step 2", ...],
  "proof": "proof points if available"
}`;

  try {
    logger.debug({
      service: "anchorExtractor",
      operation: "extractAnchorMetadata",
      promptLength: prompt.length,
      systemPromptLength: systemPrompt.length,
      provider: client.getProvider(),
      model: client.getModel(),
    }, "Calling LLM for metadata extraction");

    const llmStartTime = Date.now();
    const response = await client.completeJSON(prompt, systemPrompt);
    const llmDuration = Date.now() - llmStartTime;

    logger.debug({
      service: "anchorExtractor",
      operation: "extractAnchorMetadata",
      llmDuration,
      responseKeys: Object.keys(response),
    }, "LLM response received");

    // Validate and extract metadata
    const title = typeof response.title === "string" && response.title.trim()
      ? response.title.trim()
      : "Untitled Anchor Post";

    const painPoints = Array.isArray(response.painPoints)
      ? response.painPoints
          .filter((p: unknown) => typeof p === "string" && p.trim())
          .map((p: string) => p.trim())
      : [];

    const solutionSteps = Array.isArray(response.solutionSteps)
      ? response.solutionSteps
          .filter((s: unknown) => typeof s === "string" && s.trim())
          .map((s: string) => s.trim())
      : [];

    const proof =
      typeof response.proof === "string" && response.proof.trim()
        ? response.proof.trim()
        : undefined;

    const totalDuration = Date.now() - startTime;
    logger.info({
      service: "anchorExtractor",
      operation: "extractAnchorMetadata",
      totalDuration,
      llmDuration,
      title,
      painPointsCount: painPoints.length,
      solutionStepsCount: solutionSteps.length,
      hasProof: !!proof,
    }, "Anchor metadata extraction completed successfully");

    return {
      title,
      painPoints,
      solutionSteps,
      proof,
    };
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error({
      service: "anchorExtractor",
      operation: "extractAnchorMetadata",
      totalDuration,
      error: errorMessage,
    }, "Anchor metadata extraction failed");

    // Re-throw the error so the caller can handle it
    throw new Error(`Failed to extract anchor metadata: ${errorMessage}`);
  }
}

