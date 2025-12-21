import { defineConfig } from "drizzle-kit";

// Extract file path from DATABASE_URL (format: "file:./dev.db")
const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const dbPath = dbUrl.replace("file:", "");

export default defineConfig({
  schema: "./src/server/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});
