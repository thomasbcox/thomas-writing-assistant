import OpenAI from "openai";
export class OpenAIProvider {
    constructor(apiKey, model = "gpt-4o-mini", temperature = 0.7) {
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY environment variable not set");
        }
        this.client = new OpenAI({ apiKey });
        this.model = model;
        this.temperature = temperature;
    }
    setModel(model) {
        this.model = model;
    }
    setTemperature(temperature) {
        this.temperature = temperature;
    }
    async complete(prompt, systemPrompt, maxTokens, temperature) {
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: prompt });
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages,
            temperature: temperature ?? this.temperature,
            max_tokens: maxTokens,
        });
        return response.choices[0]?.message?.content ?? "";
    }
    async completeJSON(prompt, systemPrompt) {
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: prompt });
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages,
            temperature: this.temperature,
            response_format: { type: "json_object" },
        });
        const content = response.choices[0]?.message?.content ?? "{}";
        try {
            return JSON.parse(content);
        }
        catch (error) {
            throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    getModel() {
        return this.model;
    }
    getTemperature() {
        return this.temperature;
    }
}
//# sourceMappingURL=openai.js.map