import { ipcMain } from "electron";
import { z } from "zod";
import { logger } from "../../src/lib/logger.js";
import { getLLMClient } from "../../src/server/services/llm/client.js";
import { getConfigLoader } from "../../src/server/services/config.js";
import { analyzeConcept, enrichMetadata, chatEnrichConcept, expandDefinition } from "../../src/server/services/conceptEnricher.js";
import { handleIpc } from "./ipc-wrapper.js";

// Input schemas
const analyzeConceptInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  content: z.string(),
  creator: z.string(),
  source: z.string(),
  year: z.string(),
});

const enrichMetadataInputSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const chatEnrichInputSchema = z.object({
  message: z.string(),
  conceptData: z.object({
    title: z.string(),
    description: z.string(),
    content: z.string(),
    creator: z.string(),
    source: z.string(),
    year: z.string(),
  }),
  chatHistory: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    timestamp: z.string().or(z.date()),
  })),
});

const expandDefinitionInputSchema = z.object({
  currentDefinition: z.string(),
  conceptTitle: z.string(),
});

export function registerEnrichmentHandlers() {
  // Analyze concept
  ipcMain.handle("enrichment:analyze", handleIpc(async (_event, input: unknown) => {
    const parsed = analyzeConceptInputSchema.parse(input);

    logger.info({ operation: "enrichment:analyze", title: parsed.title }, "Analyzing concept for enrichment suggestions");

    const llmClient = getLLMClient();
    const configLoader = getConfigLoader();

    const result = await analyzeConcept(parsed, llmClient, configLoader);

    logger.info({ 
      operation: "enrichment:analyze", 
      title: parsed.title, 
      suggestionsCount: result.suggestions.length,
      actionsCount: result.quickActions.length 
    }, "Concept analysis completed");

    return result;
  }, "enrichment:analyze"));

  // Enrich metadata
  ipcMain.handle("enrichment:enrichMetadata", handleIpc(async (_event, input: unknown) => {
    const parsed = enrichMetadataInputSchema.parse(input);

    logger.info({ operation: "enrichment:enrichMetadata", title: parsed.title }, "Enriching concept metadata");

    const llmClient = getLLMClient();
    const configLoader = getConfigLoader();

    const result = await enrichMetadata(parsed.title, parsed.description, llmClient, configLoader);

    logger.info({ 
      operation: "enrichment:enrichMetadata", 
      title: parsed.title,
      confidence: result.confidence,
      hasCreator: !!result.creator,
      hasYear: !!result.year,
      hasSource: !!result.source
    }, "Metadata enrichment completed");

    return result;
  }, "enrichment:enrichMetadata"));

  // Chat enrichment
  ipcMain.handle("enrichment:chat", handleIpc(async (_event, input: unknown) => {
    const parsed = chatEnrichInputSchema.parse(input);

    logger.info({ 
      operation: "enrichment:chat", 
      title: parsed.conceptData.title,
      historyLength: parsed.chatHistory.length 
    }, "Processing enrichment chat message");

    const llmClient = getLLMClient();
    const configLoader = getConfigLoader();

    // Convert timestamps to Date objects
    const chatHistory = parsed.chatHistory.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));

    const result = await chatEnrichConcept(
      parsed.message,
      parsed.conceptData,
      chatHistory,
      llmClient,
      configLoader
    );

    logger.info({ 
      operation: "enrichment:chat", 
      title: parsed.conceptData.title,
      hasSuggestions: !!result.suggestions?.length,
      hasActions: !!result.actions?.length
    }, "Chat enrichment completed");

    return result;
  }, "enrichment:chat"));

  // Expand definition
  ipcMain.handle("enrichment:expandDefinition", handleIpc(async (_event, input: unknown) => {
    const parsed = expandDefinitionInputSchema.parse(input);

    logger.info({ operation: "enrichment:expandDefinition", title: parsed.conceptTitle }, "Expanding concept definition");

    const llmClient = getLLMClient();
    const configLoader = getConfigLoader();

    const result = await expandDefinition(
      parsed.currentDefinition,
      parsed.conceptTitle,
      llmClient,
      configLoader
    );

    logger.info({ 
      operation: "enrichment:expandDefinition", 
      title: parsed.conceptTitle,
      originalLength: parsed.currentDefinition.length,
      expandedLength: result.length
    }, "Definition expansion completed");

    return { expandedDefinition: result };
  }, "enrichment:expandDefinition"));
}

