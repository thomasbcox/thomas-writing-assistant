import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Only access process.env in Node.js environments (main process, not renderer)
// Check for window first to detect browser/renderer environments
function getEnvValues() {
  // If window exists, we're in a browser/renderer - return defaults immediately
  // This avoids any reference to process in renderer code
  // Use globalThis to safely check for window without TypeScript errors
  const win = (globalThis as any).window;
  if (typeof win !== "undefined") {
    return {
      DATABASE_URL: "file:./dev.db",
      OPENAI_API_KEY: undefined,
      PERPLEXITY_API_KEY: undefined,
      TAVILY_API_KEY: undefined,
      GOOGLE_API_KEY: undefined,
      NODE_ENV: "development",
    };
  }
  
  // We're in Node.js (main process) - access process.env
  // process should be available in Node.js
  try {
    const proc = (globalThis as any).process;
    if (proc && proc.env) {
      return {
        DATABASE_URL: proc.env.DATABASE_URL ?? "file:./dev.db",
        OPENAI_API_KEY: proc.env.OPENAI_API_KEY,
        PERPLEXITY_API_KEY: proc.env.PERPLEXITY_API_KEY,
        TAVILY_API_KEY: proc.env.TAVILY_API_KEY,
        GOOGLE_API_KEY: proc.env.GOOGLE_API_KEY,
        NODE_ENV: proc.env.NODE_ENV,
      };
    }
  } catch (e) {
    // process is not available, fall through to defaults
  }
  
  // Fallback defaults
  return {
    DATABASE_URL: "file:./dev.db",
    OPENAI_API_KEY: undefined,
    PERPLEXITY_API_KEY: undefined,
    TAVILY_API_KEY: undefined,
    GOOGLE_API_KEY: undefined,
    NODE_ENV: "development",
  };
}

export const env = envSchema.parse(getEnvValues());

