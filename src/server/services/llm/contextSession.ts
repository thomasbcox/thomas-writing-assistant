/**
 * Context Session Manager
 * Manages concept corpus context sessions for multi-turn LLM conversations
 */

import { eq, and, lt, sql } from "drizzle-orm";
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
  llmClient?: LLMClient, // Optional for automatic caching
): Promise<ContextSessionData> {
  // Clean up expired sessions first
  await cleanupExpiredSessions(db);

  // Try to find existing session
  // Query raw integer value to avoid Drizzle's timestamp conversion
  const existing = await db
    .select({
      id: contextSession.id,
      sessionKey: contextSession.sessionKey,
      provider: contextSession.provider,
      model: contextSession.model,
      contextMessages: contextSession.contextMessages,
      conceptIds: contextSession.conceptIds,
      externalCacheId: contextSession.externalCacheId,
      cacheExpiresAt: contextSession.cacheExpiresAt,
      expiresAt: sql<number>`CAST(${contextSession.expiresAt} AS INTEGER)`, // Get raw integer value (stored as seconds)
      createdAt: contextSession.createdAt,
      updatedAt: contextSession.updatedAt,
    })
    .from(contextSession)
    .where(eq(contextSession.sessionKey, sessionKey))
    .limit(1);

  const now = Date.now();
  const expiresAtMs = now + ttlMs;
  const expiresAt = new Date(expiresAtMs);
  // Drizzle's { mode: "timestamp" } expects seconds, not milliseconds
  // So we need to divide by 1000 when storing, and multiply by 1000 when reading
  const expiresAtSeconds = Math.floor(expiresAtMs / 1000);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:72',message:'getOrCreateContextSession expiresAt calculation',data:{sessionKey,ttlMs,now,expiresAtMs,expiresAt:expiresAt.toISOString(),expiresAtTimestamp:expiresAt.getTime()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  if (existing.length > 0) {
    const session = existing[0];
    // Check if session is expired - convert from seconds to milliseconds
    // expiresAt is already a raw integer (seconds) from the CAST query above
    const sessionExpiresAt = new Date((session.expiresAt as number) * 1000);
    if (sessionExpiresAt < new Date()) {
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
          expiresAt: sql`${expiresAtSeconds}`, // Store as seconds (Drizzle's { mode: "timestamp" } expects seconds)
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
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:137',message:'getOrCreateContextSession before insert',data:{sessionId,sessionKey,expiresAt:expiresAt.toISOString(),expiresAtGetTime:expiresAt.getTime(),expiresAtValueOf:expiresAt.valueOf(),expiresAtType:typeof expiresAt,expiresAtMs,expiresAtSeconds,nowSeconds:Math.floor(now/1000),now},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Store expiresAtSeconds value in a const to ensure it's not being modified
  const expiresAtSecondsToStore = expiresAtSeconds;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:145',message:'getOrCreateContextSession about to insert',data:{expiresAtSecondsToStore,expiresAtSeconds,expiresAtMs,nowSeconds:Math.floor(now/1000)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  await db
    .insert(contextSession)
    .values({
      id: sessionId,
      sessionKey,
      provider,
      model,
      contextMessages: JSON.stringify(initialMessages),
      conceptIds: conceptIds.length > 0 ? JSON.stringify(conceptIds) : null,
      expiresAt: sql<number>`CAST(${expiresAtSecondsToStore} AS INTEGER)`, // Store as seconds - explicit CAST to bypass Drizzle's timestamp conversion
    });

  // Query the database to get the inserted session (returning() doesn't work with in-memory DB)
  // Query raw integer value to avoid Drizzle's timestamp conversion
  const sessions = await db
    .select({
      id: contextSession.id,
      sessionKey: contextSession.sessionKey,
      provider: contextSession.provider,
      model: contextSession.model,
      contextMessages: contextSession.contextMessages,
      conceptIds: contextSession.conceptIds,
      externalCacheId: contextSession.externalCacheId,
      cacheExpiresAt: contextSession.cacheExpiresAt,
      expiresAt: sql<number>`CAST(${contextSession.expiresAt} AS INTEGER)`, // Get raw integer value (stored as seconds)
      createdAt: contextSession.createdAt,
      updatedAt: contextSession.updatedAt,
    })
    .from(contextSession)
    .where(eq(contextSession.sessionKey, sessionKey))
    .limit(1);
  
  const newSession = sessions[0];
  if (!newSession) {
    throw new Error("Failed to create context session");
  }
  
  // Convert raw integer (seconds) to Date object (multiply by 1000 to get milliseconds)
  const storedExpiresAtDate = new Date((newSession.expiresAt as number) * 1000);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:177',message:'getOrCreateContextSession after query',data:{sessionId:newSession.id,sessionKey,calculatedExpiresAtMs:expiresAtMs,calculatedExpiresAtSeconds:expiresAtSeconds,calculatedExpiresAt:expiresAt.toISOString(),storedExpiresAtRaw:newSession.expiresAt,storedExpiresAt:storedExpiresAtDate.toISOString(),storedExpiresAtGetTime:storedExpiresAtDate.getTime(),expiresAtType:typeof newSession.expiresAt,expiresAtMatch:expiresAtMs===storedExpiresAtDate.getTime()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // AUTO-CACHE: Create cache for large static content if:
  // 1. This is a new session (not existing)
  // 2. Provider is Gemini
  // 3. LLMClient provided
  // 4. Initial messages contain large static content
  if (existing.length === 0 && provider === "gemini" && llmClient) {
    // Extract static content from initial messages
    // Typically the first "user" message with large content
    const staticMessages = initialMessages.filter(
      m => m.role === "user" && m.content.length > 2000
    );
    
    if (staticMessages.length > 0) {
      const staticContent = staticMessages
        .map(m => m.content)
        .join("\n\n");
      
      // Create cache asynchronously (don't block session creation)
      createCacheForSession(
        db,
        sessionKey,
        provider,
        staticContent,
        llmClient,
      ).catch(error => {
        logger.warn({ error, sessionKey }, "Failed to auto-create cache");
      });
    }
  }

  // Re-fetch session to get cache info if it was created synchronously
  // (In practice, cache creation is async, so we return without waiting)
  // Query raw integer value to avoid Drizzle's timestamp conversion
  const finalSession = await db
    .select({
      id: contextSession.id,
      sessionKey: contextSession.sessionKey,
      provider: contextSession.provider,
      model: contextSession.model,
      contextMessages: contextSession.contextMessages,
      conceptIds: contextSession.conceptIds,
      externalCacheId: contextSession.externalCacheId,
      cacheExpiresAt: contextSession.cacheExpiresAt,
      expiresAt: sql<number>`CAST(${contextSession.expiresAt} AS INTEGER)`, // Get raw integer value (stored as seconds)
      createdAt: contextSession.createdAt,
      updatedAt: contextSession.updatedAt,
    })
    .from(contextSession)
    .where(eq(contextSession.sessionKey, sessionKey))
    .limit(1);

  const sessionData = finalSession[0] || newSession;
  
  // Convert raw integer (seconds) to Date object (multiply by 1000 to get milliseconds)
  const sessionExpiresAt = new Date(((sessionData.expiresAt as number) || expiresAtSeconds) * 1000);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:200',message:'getOrCreateContextSession final session',data:{sessionId:sessionData.id,sessionKey,calculatedExpiresAt:expiresAt.toISOString(),storedExpiresAt:sessionExpiresAt.toISOString(),expiresAtMatch:expiresAt.getTime()===sessionExpiresAt.getTime(),externalCacheId:sessionData.externalCacheId,externalCacheIdType:typeof sessionData.externalCacheId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  return {
    id: sessionData.id,
    sessionKey: sessionData.sessionKey,
    provider: sessionData.provider as LLMProvider,
    model: sessionData.model,
    messages: initialMessages,
    conceptIds,
    externalCacheId: sessionData.externalCacheId ? String(sessionData.externalCacheId) : undefined,
    cacheExpiresAt: sessionData.cacheExpiresAt 
      ? (sessionData.cacheExpiresAt instanceof Date 
          ? sessionData.cacheExpiresAt 
          : new Date(sessionData.cacheExpiresAt))
      : undefined,
    expiresAt: sessionExpiresAt, // Use the stored value from database, not the calculated one
  };
}

/**
 * Get an existing context session
 */
export async function getContextSession(
  db: DatabaseInstance,
  sessionKey: string,
): Promise<ContextSessionData | null> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:201',message:'getContextSession entry',data:{sessionKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // Query raw integer value to avoid Drizzle's timestamp conversion
  const existing = await db
    .select({
      id: contextSession.id,
      sessionKey: contextSession.sessionKey,
      provider: contextSession.provider,
      model: contextSession.model,
      contextMessages: contextSession.contextMessages,
      conceptIds: contextSession.conceptIds,
      externalCacheId: contextSession.externalCacheId,
      cacheExpiresAt: contextSession.cacheExpiresAt,
      expiresAt: sql<number>`CAST(${contextSession.expiresAt} AS INTEGER)`, // Get raw integer value (stored as seconds)
      createdAt: contextSession.createdAt,
      updatedAt: contextSession.updatedAt,
    })
    .from(contextSession)
    .where(eq(contextSession.sessionKey, sessionKey))
    .limit(1);

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:280',message:'getContextSession query result',data:{resultCount:existing.length,foundSession:existing.length>0?{id:existing[0].id,sessionKey:existing[0].sessionKey,expiresAtRaw:existing[0].expiresAt,expiresAt:new Date(existing[0].expiresAt as number).toISOString()}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A1'})}).catch(()=>{});
  // #endregion

  if (existing.length === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:283',message:'getContextSession returning null - no session found',data:{sessionKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A1'})}).catch(()=>{});
    // #endregion
    return null;
  }

  const session = existing[0];
  
  // Convert raw integer (seconds) to Date object (multiply by 1000 to get milliseconds)
  const expiresAtDate = new Date((session.expiresAt as number) * 1000);
  const now = new Date();
  const isExpired = expiresAtDate < now;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:230',message:'getContextSession expiry check',data:{sessionId:session.id,expiresAt:expiresAtDate.toISOString(),now:now.toISOString(),isExpired,expiresAtRaw:session.expiresAt,expiresAtType:typeof session.expiresAt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A2'})}).catch(()=>{});
  // #endregion

  // Check if expired
  if (isExpired) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:225',message:'getContextSession returning null - session expired',data:{sessionId:session.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A2'})}).catch(()=>{});
    // #endregion
    await db.delete(contextSession).where(eq(contextSession.id, session.id));
    return null;
  }

  // Ensure all date fields are Date objects and externalCacheId is a string
  const resultExpiresAt = expiresAtDate; // Reuse the already computed expiresAtDate
  const resultCacheExpiresAt = session.cacheExpiresAt 
    ? (session.cacheExpiresAt instanceof Date 
        ? session.cacheExpiresAt 
        : new Date(session.cacheExpiresAt))
    : undefined;

  const result = {
    id: session.id,
    sessionKey: session.sessionKey,
    provider: session.provider as LLMProvider,
    model: session.model,
    messages: JSON.parse(session.contextMessages) as ContextMessage[],
    conceptIds: session.conceptIds
      ? (JSON.parse(session.conceptIds) as string[])
      : [],
    externalCacheId: session.externalCacheId ? String(session.externalCacheId) : undefined,
    cacheExpiresAt: resultCacheExpiresAt,
    expiresAt: resultExpiresAt,
  };

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:236',message:'getContextSession returning session',data:{id:result.id,sessionKey:result.sessionKey,hasExternalCacheId:!!result.externalCacheId,externalCacheId:result.externalCacheId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  return result;
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:304',message:'createCacheForSession entry',data:{sessionKey,provider,contentLength:staticContent.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:327',message:'createCacheForSession no gemini provider',data:{sessionKey,actualProvider:llmClient.getProvider()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return null;
    }
    
    const cacheId = await geminiProvider.createContextCache(staticContent);
    const cacheExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:333',message:'createCacheForSession before update',data:{sessionKey,cacheId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C1'})}).catch(()=>{});
    // #endregion
    
    // Update session with cache info
    // Ensure cacheId is stored as string (not number)
    const updateResult = await db
      .update(contextSession)
      .set({
        externalCacheId: String(cacheId), // Explicitly convert to string
        cacheExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(contextSession.sessionKey, sessionKey));
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:343',message:'createCacheForSession after update',data:{sessionKey,cacheId,updateChanges:updateResult.changes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C2'})}).catch(()=>{});
    // #endregion

    // Verify update by reading back
    const verifySession = await db
      .select()
      .from(contextSession)
      .where(eq(contextSession.sessionKey, sessionKey))
      .limit(1);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:352',message:'createCacheForSession verify read',data:{sessionKey,found:verifySession.length>0,externalCacheId:verifySession[0]?.externalCacheId,externalCacheIdType:typeof verifySession[0]?.externalCacheId,cacheExpiresAt:verifySession[0]?.cacheExpiresAt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C3'})}).catch(()=>{});
    // #endregion
    
    logger.debug({ sessionKey, cacheId }, "Created context cache for session");
    return cacheId;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:357',message:'createCacheForSession error',data:{sessionKey,error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
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
  // Compare using raw integer (seconds) to avoid Drizzle's timestamp conversion
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expired = await db
    .select()
    .from(contextSession)
    .where(sql`CAST(${contextSession.expiresAt} AS INTEGER) < ${nowSeconds}`);
  
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
  // Compare using raw integer (seconds) to avoid Drizzle's timestamp conversion
  const result = await db
    .delete(contextSession)
    .where(sql`CAST(${contextSession.expiresAt} AS INTEGER) < ${nowSeconds}`);

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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:398',message:'invalidateSessionsForConcepts entry',data:{conceptIds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  if (conceptIds.length === 0) {
    return 0;
  }

  // Get all sessions
  const allSessions = await db.select().from(contextSession);

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:408',message:'invalidateSessionsForConcepts all sessions',data:{totalSessions:allSessions.length,sessions:allSessions.map(s=>({id:s.id,sessionKey:s.sessionKey,conceptIds:s.conceptIds}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B3'})}).catch(()=>{});
  // #endregion

  let deletedCount = 0;
  for (const session of allSessions) {
    if (!session.conceptIds) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:414',message:'invalidateSessionsForConcepts skipping - no conceptIds',data:{sessionId:session.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B1'})}).catch(()=>{});
      // #endregion
      continue;
    }

    let sessionConceptIds: string[] = [];
    try {
      sessionConceptIds = JSON.parse(session.conceptIds) as string[];
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:420',message:'invalidateSessionsForConcepts JSON parse failed',data:{sessionId:session.id,conceptIdsRaw:session.conceptIds,error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B1'})}).catch(()=>{});
      // #endregion
      continue;
    }

    const hasConcept = conceptIds.some((id) => sessionConceptIds.includes(id));

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:425',message:'invalidateSessionsForConcepts concept check',data:{sessionId:session.id,sessionConceptIds,searchConceptIds:conceptIds,hasConcept},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B2'})}).catch(()=>{});
    // #endregion

    if (hasConcept) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:428',message:'invalidateSessionsForConcepts deleting session',data:{sessionId:session.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B4'})}).catch(()=>{});
      // #endregion
      await db.delete(contextSession).where(eq(contextSession.id, session.id));
      deletedCount++;
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'contextSession.ts:433',message:'invalidateSessionsForConcepts returning',data:{deletedCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  if (deletedCount > 0) {
    logger.debug(
      { deletedCount, conceptIds },
      "Invalidated context sessions for updated concepts",
    );
  }

  return deletedCount;
}

