import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./dev.db"),
  // Make API keys optional so the schema passes in the browser (where they are missing)
  OPENAI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Helper to safely get process.env (browser-safe)
function getProcessEnv(): Record<string, string | undefined> {
  return typeof process !== "undefined" ? process.env : {};
}

// Create a lazy env object that reads from process.env at access time
// This ensures dotenv has loaded before we read the values
export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(_target, prop: string) {
    const processEnv = getProcessEnv();
    const values = {
      DATABASE_URL: processEnv.DATABASE_URL ?? "file:./dev.db",
      OPENAI_API_KEY: processEnv.OPENAI_API_KEY,
      PERPLEXITY_API_KEY: processEnv.PERPLEXITY_API_KEY,
      TAVILY_API_KEY: processEnv.TAVILY_API_KEY,
      GOOGLE_API_KEY: processEnv.GOOGLE_API_KEY,
      NODE_ENV: (processEnv.NODE_ENV as "development" | "test" | "production") ?? "development",
    };
    return values[prop as keyof typeof values];
  },
});

