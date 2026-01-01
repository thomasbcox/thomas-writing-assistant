import { getLLMClient } from "./llm/client";
import { getConfigLoader } from "./config";
import { logServiceError, logger } from "~/lib/logger";
import type { LLMClient } from "./llm/client";
import type { ConfigLoader } from "./config";

export interface BlogPostInput {
  title?: string; // Optional: user can provide a title or let AI generate one
  topic: string; // Main topic or theme
  conceptIds: string[]; // Concepts to reference and weave into the post
  targetLength?: "short" | "medium" | "long"; // Target length: ~500, ~1500, ~3000 words
  tone?: "informative" | "conversational" | "authoritative" | "personal";
  includeCTA?: boolean; // Whether to include a call-to-action
  ctaText?: string; // Custom CTA text if provided
}

export interface BlogPost {
  title: string;
  introduction: string;
  body: string; // Main content, can include multiple sections
  conclusion: string;
  cta?: string; // Call-to-action if requested
  metadata?: {
    estimatedWordCount: number;
    conceptsReferenced: string[];
    tone: string;
  };
}

export interface ConceptReference {
  id: string;
  title: string;
  description: string;
  content: string;
  creator?: string;
  source?: string;
}

/**
 * Generate a blog post from concepts, following the user's style guide, credo, and constraints
 */
export async function generateBlogPost(
  input: BlogPostInput,
  conceptReferences: ConceptReference[],
  llmClient?: LLMClient,
  configLoader?: ConfigLoader,
): Promise<BlogPost> {
  const startTime = Date.now();
  const client = llmClient ?? getLLMClient();
  const config = configLoader ?? getConfigLoader();

  // Validate config before generating content
  try {
    config.validateConfigForContentGeneration();
  } catch (error) {
    logServiceError(error, "blogPostGenerator", {
      topic: input.topic,
      conceptCount: conceptReferences.length,
    });
    throw error;
  }

  logger.info({
    service: "blogPostGenerator",
    operation: "generateBlogPost",
    topic: input.topic,
    conceptCount: conceptReferences.length,
    targetLength: input.targetLength ?? "medium",
    hasTitle: !!input.title,
    includeCTA: input.includeCTA ?? false,
  }, "Starting blog post generation");

  const systemPromptDefault = "You are an expert blog post writer creating high-quality, engaging blog posts that maintain the author's unique voice, values, and perspective.";
  const systemPrompt = config.getSystemPrompt(
    config.getPrompt("blogPostGenerator.systemPrompt", systemPromptDefault)
  );

  // Build concept context
  const conceptsContext = conceptReferences
    .map(
      (concept) => `
CONCEPT: ${concept.title}
Description: ${concept.description || "N/A"}
Content: ${concept.content.slice(0, 500)}${concept.content.length > 500 ? "..." : ""}
${concept.creator ? `Creator: ${concept.creator}` : ""}
${concept.source ? `Source: ${concept.source}` : ""}
`,
    )
    .join("\n---\n");

  // Determine target word count
  const wordCountTargets = {
    short: "approximately 500-800 words",
    medium: "approximately 1500-2000 words",
    long: "approximately 3000-4000 words",
  };
  const wordCountTarget = wordCountTargets[input.targetLength ?? "medium"];

  // Build tone instruction
  const toneInstructions = {
    informative: "Write in an informative, educational tone. Focus on clarity and providing value.",
    conversational: "Write in a conversational, friendly tone. Use 'you' and 'I' naturally.",
    authoritative: "Write in an authoritative, expert tone. Demonstrate deep knowledge and confidence.",
    personal: "Write in a personal, authentic tone. Share insights and experiences naturally.",
  };
  const toneInstruction = toneInstructions[input.tone ?? "conversational"];

  const prompt = `Generate a complete blog post following these specifications:

TOPIC: ${input.topic}
${input.title ? `TITLE: ${input.title}` : "Generate an engaging, SEO-friendly title"}
TARGET LENGTH: ${wordCountTarget}
TONE: ${toneInstruction}

CONCEPTS TO REFERENCE:
${conceptsContext}

REQUIREMENTS:
1. Create a compelling introduction that hooks the reader
2. Develop the main body with clear sections that weave in the referenced concepts naturally
3. Write a strong conclusion that ties everything together
4. ${input.includeCTA ? `Include a call-to-action${input.ctaText ? `: "${input.ctaText}"` : ""}` : "Do not include a call-to-action"}
5. Maintain consistency with the author's style guide, values, and constraints
6. Make the content engaging, valuable, and authentic

Response format (structured output will ensure valid JSON):
{
  "title": "blog post title",
  "introduction": "compelling introduction paragraph(s)",
  "body": "main content with multiple sections (use \\n\\n for paragraph breaks, \\n\\n## for section headers)",
  "conclusion": "strong conclusion paragraph(s)",
  ${input.includeCTA ? '"cta": "call-to-action text",' : ""}
  "estimatedWordCount": number,
  "conceptsReferenced": ["concept title 1", "concept title 2"]
}`;

  try {
    logger.debug({
      service: "blogPostGenerator",
      operation: "generateBlogPost",
      promptLength: prompt.length,
      systemPromptLength: systemPrompt.length,
      provider: client.getProvider(),
      model: client.getModel(),
    }, "Calling LLM for blog post generation");

    const llmStartTime = Date.now();
    const response = await client.completeJSON(prompt, systemPrompt);
    const llmDuration = Date.now() - llmStartTime;

    logger.debug({
      service: "blogPostGenerator",
      operation: "generateBlogPost",
      llmDuration,
      responseKeys: Object.keys(response),
    }, "LLM response received");

    // Validate and structure the response
    if (!response.title || !response.introduction || !response.body || !response.conclusion) {
      throw new Error("LLM response missing required fields");
    }

    const blogPost: BlogPost = {
      title: response.title as string,
      introduction: response.introduction as string,
      body: response.body as string,
      conclusion: response.conclusion as string,
      metadata: {
        estimatedWordCount: response.estimatedWordCount as number ?? 0,
        conceptsReferenced: (response.conceptsReferenced as string[]) ?? [],
        tone: input.tone ?? "conversational",
      },
    };

    if (input.includeCTA && response.cta) {
      blogPost.cta = response.cta as string;
    }

    const totalDuration = Date.now() - startTime;
    logger.info({
      service: "blogPostGenerator",
      operation: "generateBlogPost",
      totalDuration,
      llmDuration,
      wordCount: blogPost.metadata?.estimatedWordCount,
      conceptsUsed: blogPost.metadata?.conceptsReferenced.length,
    }, "Blog post generation completed successfully");

    return blogPost;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error({
      service: "blogPostGenerator",
      operation: "generateBlogPost",
      totalDuration,
      error: errorMessage,
    }, "Blog post generation failed");
    logServiceError(error, "blogPostGenerator", {
      topic: input.topic,
      conceptCount: conceptReferences.length,
      targetLength: input.targetLength,
      duration: totalDuration,
    });

    throw new Error(`Failed to generate blog post: ${errorMessage}`);
  }
}
