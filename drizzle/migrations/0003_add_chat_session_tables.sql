-- Migration: Add ChatSession and ChatMessage tables
-- These tables enable persisting enrichment chat conversations per concept

-- Create ChatSession table
CREATE TABLE IF NOT EXISTS "ChatSession" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "conceptId" TEXT NOT NULL REFERENCES "Concept"("id") ON DELETE CASCADE,
  "title" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch()),
  "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create indexes for ChatSession
CREATE INDEX IF NOT EXISTS "ChatSession_conceptId_idx" ON "ChatSession" ("conceptId");
CREATE INDEX IF NOT EXISTS "ChatSession_updatedAt_idx" ON "ChatSession" ("updatedAt");

-- Create ChatMessage table
CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "sessionId" TEXT NOT NULL REFERENCES "ChatSession"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "suggestions" TEXT,
  "actions" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create indexes for ChatMessage
CREATE INDEX IF NOT EXISTS "ChatMessage_sessionId_idx" ON "ChatMessage" ("sessionId");
CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage" ("createdAt");

