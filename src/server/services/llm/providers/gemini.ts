import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAICacheManager } from "@google/generative-ai/server";
import { ILLMProvider, type ConversationMessage } from "../types";
import { logger } from "~/lib/logger";

export class GeminiProvider implements ILLMProvider {
  private genAI: GoogleGenerativeAI;
  private cacheManager: GoogleAICacheManager;
  private model: string;
  private temperature: number;
  private apiKey: string;
  private availableModels: string[] | null = null;

  constructor(apiKey: string, model: string = "gemini-3-pro-preview", temperature: number = 0.7) {
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable not set");
    }

    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.cacheManager = new GoogleAICacheManager(apiKey);
    this.model = model;
    this.temperature = temperature;
  }

  /**
   * List available models from the Gemini API
   * Falls back to known working models if the API call fails
   */
  async listAvailableModels(): Promise<string[]> {
    if (this.availableModels) {
      return this.availableModels;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }
      const data = (await response.json()) as { models?: Array<{ name: string }> };
      if (data.models) {
        this.availableModels = data.models
          .map((m) => m.name.replace("models/", ""))
          .filter((name) => name.startsWith("gemini-"));
        return this.availableModels;
      }
    } catch (error) {
      // Fallback to known models if API call fails
      logger.warn({ error }, "Failed to list models from API, using fallback list");
    }

    // Fallback list of known models to try (prioritize most capable licensed model)
    // Note: listAvailableModels() will query the API for actual available models
    this.availableModels = [
      "gemini-3-pro-preview",    // Gemini 3 Pro (preview) - most recent, capable - user licensed
      "gemini-1.5-flash",        // Fast, cheap, stable fallback
      "gemini-1.5-flash-002",    // Versioned stable flash
      "gemini-1.5-pro",          // Older pro model
      "gemini-1.5-pro-002",      // Versioned stable pro
      "gemini-2.0-flash-exp",    // Experimental newer model
      "gemini-pro",              // Legacy model (may not work with v1beta)
    ];
    return this.availableModels;
  }

  /**
   * Try to find a working model by attempting fallback models
   * Returns the first model that doesn't throw a 404 error
   */
  async findWorkingModel(): Promise<string | null> {
    // Try models in order of preference (most likely to work)
    const fallbackModels = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-002",
      "gemini-1.5-pro",
      "gemini-1.5-pro-002",
      "gemini-2.0-flash-exp",
      "gemini-pro",
    ];

    // Try to get list from API, but don't fail if it doesn't work
    let availableModels: string[] = [];
    try {
      availableModels = await this.listAvailableModels();
    } catch (error) {
      // If API call fails, just use fallback list
      logger.warn({ error }, "Could not query available models, using fallback list");
    }

    // Prioritize models that are in both lists, then fallback models
    const modelsToTry = [
      ...fallbackModels.filter((m) => availableModels.length === 0 || availableModels.includes(m)),
      ...(availableModels.length > 0
        ? availableModels.filter((m) => !fallbackModels.includes(m))
        : []),
    ];

    // Return the first model in our preferred order
    // We'll let the actual API call determine if it works
    return modelsToTry[0] ?? null;
  }

  setModel(model: string) {
    this.model = model;
  }

  setTemperature(temperature: number) {
    this.temperature = temperature;
  }

  /**
   * Get versioned model name for caching compatibility
   * Caching requires versioned models (e.g., gemini-1.5-flash-001)
   */
  private getVersionedModel(model: string): string {
    // Map unversioned models to versioned equivalents
    const versionMap: Record<string, string> = {
      "gemini-1.5-flash": "gemini-1.5-flash-001",
      "gemini-1.5-pro": "gemini-1.5-pro-001",
      "gemini-3-pro-preview": "gemini-1.5-pro-001", // Fallback to stable version
      "gemini-1.5-flash-002": "gemini-1.5-flash-002",
      "gemini-1.5-pro-002": "gemini-1.5-pro-002",
    };
    
    // If already versioned, return as-is
    if (model.includes("-001") || model.includes("-002")) {
      return model;
    }
    
    return versionMap[model] || "gemini-1.5-flash-001"; // Safe default
  }

  /**
   * Create a context cache for large static content
   * @param content - The static content to cache (e.g., concept descriptions, PDF text)
   * @param ttlSeconds - Time to live in seconds (default 1 hour)
   * @returns Cache resource name to store in database
   */
  async createContextCache(
    content: string,
    ttlSeconds: number = 3600,
  ): Promise<string> {
    // Must use versioned model for caching
    const versionedModel = this.getVersionedModel(this.model);
    
    try {
      const cache = await this.cacheManager.create({
        model: `models/${versionedModel}`,
        displayName: `context_cache_${Date.now()}`,
        ttlSeconds,
        contents: [
          {
            role: "user",
            parts: [{ text: content }],
          },
        ],
      });
      
      return cache.name ?? ""; // e.g., "cachedContents/abc123"
    } catch (error) {
      logger.error({ error, model: versionedModel }, "Failed to create context cache");
      throw error;
    }
  }

  /**
   * Update cache TTL to keep it alive
   * @param cacheName - Cache resource name
   * @param ttlSeconds - New TTL in seconds (default 1 hour)
   */
  async updateCacheTTL(
    cacheName: string,
    ttlSeconds: number = 3600,
  ): Promise<void> {
    try {
      // Use type assertion since the SDK types may not be fully up to date
      await (this.cacheManager as any).update(cacheName, { ttlSeconds });
      logger.debug({ cacheName, ttlSeconds }, "Refreshed cache TTL");
    } catch (error) {
      logger.warn({ error, cacheName }, "Failed to refresh cache TTL");
      // Don't throw - TTL refresh failure shouldn't break requests
    }
  }

  /**
   * Delete an expired cache
   */
  async deleteCache(cacheName: string): Promise<void> {
    try {
      await this.cacheManager.delete(cacheName);
      logger.debug({ cacheName }, "Deleted context cache");
    } catch (error) {
      logger.warn({ error, cacheName }, "Failed to delete cache");
      // Don't throw - cache cleanup failures shouldn't break the app
    }
  }

  async complete(
    prompt: string,
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number,
    conversationHistory?: ConversationMessage[],
    cachedContentName?: string,
  ): Promise<string> {
    // ALWAYS build conversation history text (dynamic content)
    // Cache contains static content (concepts, PDFs), but conversation history is dynamic
    let historyText = "";
    if (conversationHistory && conversationHistory.length > 0) {
      historyText = conversationHistory
        .map((msg) => {
          const rolePrefix = msg.role === "system" 
            ? "[System]" 
            : msg.role === "user" 
            ? "[User]" 
            : "[Assistant]";
          return `${rolePrefix}: ${msg.content}`;
        })
        .join("\n\n");
    }

    // Construct full prompt
    // Cache contains static content (concepts, PDFs)
    // We still send dynamic conversation + new prompt
    let fullPrompt = "";
    if (historyText) {
      fullPrompt = systemPrompt
        ? `${historyText}\n\n[System]: ${systemPrompt}\n\n[User]: ${prompt}`
        : `${historyText}\n\n[User]: ${prompt}`;
    } else {
      fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;
    }

    // Fallback models to try in order (prioritize most capable licensed models first)
    // Order rationale:
    // 1. Most recent stable and capable (gemini-3-pro-preview) - user is licensed for this
    // 2. Fast, cheap, stable models for fallback (gemini-1.5-flash)
    // 3. Versioned stable models (more reliable than -latest)
    // 4. Older pro models
    // 5. Experimental/newer models
    // 6. Legacy models that may not work with v1beta API
    const fallbackModels = [
      "gemini-3-pro-preview",    // Gemini 3 Pro (preview) - most recent, capable - user licensed
      "gemini-1.5-flash",        // Fast, cheap, stable fallback
      "gemini-1.5-flash-002",    // Versioned stable flash
      "gemini-1.5-pro",          // Older pro model
      "gemini-1.5-pro-002",      // Versioned stable pro
      "gemini-2.0-flash-exp",    // Experimental newer model
      "gemini-pro",              // Legacy model (may not work with v1beta)
    ];

    // Start with current model, then try fallbacks
    const modelsToTry = [this.model, ...fallbackModels.filter((m) => m !== this.model)];

    let lastError: Error | null = null;

    for (const modelName of modelsToTry) {
      try {
        const versionedModel = this.getVersionedModel(modelName) ?? modelName;
        
        // Build model config with optional cached content
        const modelConfig: any = {
          model: versionedModel,
          generationConfig: {
            temperature: temperature ?? this.temperature,
            maxOutputTokens: maxTokens,
          },
        };
        
        // If cache exists, reference it instead of sending full context
        if (cachedContentName) {
          modelConfig.cachedContent = { name: cachedContentName, contents: [] };
        }
        
        const model = this.genAI.getGenerativeModel(modelConfig);

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text() ?? "";
        
        // If successful, update our model to this one for future calls
        if (modelName !== this.model) {
          logger.info({ oldModel: this.model, newModel: modelName }, "Switched to working Gemini model");
          this.model = modelName;
        }

        return text;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If it's a 404/model not found error, try next model
        if (errorMessage.includes("404") || errorMessage.includes("not found") || errorMessage.includes("is not found")) {
          logger.warn({ model: modelName, error: errorMessage }, "Model not available, trying next fallback");
          continue; // Try next model
        }
        
        // For other errors, re-throw immediately
        throw error;
      }
    }

    // If we've tried all models and none worked, throw the last error
    throw new Error(`All Gemini models failed. Last error: ${lastError?.message ?? "Unknown error"}`);
  }

  async completeJSON(
    prompt: string,
    systemPrompt?: string,
    conversationHistory?: ConversationMessage[],
    maxRetries: number = 3,
    cachedContentName?: string,
  ): Promise<Record<string, unknown>> {
    // ALWAYS build conversation history text (dynamic content)
    // Cache contains static content (concepts, PDFs), but conversation history is dynamic
    let historyText = "";
    if (conversationHistory && conversationHistory.length > 0) {
      historyText = conversationHistory
        .map((msg) => {
          const rolePrefix = msg.role === "system" 
            ? "[System]" 
            : msg.role === "user" 
            ? "[User]" 
            : "[Assistant]";
          return `${rolePrefix}: ${msg.content}`;
        })
        .join("\n\n");
    }

    // Construct full prompt
    // Cache contains static content (concepts, PDFs)
    // We still send dynamic conversation + new prompt
    let fullPrompt = "";
    if (historyText) {
      fullPrompt = systemPrompt
        ? `${historyText}\n\n[System]: ${systemPrompt}\n\n[User]: ${prompt}`
        : `${historyText}\n\n[User]: ${prompt}`;
    } else {
      fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;
    }

    // Fallback models to try in order (prioritize most capable licensed models first)
    // Order rationale:
    // 1. Most recent stable and capable (gemini-3-pro-preview) - user is licensed for this
    // 2. Fast, cheap, stable models for fallback (gemini-1.5-flash)
    // 3. Versioned stable models (more reliable than -latest)
    // 4. Older pro models
    // 5. Experimental/newer models
    // 6. Legacy models that may not work with v1beta API
    const fallbackModels = [
      "gemini-3-pro-preview",    // Gemini 3 Pro (preview) - most recent, capable - user licensed
      "gemini-1.5-flash",        // Fast, cheap, stable fallback
      "gemini-1.5-flash-002",    // Versioned stable flash
      "gemini-1.5-pro",          // Older pro model
      "gemini-1.5-pro-002",      // Versioned stable pro
      "gemini-2.0-flash-exp",    // Experimental newer model
      "gemini-pro",              // Legacy model (may not work with v1beta)
    ];

    // Start with current model, then try fallbacks
    const modelsToTry = [this.model, ...fallbackModels.filter((m) => m !== this.model)];

    let lastError: Error | null = null;

    for (const modelName of modelsToTry) {
      // Retry logic for each model
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const versionedModel = this.getVersionedModel(modelName) ?? modelName;
          
          // Build model config with optional cached content
          const modelConfig: any = {
            model: versionedModel,
            generationConfig: {
              temperature: this.temperature,
              responseMimeType: "application/json", // Structured output - ensures valid JSON
            },
          };
          
          // If cache exists, reference it instead of sending full context
          if (cachedContentName) {
            modelConfig.cachedContent = { name: cachedContentName, contents: [] };
          }
          
          const model = this.genAI.getGenerativeModel(modelConfig);

          const result = await model.generateContent(fullPrompt);
          const response = await result.response;
          const content = response.text() ?? "{}";
          
          // If successful, update our model to this one for future calls
          if (modelName !== this.model) {
            logger.info({ oldModel: this.model, newModel: modelName }, "Switched to working Gemini model");
            this.model = modelName;
          }

          // Try to parse JSON
          try {
            const parsed = JSON.parse(content) as Record<string, unknown>;
            
            // Validate it's actually an object (not null, array, etc.)
            if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
              throw new Error(`Response is not a JSON object: ${typeof parsed}`);
            }
            
            return parsed;
          } catch (parseError) {
            const parseErr = parseError instanceof Error ? parseError : new Error(String(parseError));
            
            // If this is the last attempt for this model, try next model or throw
            if (attempt === maxRetries - 1) {
              // If this is the last model, throw error
              if (modelName === modelsToTry[modelsToTry.length - 1]) {
                throw new Error(
                  `Failed to parse JSON response after ${maxRetries} attempts with all models. ` +
                  `Last error: ${parseErr.message}. ` +
                  `Response preview: ${content.slice(0, 200)}`
                );
              }
              // Otherwise, break to try next model
              lastError = parseErr;
              break;
            }
            
            // Log and retry with exponential backoff
            logger.warn(
              { model: modelName, attempt: attempt + 1, error: parseErr.message },
              "JSON parse failed, retrying with exponential backoff"
            );
            lastError = parseErr;
            
            // Exponential backoff: wait 1s, 2s, 4s
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // If it's a 404/model not found error, try next model immediately
          if (errorMessage.includes("404") || errorMessage.includes("not found") || errorMessage.includes("is not found")) {
            logger.warn({ model: modelName, error: errorMessage }, "Model not available, trying next fallback");
            break; // Break to try next model
          }
          
          // If it's a JSON parsing error and we have retries left, retry
          if ((errorMessage.includes("parse") || errorMessage.includes("JSON")) && attempt < maxRetries - 1) {
            logger.warn(
              { model: modelName, attempt: attempt + 1, error: errorMessage },
              "JSON parse error, retrying with exponential backoff"
            );
            // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
          
          // For other errors or last attempt, break to try next model or throw
          if (modelName === modelsToTry[modelsToTry.length - 1] && attempt === maxRetries - 1) {
            throw error;
          }
          break; // Try next model
        }
      }
    }

    // If we've tried all models and none worked, throw the last error
    throw new Error(
      `All Gemini models failed after ${maxRetries} attempts each. ` +
      `Last error: ${lastError?.message ?? "Unknown error"}`
    );
  }

  getModel(): string {
    return this.model;
  }

  getTemperature(): number {
    return this.temperature;
  }

  async embed(text: string): Promise<number[]> {
    // Google's embedding API endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: {
          parts: [{ text }],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini embedding API failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as { embedding?: { values?: number[] } };
    return data.embedding?.values ?? [];
  }
}

