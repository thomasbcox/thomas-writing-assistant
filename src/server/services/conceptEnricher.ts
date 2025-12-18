import { getLLMClient } from "./llm/client";
import { getConfigLoader } from "./config";
import { logServiceError, logger } from "~/lib/logger";
import type { LLMClient } from "./llm/client";
import type { ConfigLoader } from "./config";

export interface ConceptFormData {
  title: string;
  description: string;
  content: string;
  creator: string;
  source: string;
  year: string;
}

export interface AISuggestion {
  id: string;
  field: keyof ConceptFormData;
  currentValue: string;
  suggestedValue: string;
  reason: string;
  confidence?: "high" | "medium" | "low";
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  action: "fetchMetadata" | "expandDefinition" | "addExamples" | "improveClarity" | "findRelated";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: AISuggestion[];
  actions?: QuickAction[];
}

/**
 * Analyze a concept and suggest initial improvements
 */
export async function analyzeConcept(
  conceptData: ConceptFormData,
  llmClient?: LLMClient,
  configLoader?: ConfigLoader,
): Promise<{
  suggestions: AISuggestion[];
  quickActions: QuickAction[];
  initialMessage: string;
}> {
  const client = llmClient ?? getLLMClient();
  const config = configLoader ?? getConfigLoader();

  try {
    const systemPrompt = config.getSystemPrompt(
      "You are an expert knowledge base curator helping enrich concept entries with accurate metadata, clear definitions, and practical applications.",
    );

    const prompt = `Analyze this concept entry and suggest improvements:

Title: ${conceptData.title}
Description: ${conceptData.description || "(empty)"}
Creator: ${conceptData.creator || "(empty)"}
Source: ${conceptData.source || "(empty)"}
Year: ${conceptData.year || "(empty)"}

Provide:
1. Initial greeting suggesting what could be improved
2. Specific suggestions for missing or incomplete fields
3. Quick actions that would be helpful

Format as JSON:
{
  "greeting": "initial message to user",
  "suggestions": [
    {
      "field": "creator",
      "currentValue": "...",
      "suggestedValue": "...",
      "reason": "why this improvement",
      "confidence": "high|medium|low"
    }
  ],
  "quickActions": ["fetchMetadata", "expandDefinition"]
}`;

    const parsed = await client.completeJSON(prompt, systemPrompt);
    const parsedObj = parsed as Record<string, unknown>;

    const suggestions: AISuggestion[] = (Array.isArray(parsedObj.suggestions) ? parsedObj.suggestions : []).map((s: any, idx: number) => ({
      id: `suggestion-${Date.now()}-${idx}`,
      field: s.field as keyof ConceptFormData,
      currentValue: s.currentValue || conceptData[s.field as keyof ConceptFormData] || "",
      suggestedValue: s.suggestedValue,
      reason: s.reason,
      confidence: s.confidence || "medium",
    }));

    const quickActions: QuickAction[] = (Array.isArray(parsedObj.quickActions) ? parsedObj.quickActions : []).map((action: string, idx: number) => ({
      id: `action-${Date.now()}-${idx}`,
      label: getActionLabel(action),
      description: getActionDescription(action),
      action: action as QuickAction["action"],
    }));

    return {
      suggestions,
      quickActions,
      initialMessage: (typeof parsedObj.greeting === "string" ? parsedObj.greeting : null) || "I'm here to help enrich this concept. What would you like to improve?",
    };
  } catch (error) {
    logServiceError(error, "analyzeConcept", { conceptTitle: conceptData.title });
    throw error;
  }
}

/**
 * Fetch metadata (author, year, source) for a concept
 * Uses LLM to search and extract information
 */
export async function enrichMetadata(
  title: string,
  description: string,
  llmClient?: LLMClient,
  configLoader?: ConfigLoader,
): Promise<{
  creator?: string;
  year?: string;
  source?: string;
  sourceUrl?: string;
  confidence: "high" | "medium" | "low";
}> {
  const client = llmClient ?? getLLMClient();
  const config = configLoader ?? getConfigLoader();

  try {
    const systemPrompt = config.getSystemPrompt(
      "You are a research assistant. Use your knowledge to find accurate metadata about concepts, theories, and frameworks. Provide creator names, publication years, and source information.",
    );

    const prompt = `Find metadata for this concept:

Title: ${title}
Description: ${description}

Research and provide:
1. Creator/Author(s) name(s)
2. Original publication year
3. Source (journal, book, paper title, etc.)
4. Confidence level (high/medium/low)

If you find Wikipedia or academic sources, mention them.
Return JSON:
{
  "creator": "Full Name(s)",
  "year": "YYYY",
  "source": "Source Name",
  "sourceUrl": "optional URL",
  "confidence": "high|medium|low",
  "notes": "explanation of findings"
}`;

    const parsed = await client.completeJSON(prompt, systemPrompt);
    const parsedObj = parsed as Record<string, unknown>;

    return {
      creator: typeof parsedObj.creator === "string" ? parsedObj.creator : undefined,
      year: typeof parsedObj.year === "string" ? parsedObj.year : undefined,
      source: typeof parsedObj.source === "string" ? parsedObj.source : undefined,
      sourceUrl: typeof parsedObj.sourceUrl === "string" ? parsedObj.sourceUrl : undefined,
      confidence: (typeof parsedObj.confidence === "string" ? parsedObj.confidence : "medium") as "high" | "medium" | "low",
    };
  } catch (error) {
    logServiceError(error, "enrichMetadata", { conceptTitle: title });
    throw error;
  }
}

/**
 * Conversational enrichment - respond to user message in context
 */
export async function chatEnrichConcept(
  message: string,
  conceptData: ConceptFormData,
  chatHistory: ChatMessage[],
  llmClient?: LLMClient,
  configLoader?: ConfigLoader,
): Promise<{
  response: string;
  suggestions?: AISuggestion[];
  actions?: QuickAction[];
}> {
  const client = llmClient ?? getLLMClient();
  const config = configLoader ?? getConfigLoader();

  try {
    const systemPrompt = config.getSystemPrompt(
      "You are an expert assistant helping to enrich concept entries. You can suggest improvements, fetch information, expand definitions, and help refine content. Be conversational and helpful.",
    );

    const historyText = chatHistory
      .slice(-10) // Last 10 messages for context
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n");

    const conceptContext = `Current Concept:
Title: ${conceptData.title}
Description: ${conceptData.description}
Creator: ${conceptData.creator}
Source: ${conceptData.source}
Year: ${conceptData.year}
Content: ${conceptData.content.substring(0, 500)}...`;

    const prompt = `${conceptContext}

Recent conversation:
${historyText || "(no previous messages)"}

User: ${message}

Respond conversationally. If you're suggesting changes, format them as JSON suggestions:
{
  "response": "your conversational response",
  "suggestions": [
    {
      "field": "fieldName",
      "currentValue": "...",
      "suggestedValue": "...",
      "reason": "why",
      "confidence": "high|medium|low"
    }
  ],
  "actions": ["actionName1", "actionName2"]
}`;

    // Try JSON first, fallback to plain text
    let parsed: any;
    try {
      parsed = await client.completeJSON(prompt, systemPrompt);
      const parsedObj = parsed as Record<string, unknown>;
      return {
        response: (typeof parsedObj.response === "string" ? parsedObj.response : null) || "I've processed your request.",
        suggestions: Array.isArray(parsedObj.suggestions) ? parsedObj.suggestions.map((s: any, idx: number) => ({
          id: `suggestion-${Date.now()}-${idx}`,
          field: s.field as keyof ConceptFormData,
          currentValue: s.currentValue || conceptData[s.field as keyof ConceptFormData] || "",
          suggestedValue: s.suggestedValue,
          reason: s.reason,
          confidence: s.confidence || "medium",
        })) : undefined,
        actions: Array.isArray(parsedObj.actions) ? parsedObj.actions.map((action: string, idx: number) => ({
          id: `action-${Date.now()}-${idx}`,
          label: getActionLabel(action),
          description: getActionDescription(action),
          action: action as QuickAction["action"],
        })) : undefined,
      };
    } catch {
      // Plain text response
      // Fallback to plain text
      const textResponse = await client.complete(prompt, systemPrompt);
      return { response: textResponse };
    }
  } catch (error) {
    logServiceError(error, "chatEnrichConcept", { conceptTitle: conceptData.title });
    throw error;
  }
}

/**
 * Expand a definition using AI
 */
export async function expandDefinition(
  currentDefinition: string,
  conceptTitle: string,
  llmClient?: LLMClient,
  configLoader?: ConfigLoader,
): Promise<string> {
  const client = llmClient ?? getLLMClient();
  const config = configLoader ?? getConfigLoader();

  try {
    const systemPrompt = config.getSystemPrompt(
      "You are an expert at writing clear, concise definitions. Expand definitions while maintaining accuracy and clarity.",
    );

    const prompt = `Expand this definition for "${conceptTitle}":

Current definition: ${currentDefinition}

Provide a more detailed, expanded definition that:
- Maintains the core meaning
- Adds context and clarity
- Is suitable for a knowledge base entry
- Remains concise (2-4 sentences)`;

    const response = await client.complete(prompt, systemPrompt);
    return response.trim();
  } catch (error) {
    logServiceError(error, "expandDefinition", { conceptTitle });
    throw error;
  }
}

// Helper functions
function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    fetchMetadata: "Fetch Metadata",
    expandDefinition: "Expand Definition",
    addExamples: "Add Examples",
    improveClarity: "Improve Clarity",
    findRelated: "Find Related Concepts",
  };
  return labels[action] || action;
}

function getActionDescription(action: string): string {
  const descriptions: Record<string, string> = {
    fetchMetadata: "Look up author, year, and source information",
    expandDefinition: "Enhance the definition with more detail",
    addExamples: "Add practical examples and use cases",
    improveClarity: "Refine the wording for better clarity",
    findRelated: "Search for related concepts in the knowledge base",
  };
  return descriptions[action] || "";
}

