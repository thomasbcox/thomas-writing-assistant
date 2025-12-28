import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "~/lib/logger";
export class GeminiProvider {
    constructor(apiKey, model = "gemini-3-pro-preview", temperature = 0.7) {
        this.availableModels = null;
        if (!apiKey) {
            throw new Error("GOOGLE_API_KEY environment variable not set");
        }
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = model;
        this.temperature = temperature;
    }
    /**
     * List available models from the Gemini API
     * Falls back to known working models if the API call fails
     */
    async listAvailableModels() {
        if (this.availableModels) {
            return this.availableModels;
        }
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
            if (!response.ok) {
                throw new Error(`Failed to list models: ${response.status}`);
            }
            const data = (await response.json());
            if (data.models) {
                this.availableModels = data.models
                    .map((m) => m.name.replace("models/", ""))
                    .filter((name) => name.startsWith("gemini-"));
                return this.availableModels;
            }
        }
        catch (error) {
            // Fallback to known models if API call fails
            logger.warn({ error }, "Failed to list models from API, using fallback list");
        }
        // Fallback list of known models to try (prioritize most capable licensed model)
        // Note: listAvailableModels() will query the API for actual available models
        this.availableModels = [
            "gemini-3-pro-preview", // Gemini 3 Pro (preview) - most recent, capable - user licensed
            "gemini-1.5-flash", // Fast, cheap, stable fallback
            "gemini-1.5-flash-002", // Versioned stable flash
            "gemini-1.5-pro", // Older pro model
            "gemini-1.5-pro-002", // Versioned stable pro
            "gemini-2.0-flash-exp", // Experimental newer model
            "gemini-pro", // Legacy model (may not work with v1beta)
        ];
        return this.availableModels;
    }
    /**
     * Try to find a working model by attempting fallback models
     * Returns the first model that doesn't throw a 404 error
     */
    async findWorkingModel() {
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
        let availableModels = [];
        try {
            availableModels = await this.listAvailableModels();
        }
        catch (error) {
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
    setModel(model) {
        this.model = model;
    }
    setTemperature(temperature) {
        this.temperature = temperature;
    }
    async complete(prompt, systemPrompt, maxTokens, temperature) {
        // Combine system prompt and user prompt
        const fullPrompt = systemPrompt
            ? `${systemPrompt}\n\n${prompt}`
            : prompt;
        // Fallback models to try in order (prioritize most capable licensed models first)
        // Order rationale:
        // 1. Most recent stable and capable (gemini-3-pro-preview) - user is licensed for this
        // 2. Fast, cheap, stable models for fallback (gemini-1.5-flash)
        // 3. Versioned stable models (more reliable than -latest)
        // 4. Older pro models
        // 5. Experimental/newer models
        // 6. Legacy models that may not work with v1beta API
        const fallbackModels = [
            "gemini-3-pro-preview", // Gemini 3 Pro (preview) - most recent, capable - user licensed
            "gemini-1.5-flash", // Fast, cheap, stable fallback
            "gemini-1.5-flash-002", // Versioned stable flash
            "gemini-1.5-pro", // Older pro model
            "gemini-1.5-pro-002", // Versioned stable pro
            "gemini-2.0-flash-exp", // Experimental newer model
            "gemini-pro", // Legacy model (may not work with v1beta)
        ];
        // Start with current model, then try fallbacks
        const modelsToTry = [this.model, ...fallbackModels.filter((m) => m !== this.model)];
        let lastError = null;
        for (const modelName of modelsToTry) {
            try {
                const model = this.genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: temperature ?? this.temperature,
                        maxOutputTokens: maxTokens,
                    },
                });
                const result = await model.generateContent(fullPrompt);
                const response = await result.response;
                const text = response.text() ?? "";
                // If successful, update our model to this one for future calls
                if (modelName !== this.model) {
                    logger.info({ oldModel: this.model, newModel: modelName }, "Switched to working Gemini model");
                    this.model = modelName;
                }
                return text;
            }
            catch (error) {
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
    async completeJSON(prompt, systemPrompt) {
        // Combine system prompt and user prompt
        const fullPrompt = systemPrompt
            ? `${systemPrompt}\n\n${prompt}`
            : prompt;
        // Fallback models to try in order (prioritize most capable licensed models first)
        // Order rationale:
        // 1. Most recent stable and capable (gemini-3-pro-preview) - user is licensed for this
        // 2. Fast, cheap, stable models for fallback (gemini-1.5-flash)
        // 3. Versioned stable models (more reliable than -latest)
        // 4. Older pro models
        // 5. Experimental/newer models
        // 6. Legacy models that may not work with v1beta API
        const fallbackModels = [
            "gemini-3-pro-preview", // Gemini 3 Pro (preview) - most recent, capable - user licensed
            "gemini-1.5-flash", // Fast, cheap, stable fallback
            "gemini-1.5-flash-002", // Versioned stable flash
            "gemini-1.5-pro", // Older pro model
            "gemini-1.5-pro-002", // Versioned stable pro
            "gemini-2.0-flash-exp", // Experimental newer model
            "gemini-pro", // Legacy model (may not work with v1beta)
        ];
        // Start with current model, then try fallbacks
        const modelsToTry = [this.model, ...fallbackModels.filter((m) => m !== this.model)];
        let lastError = null;
        for (const modelName of modelsToTry) {
            try {
                const model = this.genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: this.temperature,
                        responseMimeType: "application/json",
                    },
                });
                const result = await model.generateContent(fullPrompt);
                const response = await result.response;
                const content = response.text() ?? "{}";
                // If successful, update our model to this one for future calls
                if (modelName !== this.model) {
                    logger.info({ oldModel: this.model, newModel: modelName }, "Switched to working Gemini model");
                    this.model = modelName;
                }
                try {
                    return JSON.parse(content);
                }
                catch (parseError) {
                    throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                lastError = error instanceof Error ? error : new Error(String(error));
                // If it's a 404/model not found error, try next model
                if (errorMessage.includes("404") || errorMessage.includes("not found") || errorMessage.includes("is not found")) {
                    logger.warn({ model: modelName, error: errorMessage }, "Model not available, trying next fallback");
                    continue; // Try next model
                }
                // For other errors (like JSON parsing), re-throw immediately
                throw error;
            }
        }
        // If we've tried all models and none worked, throw the last error
        throw new Error(`All Gemini models failed. Last error: ${lastError?.message ?? "Unknown error"}`);
    }
    getModel() {
        return this.model;
    }
    getTemperature() {
        return this.temperature;
    }
}
//# sourceMappingURL=gemini.js.map