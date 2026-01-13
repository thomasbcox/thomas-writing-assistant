import { ipcMain } from "electron";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { chatSession, chatMessage } from "../../src/server/schema.js";
import { getDb } from "../db.js";
import { logger } from "../../src/lib/logger.js";
import { serializeChatSession, serializeChatMessage, serializeChatSessionWithMessages } from "../../src/lib/serializers.js";
import { handleIpc } from "./ipc-wrapper.js";

// Input schemas
const createSessionSchema = z.object({
  conceptId: z.string(),
  title: z.string().optional(),
});

const getSessionsSchema = z.object({
  conceptId: z.string(),
});

const getSessionByIdSchema = z.object({
  id: z.string(),
});

const deleteSessionSchema = z.object({
  id: z.string(),
});

const addMessageSchema = z.object({
  sessionId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  suggestions: z.string().optional(), // JSON string of AISuggestion[]
  actions: z.string().optional(), // JSON string of QuickAction[]
});

export function registerChatHandlers() {
  // Create a new chat session for a concept
  ipcMain.handle("chat:createSession", handleIpc(async (_event, input: unknown) => {
    const parsed = createSessionSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "chat:createSession", conceptId: parsed.conceptId }, "Creating chat session");

    const [newSession] = await db
      .insert(chatSession)
      .values({
        conceptId: parsed.conceptId,
        title: parsed.title ?? null,
      })
      .returning();

    logger.info({ operation: "chat:createSession", sessionId: newSession.id, conceptId: parsed.conceptId }, "Chat session created successfully");
    return serializeChatSession(newSession);
  }, "chat:createSession"));

  // Get all chat sessions for a concept
  ipcMain.handle("chat:getSessionsByConceptId", handleIpc(async (_event, input: unknown) => {
    const parsed = getSessionsSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "chat:getSessionsByConceptId", conceptId: parsed.conceptId }, "Fetching chat sessions for concept");

    const sessions = await db.query.chatSession.findMany({
      where: eq(chatSession.conceptId, parsed.conceptId),
      with: {
        messages: {
          orderBy: [desc(chatMessage.createdAt)],
          limit: 1, // Just get the most recent message for preview
        },
      },
      orderBy: [desc(chatSession.updatedAt)],
    });

    logger.info({ operation: "chat:getSessionsByConceptId", conceptId: parsed.conceptId, count: sessions.length }, "Chat sessions fetched successfully");
    return sessions.map(serializeChatSessionWithMessages);
  }, "chat:getSessionsByConceptId"));

  // Get a chat session by ID with all messages
  ipcMain.handle("chat:getSessionById", handleIpc(async (_event, input: unknown) => {
    const parsed = getSessionByIdSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "chat:getSessionById", sessionId: parsed.id }, "Fetching chat session");

    const session = await db.query.chatSession.findFirst({
      where: eq(chatSession.id, parsed.id),
      with: {
        messages: {
          orderBy: [chatMessage.createdAt], // Oldest first for display
        },
      },
    });

    if (!session) {
      logger.warn({ operation: "chat:getSessionById", sessionId: parsed.id }, "Chat session not found");
      throw new Error("Chat session not found");
    }

    logger.info({ operation: "chat:getSessionById", sessionId: parsed.id, messageCount: session.messages?.length ?? 0 }, "Chat session fetched successfully");
    return serializeChatSessionWithMessages(session);
  }, "chat:getSessionById"));

  // Delete a chat session (cascades to messages)
  ipcMain.handle("chat:deleteSession", handleIpc(async (_event, input: unknown) => {
    const parsed = deleteSessionSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "chat:deleteSession", sessionId: parsed.id }, "Deleting chat session");

    await db.delete(chatSession).where(eq(chatSession.id, parsed.id));

    logger.info({ operation: "chat:deleteSession", sessionId: parsed.id }, "Chat session deleted successfully");
    return { deleted: true };
  }, "chat:deleteSession"));

  // Add a message to a chat session
  ipcMain.handle("chat:addMessage", handleIpc(async (_event, input: unknown) => {
    const parsed = addMessageSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "chat:addMessage", sessionId: parsed.sessionId, role: parsed.role }, "Adding message to chat session");

    // Add the message
    const [newMessage] = await db
      .insert(chatMessage)
      .values({
        sessionId: parsed.sessionId,
        role: parsed.role,
        content: parsed.content,
        suggestions: parsed.suggestions ?? null,
        actions: parsed.actions ?? null,
      })
      .returning();

    // Update the session's updatedAt timestamp
    await db
      .update(chatSession)
      .set({ updatedAt: new Date() })
      .where(eq(chatSession.id, parsed.sessionId));

    logger.info({ operation: "chat:addMessage", messageId: newMessage.id, sessionId: parsed.sessionId }, "Message added successfully");
    return newMessage;
  }, "chat:addMessage"));

  // Get or create a session for a concept (convenience method)
  ipcMain.handle("chat:getOrCreateSession", handleIpc(async (_event, input: unknown) => {
    const parsed = createSessionSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "chat:getOrCreateSession", conceptId: parsed.conceptId }, "Getting or creating chat session");

    // Check for existing session
    const existingSession = await db.query.chatSession.findFirst({
      where: eq(chatSession.conceptId, parsed.conceptId),
      with: {
        messages: {
          orderBy: [chatMessage.createdAt],
        },
      },
      orderBy: [desc(chatSession.updatedAt)],
    });

    if (existingSession) {
      logger.info({ operation: "chat:getOrCreateSession", sessionId: existingSession.id, found: true }, "Existing session found");
      return serializeChatSessionWithMessages(existingSession);
    }

    // Create new session
    const [newSession] = await db
      .insert(chatSession)
      .values({
        conceptId: parsed.conceptId,
        title: parsed.title ?? null,
      })
      .returning();

    logger.info({ operation: "chat:getOrCreateSession", sessionId: newSession.id, created: true }, "New session created");
    return serializeChatSessionWithMessages({ ...newSession, messages: [] });
  }, "chat:getOrCreateSession"));
}

