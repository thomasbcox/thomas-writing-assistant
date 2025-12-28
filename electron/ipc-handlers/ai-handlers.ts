import { ipcMain } from "electron";
import { z } from "zod";
import { getLLMClient } from "../../src/server/services/llm/client.js";
import { env } from "../../src/env.js";

export function registerAiHandlers() {
  // Get AI settings
  ipcMain.handle("ai:getSettings", async () => {
    const client = getLLMClient();
    return {
      provider: client.getProvider(),
      model: client.getModel(),
      temperature: client.getTemperature(),
      availableProviders: {
        openai: !!env.OPENAI_API_KEY,
        gemini: !!env.GOOGLE_API_KEY,
      },
    };
  });

  // Update AI settings
  ipcMain.handle("ai:updateSettings", async (_event, input: unknown) => {
    const parsed = z.object({
      provider: z.enum(["openai", "gemini"]).optional(),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
    }).parse(input);

    const client = getLLMClient();

    if (parsed.provider) {
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
  });

  // Get available models
  ipcMain.handle("ai:getAvailableModels", async () => {
    const client = getLLMClient();
    const provider = client.getProvider();

    if (provider === "gemini") {
      return {
        provider: "gemini",
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
        provider: "openai",
        models: [
          { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast & Cheap)" },
          { value: "gpt-4o", label: "GPT-4o (Balanced)" },
          { value: "gpt-4-turbo", label: "GPT-4 Turbo (Advanced)" },
          { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Legacy)" },
        ],
      };
    }
  });
}

