import { z } from "zod";

// Safety check: Don't crash if 'process' is missing (browser environment)
const processEnv = typeof process !== "undefined" ? process.env : {};

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./dev.db"),
  // Make API keys optional so the schema passes in the browser (where they are missing)
  OPENAI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse({
  DATABASE_URL: processEnv.DATABASE_URL ?? "file:./dev.db",
  OPENAI_API_KEY: processEnv.OPENAI_API_KEY,
  PERPLEXITY_API_KEY: processEnv.PERPLEXITY_API_KEY,
  TAVILY_API_KEY: processEnv.TAVILY_API_KEY,
  GOOGLE_API_KEY: processEnv.GOOGLE_API_KEY,
  NODE_ENV: processEnv.NODE_ENV,
});

