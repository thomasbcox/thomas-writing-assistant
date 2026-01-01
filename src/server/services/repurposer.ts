import { getLLMClient } from "./llm/client";
import { getConfigLoader } from "./config";
import { logServiceError, logger } from "~/lib/logger";
import type { LLMClient } from "./llm/client";
import type { ConfigLoader } from "./config";

export interface RepurposedContent {
  type: string;
  content: string;
  guidance?: string; // Metadata describing the guidance/rule used to generate this content
}

export async function repurposeAnchorContent(
  anchorTitle: string,
  anchorContent: string,
  painPoints: string[] | null,
  solutionSteps: string[] | null,
  llmClient?: LLMClient,
  configLoader?: ConfigLoader,
): Promise<RepurposedContent[]> {
  const startTime = Date.now();
  // Use provided instances or fall back to singletons for backward compatibility
  const client = llmClient ?? getLLMClient();
  const config = configLoader ?? getConfigLoader();

  // Validate config before generating content
  try {
    config.validateConfigForContentGeneration();
  } catch (error) {
    logServiceError(error, "repurposer", {
      anchorTitle,
      anchorContentLength: anchorContent.length,
    });
    throw error;
  }
  
  logger.info({
    service: "repurposer",
    operation: "repurposeAnchorContent",
    anchorTitle,
    anchorContentLength: anchorContent.length,
    hasPainPoints: !!painPoints,
    painPointsCount: painPoints?.length ?? 0,
    hasSolutionSteps: !!solutionSteps,
    solutionStepsCount: solutionSteps?.length ?? 0,
  }, "Starting content repurposing");

  const systemPromptDefault = "You are repurposing anchor blog content into multiple short-form formats following Jana Osofsky's capsule content strategy.";
  const systemPrompt = config.getSystemPrompt(
    config.getPrompt("repurposer.systemPrompt", systemPromptDefault)
  );

  const painPointsText = painPoints
    ? `\nPain Points:\n${painPoints.map((p) => `- ${p}`).join("\n")}`
    : "";

  const solutionStepsText = solutionSteps
    ? `\nSolution Steps:\n${solutionSteps.map((s) => `- ${s}`).join("\n")}`
    : "";

  const prompt = `Repurpose this anchor blog post into multiple content formats:

ANCHOR POST:
Title: ${anchorTitle}
Content: ${anchorContent.slice(0, 2000)}
${painPointsText}
${solutionStepsText}

Generate the following content types:
1. 5-10 short social posts (concise, engaging, platform-agnostic)
2. 1 email (pain → promise → CTA structure)
3. 1 lead magnet (downloadable resource description)
4. 2-3 Pinterest pins (descriptions optimized for Pinterest)

Response format (structured output will ensure valid JSON):
{
  "social_posts": ["post 1", "post 2", ...],
  "email": "full email content",
  "lead_magnet": "lead magnet description",
  "pinterest_pins": ["pin 1", "pin 2", "pin 3"]
}`;

  try {
    logger.debug({
      service: "repurposer",
      operation: "repurposeAnchorContent",
      promptLength: prompt.length,
      systemPromptLength: systemPrompt.length,
      provider: client.getProvider(),
      model: client.getModel(),
    }, "Calling LLM for content repurposing");

    const llmStartTime = Date.now();
    const response = await client.completeJSON(prompt, systemPrompt);
    const llmDuration = Date.now() - llmStartTime;

    logger.debug({
      service: "repurposer",
      operation: "repurposeAnchorContent",
      llmDuration,
      responseKeys: Object.keys(response),
    }, "LLM response received");

    const repurposed: RepurposedContent[] = [];

    // Social posts
    if (response.social_posts && Array.isArray(response.social_posts)) {
      response.social_posts.forEach((post: string) => {
        repurposed.push({
          type: "social_post",
          content: post,
          guidance: "5-10 short social posts: concise, engaging, platform-agnostic",
        });
      });
      logger.debug({
        service: "repurposer",
        operation: "repurposeAnchorContent",
        socialPostsCount: response.social_posts.length,
      }, "Extracted social posts");
    }

    // Email
    if (response.email) {
      repurposed.push({
        type: "email",
        content: response.email as string,
        guidance: "Email format: pain → promise → CTA structure",
      });
      logger.debug({
        service: "repurposer",
        operation: "repurposeAnchorContent",
      }, "Extracted email content");
    }

    // Lead magnet
    if (response.lead_magnet) {
      repurposed.push({
        type: "lead_magnet",
        content: response.lead_magnet as string,
        guidance: "1 downloadable/lead magnet resource description",
      });
      logger.debug({
        service: "repurposer",
        operation: "repurposeAnchorContent",
      }, "Extracted lead magnet");
    }

    // Pinterest pins
    if (response.pinterest_pins && Array.isArray(response.pinterest_pins)) {
      response.pinterest_pins.forEach((pin: string) => {
        repurposed.push({
          type: "pinterest_pin",
          content: pin,
          guidance: "2-3 Pinterest pins: descriptions optimized for Pinterest",
        });
      });
      logger.debug({
        service: "repurposer",
        operation: "repurposeAnchorContent",
        pinterestPinsCount: response.pinterest_pins.length,
      }, "Extracted Pinterest pins");
    }

    const totalDuration = Date.now() - startTime;
    logger.info({
      service: "repurposer",
      operation: "repurposeAnchorContent",
      totalDuration,
      llmDuration,
      repurposedCount: repurposed.length,
      repurposedTypes: repurposed.map((r) => r.type),
    }, "Content repurposing completed successfully");

    return repurposed;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error({
      service: "repurposer",
      operation: "repurposeAnchorContent",
      totalDuration,
      error: errorMessage,
    }, "Content repurposing failed");
    logServiceError(error, "repurposer", {
      anchorTitle: anchorTitle,
      anchorContentLength: anchorContent.length,
      hasPainPoints: !!painPoints,
      hasSolutionSteps: !!solutionSteps,
      duration: totalDuration,
    });
    
    // Re-throw the error so the caller can handle it
    throw new Error(`Failed to repurpose content: ${errorMessage}`);
  }
}

