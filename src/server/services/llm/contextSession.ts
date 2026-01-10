/**
 * Context Session Manager
 * Manages concept corpus context sessions for multi-turn LLM conversations
 */

import { eq, and, lt } from "drizzle-orm";
import { contextSession as contextSessionTable } from "~/server/schema";
import { contextSession } from "~/server/schema";
import type { DatabaseInstance } from "~/server/db";
import { logger } from "~/lib/logger";
import type { LLMProvider } from "./types";
import type { LLMClient } from "./client";
import { GeminiProvider } from "./providers/gemini";

export interface ContextMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ContextSessionData {
  id: string;
  sessionKey: string;
  provider: LLMProvider;
  model: string;
  messages: ContextMessage[];
  conceptIds: string[];
  externalCacheId?: string;
  cacheExpiresAt?: Date;
  expiresAt: Date;
}

const DEFAULT_SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a unique session key for a context session
 */
export function generateSessionKey(
  operation: string,
  conceptId?: string,
  additionalKey?: string,
): string {
  const parts = [operation];
  if (conceptId) parts.push(conceptId);
  if (additionalKey) parts.push(additionalKey);
  return parts.join(":");
}

/**
 * Get or create a context session
 */
export async function getOrCreateContextSession(
  db: DatabaseInstance,
  sessionKey: string,
  provider: LLMProvider,
  model: string,
  initialMessages: ContextMessage[],
  conceptIds: string[] = [],
  ttlMs: number = DEFAULT_SESSION_TTL_MS,
): Promise<ContextSessionData> {
  // Clean up expired sessions first
  await cleanupExpiredSessions(db);

  // Try to find existing session
  const existing = await db
    .select()
    .from(contextSession)
    .where(eq(contextSession.sessionKey, sessionKey))
    .limit(1);

  const expiresAt = new Date(Date.now() + ttlMs);

  if (existing.length > 0) {
    const session = existing[0];
    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Delete expired session and create new one
      await db.delete(contextSession).where(eq(contextSession.id, session.id));
    } else {
      // Update existing session
      const messages = JSON.parse(session.contextMessages) as ContextMessage[];
      const existingConceptIds = session.conceptIds
        ? (JSON.parse(session.conceptIds) as string[])
        : [];

      // Merge messages and concept IDs
      const mergedMessages = [...messages, ...initialMessages];
      const mergedConceptIds = [
        ...new Set([...existingConceptIds, ...conceptIds]),
      ];

      await db
        .update(contextSession)
        .set({
          contextMessages: JSON.stringify(mergedMessages),
          conceptIds: JSON.stringify(mergedConceptIds),
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(contextSession.id, session.id));

      return {
        id: session.id,
        sessionKey: session.sessionKey,
        provider: session.provider as LLMProvider,
        model: session.model,
        messages: mergedMessages,
        conceptIds: mergedConceptIds,
        externalCacheId: session.externalCacheId ?? undefined,
        cacheExpiresAt: session.cacheExpiresAt ?? undefined,
        expiresAt,
      };
    }
  }

  // Create new session
  // Import createId at the top level
  const { createId } = await import("@paralleldrive/cuid2");
  const sessionId = createId();
  
  await db
    .insert(contextSession)
    .values({
      id: sessionId,
      sessionKey,
      provider,
      model,
      contextMessages: JSON.stringify(initialMessages),
      conceptIds: conceptIds.length > 0 ? JSON.stringify(conceptIds) : null,
      expiresAt,
    });

  // Query the database to get the inserted session (returning() doesn't work with in-memory DB)
  const sessions = await db
    .select()
    .from(contextSession)
    .where(eq(contextSession.sessionKey, sessionKey))
    .limit(1);
  
  const newSession = sessions[0];
  if (!newSession) {
    throw new Error("Failed to create context session");
  }

  return {
    id: newSession.id,
    sessionKey: newSession.sessionKey,
    provider: newSession.provider as LLMProvider,
    model: newSession.model,
    messages: initialMessages,
    conceptIds,
    externalCacheId: newSession.externalCacheId ?? undefined,
    cacheExpiresAt: newSession.cacheExpiresAt ?? undefined,
    expiresAt,
  };
}

/**
 * Get an existing context session
 */
export async function getContextSession(
  db: DatabaseInstance,
  sessionKey: string,
): Promise<ContextSessionData | null> {
  const existing = await db
    .select()
    .from(contextSession)
    .where(eq(contextSession.sessionKey, sessionKey))
    .limit(1);

  if (existing.length === 0) {
    return null;
  }

  const session = existing[0];

  // Check if expired
  if (session.expiresAt < new Date()) {
    await db.delete(contextSession).where(eq(contextSession.id, session.id));
    return null;
  }

  return {
    id: session.id,
    sessionKey: session.sessionKey,
    provider: session.provider as LLMProvider,
    model: session.model,
    messages: JSON.parse(session.contextMessages) as ContextMessage[],
    conceptIds: session.conceptIds
      ? (JSON.parse(session.conceptIds) as string[])
      : [],
    externalCacheId: session.externalCacheId ?? undefined,
    cacheExpiresAt: session.cacheExpiresAt ?? undefined,
    expiresAt: session.expiresAt,
  };
}

/**
 * Update a context session with new messages
 */
export async function updateContextSession(
  db: DatabaseInstance,
  sessionKey: string,
  newMessages: ContextMessage[],
  conceptIds?: string[],
): Promise<ContextSessionData | null> {
  const existing = await db
    .select()
    .from(contextSession)
    .where(eq(contextSession.sessionKey, sessionKey))
    .limit(1);

  if (existing.length === 0) {
    return null;
  }

  const session = existing[0];
  const messages = JSON.parse(session.contextMessages) as ContextMessage[];
  const existingConceptIds = session.conceptIds
    ? (JSON.parse(session.conceptIds) as string[])
    : [];

  const mergedMessages = [...messages, ...newMessages];
  const mergedConceptIds = conceptIds
    ? [...new Set([...existingConceptIds, ...conceptIds])]
    : existingConceptIds;

  await db
    .update(contextSession)
    .set({
      contextMessages: JSON.stringify(mergedMessages),
      conceptIds:
        mergedConceptIds.length > 0 ? JSON.stringify(mergedConceptIds) : null,
      updatedAt: new Date(),
    })
    .where(eq(contextSession.id, session.id));

  return {
    id: session.id,
    sessionKey: session.sessionKey,
    provider: session.provider as LLMProvider,
    model: session.model,
    messages: mergedMessages,
    conceptIds: mergedConceptIds,
    externalCacheId: session.externalCacheId ?? undefined,
    cacheExpiresAt: session.cacheExpiresAt ?? undefined,
    expiresAt: session.expiresAt,
  };
}

/**
 * Delete a context session
 */
export async function deleteContextSession(
  db: DatabaseInstance,
  sessionKey: string,
): Promise<void> {
  await db.delete(contextSession).where(eq(contextSession.sessionKey, sessionKey));
}

/**
 * Create cache for large static content in initial messages
 */
export async function createCacheForSession(
  db: DatabaseInstance,
  sessionKey: string,
  provider: LLMProvider,
  staticContent: string, // Large, repeated content
  llmClient: LLMClient,
): Promise<string | null> {
  // Only cache for Gemini provider
  if (provider !== "gemini") {
    return null;
  }
  
  // Only cache if content is large enough (e.g., > 2000 chars)
  if (staticContent.length < 2000) {
    return null;
  }
  
  try {
    // Get Gemini provider instance
    const geminiProvider = llmClient.getProvider() === "gemini" 
      ? (llmClient as any).provider as GeminiProvider
      : null;
    
    if (!geminiProvider) {
      return null;
    }
    
    const cacheId = await geminiProvider.createContextCache(staticContent);
    const cacheExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
    
    // Update session with cache info
    await db
      .update(contextSession)
      .set({
        externalCacheId: cacheId,
        cacheExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(contextSession.sessionKey, sessionKey));
    
    logger.debug({ sessionKey, cacheId }, "Created context cache for session");
    return cacheId;
  } catch (error) {
    logger.warn({ error, sessionKey }, "Failed to create context cache, falling back to regular mode");
    return null;
  }
}

/**
 * Clean up expired sessions and their caches
 */
export async function cleanupExpiredSessions(
  db: DatabaseInstance,
  llmClient?: LLMClient,
): Promise<number> {
  const now = new Date();
  const expired = await db
    .select()
    .from(contextSession)
    .where(lt(contextSession.expiresAt, now));
  
  // Delete expired caches from Gemini
  if (llmClient && llmClient.getProvider() === "gemini") {
    for (const session of expired) {
      if (session.externalCacheId) {
        try {
          const geminiProvider = (llmClient as any).provider as GeminiProvider;
          await geminiProvider.deleteCache(session.externalCacheId);
        } catch (error) {
          logger.warn({ error, cacheId: session.externalCacheId }, "Failed to delete expired cache");
        }
      }
    }
  }
  
  // Delete expired sessions from database
  const result = await db
    .delete(contextSession)
    .where(lt(contextSession.expiresAt, now));

  const deletedCount = result.changes || 0;
  if (deletedCount > 0) {
    logger.debug(
      { deletedCount },
      "Cleaned up expired context sessions",
    );
  }

  return deletedCount;
}

/**
 * Invalidate sessions that include specific concept IDs
 */
export async function invalidateSessionsForConcepts(
  db: DatabaseInstance,
  conceptIds: string[],
): Promise<number> {
  if (conceptIds.length === 0) {
    return 0;
  }

  // Get all sessions
  const allSessions = await db.select().from(contextSession);

  let deletedCount = 0;
  for (const session of allSessions) {
    if (!session.conceptIds) continue;

    const sessionConceptIds = JSON.parse(session.conceptIds) as string[];
    const hasConcept = conceptIds.some((id) => sessionConceptIds.includes(id));

    if (hasConcept) {
      await db.delete(contextSession).where(eq(contextSession.id, session.id));
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    logger.debug(
      { deletedCount, conceptIds },
      "Invalidated context sessions for updated concepts",
    );
  }

  return deletedCount;
}

