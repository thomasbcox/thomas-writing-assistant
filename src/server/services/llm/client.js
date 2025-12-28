import { env } from "~/env";
import { OpenAIProvider } from "./providers/openai";
import { GeminiProvider } from "./providers/gemini";
/**
 * Unified LLM Client that supports multiple providers
 */
export class LLMClient {
    constructor(config) {
        const provider = config?.provider ?? this.getDefaultProvider();
        const model = config?.model ?? this.getDefaultModel(provider);
        const temperature = config?.temperature ?? 0.7;
        this.providerType = provider;
        this.model = model;
        this.temperature = temperature;
        // Initialize the appropriate provider
        if (provider === "gemini") {
            if (!env.GOOGLE_API_KEY) {
                throw new Error("GOOGLE_API_KEY environment variable not set. Set it to use Gemini.");
            }
            this.provider = new GeminiProvider(env.GOOGLE_API_KEY, model, temperature);
        }
        else {
            // Default to OpenAI
            if (!env.OPENAI_API_KEY) {
                throw new Error("OPENAI_API_KEY environment variable not set. Set it to use OpenAI.");
            }
            this.provider = new OpenAIProvider(env.OPENAI_API_KEY, model, temperature);
        }
    }
    /**
     * Determine default provider based on available API keys
     */
    getDefaultProvider() {
        // Prefer Gemini if available, fallback to OpenAI
        if (env.GOOGLE_API_KEY) {
            return "gemini";
        }
        if (env.OPENAI_API_KEY) {
            return "openai";
        }
        throw new Error("No LLM provider API keys found. Set OPENAI_API_KEY or GOOGLE_API_KEY.");
    }
    /**
     * Get default model for provider
     */
    getDefaultModel(provider) {
        if (provider === "gemini") {
            // Use gemini-3-pro-preview as default (most recent, capable - user is licensed)
            // This is the correct API identifier per Google's documentation
            return "gemini-3-pro-preview";
        }
        return "gpt-4o-mini";
    }
    setModel(model) {
        this.model = model;
        if (this.provider instanceof OpenAIProvider || this.provider instanceof GeminiProvider) {
            this.provider.setModel(model);
        }
    }
    setTemperature(temperature) {
        this.temperature = temperature;
        if (this.provider instanceof OpenAIProvider || this.provider instanceof GeminiProvider) {
            this.provider.setTemperature(temperature);
        }
    }
    setProvider(provider) {
        if (provider === this.providerType) {
            return; // Already using this provider
        }
        this.providerType = provider;
        const model = this.getDefaultModel(provider);
        if (provider === "gemini") {
            if (!env.GOOGLE_API_KEY) {
                throw new Error("GOOGLE_API_KEY environment variable not set");
            }
            this.provider = new GeminiProvider(env.GOOGLE_API_KEY, model, this.temperature);
        }
        else {
            if (!env.OPENAI_API_KEY) {
                throw new Error("OPENAI_API_KEY environment variable not set");
            }
            this.provider = new OpenAIProvider(env.OPENAI_API_KEY, model, this.temperature);
        }
    }
    getProvider() {
        return this.providerType;
    }
    getModel() {
        return this.model;
    }
    getTemperature() {
        return this.temperature;
    }
    async complete(prompt, systemPrompt, maxTokens, temperature) {
        return this.provider.complete(prompt, systemPrompt, maxTokens, temperature);
    }
    async completeJSON(prompt, systemPrompt) {
        return this.provider.completeJSON(prompt, systemPrompt);
    }
}
// Singleton instance
let llmClientInstance = null;
export function getLLMClient() {
    if (!llmClientInstance) {
        llmClientInstance = new LLMClient();
    }
    return llmClientInstance;
}
/**
 * Reset the singleton (useful for testing)
 */
export function resetLLMClient() {
    llmClientInstance = null;
}
//# sourceMappingURL=client.js.map