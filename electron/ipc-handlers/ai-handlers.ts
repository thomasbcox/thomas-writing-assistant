import { ipcMain } from "electron";
import { z } from "zod";
import { appendFileSync } from "fs";
import { getLLMClient } from "../../src/server/services/llm/client.js";
import { env } from "../../src/env.js";

export function registerAiHandlers() {
  // Get AI settings
  ipcMain.handle("ai:getSettings", async () => {
    const hasOpenAI = !!env.OPENAI_API_KEY;
    const hasGemini = !!env.GOOGLE_API_KEY;
    
    // #region agent log
    appendFileSync('/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log', JSON.stringify({location:'ai-handlers.ts:13',message:'ai:getSettings called',data:{hasOpenAI,hasGemini,envOpenAI:env.OPENAI_API_KEY?'SET':'UNSET',envGoogle:env.GOOGLE_API_KEY?'SET':'UNSET',processEnvOpenAI:process.env.OPENAI_API_KEY?'SET':'UNSET',processEnvGoogle:process.env.GOOGLE_API_KEY?'SET':'UNSET'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'}) + '\n');
    // #endregion
    
    // If no API keys are available, return default settings
    if (!hasOpenAI && !hasGemini) {
      return {
        provider: "openai" as const,
        model: "gpt-4o-mini",
        temperature: 0.7,
        availableProviders: {
          openai: false,
          gemini: false,
        },
      };
    }
    
    try {
      const client = getLLMClient();
      return {
        provider: client.getProvider(),
        model: client.getModel(),
        temperature: client.getTemperature(),
        availableProviders: {
          openai: hasOpenAI,
          gemini: hasGemini,
        },
      };
    } catch (error) {
      // Fallback if client creation fails
      return {
        provider: hasGemini ? ("gemini" as const) : ("openai" as const),
        model: hasGemini ? "gemini-3-pro-preview" : "gpt-4o-mini",
        temperature: 0.7,
        availableProviders: {
          openai: hasOpenAI,
          gemini: hasGemini,
        },
      };
    }
  });

  // Update AI settings
  ipcMain.handle("ai:updateSettings", async (_event, input: unknown) => {
    const parsed = z.object({
      provider: z.enum(["openai", "gemini"]).optional(),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
    }).parse(input);

    const hasOpenAI = !!env.OPENAI_API_KEY;
    const hasGemini = !!env.GOOGLE_API_KEY;
    
    // If no API keys are available, return error
    if (!hasOpenAI && !hasGemini) {
      throw new Error("No LLM provider API keys found. Set OPENAI_API_KEY or GOOGLE_API_KEY in your .env file.");
    }

    try {
      const client = getLLMClient();

      if (parsed.provider) {
        // Validate that the provider has an API key
        if (parsed.provider === "gemini" && !hasGemini) {
          throw new Error("GOOGLE_API_KEY not set. Cannot use Gemini provider.");
        }
        if (parsed.provider === "openai" && !hasOpenAI) {
          throw new Error("OPENAI_API_KEY not set. Cannot use OpenAI provider.");
        }
        client.setProvider(parsed.provider);
      }

      if (parsed.model) {
        client.setModel(parsed.model);
      }

      if (parsed.temperature !== undefined) {
        client.setTemperature(parsed.temperature);
      }

      return {
        provider: client.getProvider(),
        model: client.getModel(),
        temperature: client.getTemperature(),
      };
    } catch (error) {
      // Re-throw with more context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to update AI settings");
    }
  });

  // Get available models
  ipcMain.handle("ai:getAvailableModels", async () => {
    const hasOpenAI = !!env.OPENAI_API_KEY;
    const hasGemini = !!env.GOOGLE_API_KEY;
    
    // If no API keys are available, return OpenAI models as default
    if (!hasOpenAI && !hasGemini) {
      return {
        provider: "openai" as const,
        models: [
          { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast & Cheap)" },
          { value: "gpt-4o", label: "GPT-4o (Balanced)" },
          { value: "gpt-4-turbo", label: "GPT-4 Turbo (Advanced)" },
          { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Legacy)" },
        ],
      };
    }
    
    try {
      const client = getLLMClient();
      const provider = client.getProvider();

      if (provider === "gemini") {
        return {
          provider: "gemini" as const,
          models: [
            { value: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview (Latest & Most Capable - Recommended)" },
            { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Fast & Cheap)" },
            { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Advanced)" },
            { value: "gemini-1.5-flash-002", label: "Gemini 1.5 Flash 002 (Stable)" },
            { value: "gemini-1.5-pro-002", label: "Gemini 1.5 Pro 002 (Stable)" },
            { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash Exp (Experimental)" },
            { value: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash Latest (May not work)" },
            { value: "gemini-pro", label: "Gemini Pro (Legacy - may not work with v1beta)" },
          ],
        };
      } else {
        return {
          provider: "openai" as const,
          models: [
            { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast & Cheap)" },
            { value: "gpt-4o", label: "GPT-4o (Balanced)" },
            { value: "gpt-4-turbo", label: "GPT-4 Turbo (Advanced)" },
            { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Legacy)" },
          ],
        };
      }
    } catch (error) {
      // Fallback: return models for the provider that has API keys, or OpenAI as default
      if (hasGemini) {
        return {
          provider: "gemini" as const,
          models: [
            { value: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview (Latest & Most Capable - Recommended)" },
            { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Fast & Cheap)" },
            { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Advanced)" },
            { value: "gemini-1.5-flash-002", label: "Gemini 1.5 Flash 002 (Stable)" },
            { value: "gemini-1.5-pro-002", label: "Gemini 1.5 Pro 002 (Stable)" },
            { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash Exp (Experimental)" },
            { value: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash Latest (May not work)" },
            { value: "gemini-pro", label: "Gemini Pro (Legacy - may not work with v1beta)" },
          ],
        };
      } else {
        return {
          provider: "openai" as const,
          models: [
            { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast & Cheap)" },
            { value: "gpt-4o", label: "GPT-4o (Balanced)" },
            { value: "gpt-4-turbo", label: "GPT-4 Turbo (Advanced)" },
            { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Legacy)" },
          ],
        };
      }
    }
  });

  // Get embedding status
  ipcMain.handle("ai:getEmbeddingStatus", async () => {
    const { getEmbeddingStatus } = await import("../../src/server/services/embeddingOrchestrator.js");
    return await getEmbeddingStatus();
  });

  // Generate missing embeddings (manual trigger)
  ipcMain.handle("ai:generateMissingEmbeddings", async (_event, input: unknown) => {
    const parsed = z.object({
      batchSize: z.number().min(1).max(100).optional(),
    }).parse(input);

    const { checkAndGenerateMissing } = await import("../../src/server/services/embeddingOrchestrator.js");
    await checkAndGenerateMissing(parsed.batchSize ?? 10);
    
    // Return updated status
    const { getEmbeddingStatus } = await import("../../src/server/services/embeddingOrchestrator.js");
    return await getEmbeddingStatus();
  });

  // Retry failed embeddings (manual trigger for recovery)
  ipcMain.handle("ai:retryFailedEmbeddings", async (_event, input: unknown) => {
    const parsed = z.object({
      batchSize: z.number().min(1).max(100).optional(),
    }).parse(input);

    const { checkAndGenerateMissing } = await import("../../src/server/services/embeddingOrchestrator.js");
    
    // This will automatically retry concepts without embeddings
    await checkAndGenerateMissing(parsed.batchSize ?? 10);
    
    // Return updated status
    const { getEmbeddingStatus } = await import("../../src/server/services/embeddingOrchestrator.js");
    return await getEmbeddingStatus();
  });
}

