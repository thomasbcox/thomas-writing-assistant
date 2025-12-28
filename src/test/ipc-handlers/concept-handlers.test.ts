/**
 * Tests for concept IPC handlers
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

// CRITICAL: Mock electron/db.js BEFORE any handler imports it
jest.mock("../../../electron/db.js", () => ({
  __esModule: true,
  getDb: jest.fn(),
  initDb: jest.fn(),
  closeDb: jest.fn(),
}));

// Mock LLM client and config loader for handlers that use them
const mockGetLLMClient = jest.fn();
jest.mock("~/server/services/llm/client.js", () => ({
  getLLMClient: mockGetLLMClient,
}));

const mockGetConfigLoader = jest.fn();
jest.mock("~/server/services/config.js", () => ({
  getConfigLoader: mockGetConfigLoader,
}));

// Import after mocks are set up
import { createTestDb, migrateTestDb, cleanupTestData } from "../test-utils.js";
import { registerConceptHandlers } from "../../../electron/ipc-handlers/concept-handlers.js";
import { concept } from "~/server/schema.js";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { MockLLMClient } from "../mocks/llm-client.js";
import { MockConfigLoader } from "../mocks/config-loader.js";
import { getDb } from "../../../electron/db.js";

// Electron module is mocked via moduleNameMapper in jest.config.js
// We just need to import it to get the mocked ipcMain
const { ipcMain } = await import("electron");

describe("Concept IPC Handlers", () => {
  let testDb: ReturnType<typeof createTestDb>;
  const mockLLMClient = new MockLLMClient();
  const mockConfigLoader = new MockConfigLoader();

  beforeEach(async () => {
    // Clear all registered handlers first
    const { ipcMain: electronIpcMain } = await import("electron");
    const channels = ["concept:list", "concept:getById", "concept:create", "concept:update", "concept:delete", "concept:restore", "concept:purgeTrash", "concept:proposeLinks", "concept:generateCandidates"];
    for (const channel of channels) {
      electronIpcMain.removeHandler(channel);
    }
    
    // Create and migrate test database
    testDb = createTestDb();
    await migrateTestDb(testDb);
    
    // Verify tables were created
    const sqlite = (testDb as any).session?.client;
    if (sqlite) {
      const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
      if (tables.length === 0) {
        throw new Error("Database migration failed: no tables created");
      }
    }
    
    // Configure mock getDb to return test database
    const mockedDbModule = jest.requireMock("../../../electron/db.js");
    mockedDbModule.getDb.mockReturnValue(testDb);
    
    // Mock LLM client and config loader
    mockGetLLMClient.mockReturnValue(mockLLMClient);
    mockGetConfigLoader.mockReturnValue(mockConfigLoader);
    
    // Register handlers AFTER database is ready
    registerConceptHandlers();
    
    // Clear any previous mock calls
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData(testDb);
  });

  describe("concept:list", () => {
    it("should return empty array when no concepts exist", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:list")[0] as any;
      const result = await handler(mockEvent, { includeTrash: false });
      expect(result).toEqual([]);
    });

    it("should return active concepts by default", async () => {
      // Create test concepts
      const now = new Date();
      await testDb.insert(concept).values([
        {
          id: uuidv4(),
          identifier: "zettel-12345",
          title: "Active Concept 1",
          description: "Description 1",
          content: "Content 1",
          creator: "Test Creator",
          source: "Test Source",
          year: "2024",
          status: "active",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          identifier: "zettel-67890",
          title: "Trashed Concept",
          description: "Description 2",
          content: "Content 2",
          creator: "Test Creator",
          source: "Test Source",
          year: "2024",
          status: "trash",
          createdAt: now,
          updatedAt: now,
          trashedAt: now,
        },
      ]);

      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:list")[0] as any;
      const result = await handler(mockEvent, { includeTrash: false });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Active Concept 1");
      expect(result[0].status).toBe("active");
    });

    it("should include trash when includeTrash is true", async () => {
      const now = new Date();
      await testDb.insert(concept).values([
        {
          id: uuidv4(),
          identifier: "zettel-12345",
          title: "Active Concept",
          description: "Description",
          content: "Content",
          creator: "Test Creator",
          source: "Test Source",
          year: "2024",
          status: "active",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          identifier: "zettel-67890",
          title: "Trashed Concept",
          description: "Description",
          content: "Content",
          creator: "Test Creator",
          source: "Test Source",
          year: "2024",
          status: "trash",
          createdAt: now,
          updatedAt: now,
          trashedAt: now,
        },
      ]);

      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:list")[0] as any;
      const result = await handler(mockEvent, { includeTrash: true });

      expect(result).toHaveLength(2);
    });

    it("should filter by search term", async () => {
      const now = new Date();
      await testDb.insert(concept).values([
        {
          id: uuidv4(),
          identifier: "zettel-12345",
          title: "Python Programming",
          description: "Description about Python",
          content: "Content",
          creator: "Test Creator",
          source: "Test Source",
          year: "2024",
          status: "active",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          identifier: "zettel-67890",
          title: "JavaScript Basics",
          description: "Description about JavaScript",
          content: "Content",
          creator: "Test Creator",
          source: "Test Source",
          year: "2024",
          status: "active",
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:list")[0] as any;
      const result = await handler(mockEvent, { includeTrash: false, search: "Python" });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Python Programming");
    });

    it("should handle invalid input gracefully", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:list")[0] as any;
      
      // Should accept undefined input (uses defaults)
      const result = await handler(mockEvent, undefined);
      expect(result).toEqual([]);
    });
  });

  describe("concept:getById", () => {
    it("should return concept with links when found", async () => {
      const now = new Date();
      const conceptId = uuidv4();
      await testDb.insert(concept).values({
        id: conceptId,
        identifier: "zettel-12345",
        title: "Test Concept",
        description: "Description",
        content: "Content",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:getById")[0] as any;
      const result = await handler(mockEvent, { id: conceptId });

      expect(result).toBeDefined();
      expect(result.id).toBe(conceptId);
      expect(result.title).toBe("Test Concept");
      expect(result.outgoingLinks).toBeDefined();
      expect(result.incomingLinks).toBeDefined();
    });

    it("should throw error when concept not found", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:getById")[0] as any;

      await expect(
        handler(mockEvent, { id: "non-existent-id" })
      ).rejects.toThrow("Concept not found");
    });

    it("should validate input schema", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:getById")[0] as any;

      await expect(handler(mockEvent, {})).rejects.toThrow();
      await expect(handler(mockEvent, { id: 123 })).rejects.toThrow();
    });
  });

  describe("concept:create", () => {
    it("should create a new concept", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:create")[0] as any;
      const result = await handler(mockEvent, {
        title: "New Concept",
        description: "Description",
        content: "Content",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
      });

      expect(result).toBeDefined();
      expect(result.title).toBe("New Concept");
      expect(result.identifier).toMatch(/^zettel-/);
      expect(result.status).toBe("active");
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("should use default values for optional fields", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:create")[0] as any;
      const result = await handler(mockEvent, {
        title: "New Concept",
        content: "Content",
        creator: "Test Creator",
      });

      expect(result.description).toBe("");
      expect(result.source).toBe("Unknown");
      expect(result.year).toBe(new Date().getFullYear().toString());
    });

    it("should validate required fields", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:create")[0] as any;

      await expect(handler(mockEvent, {})).rejects.toThrow();
      await expect(handler(mockEvent, { title: "" })).rejects.toThrow();
      await expect(handler(mockEvent, { title: "Test", content: "" })).rejects.toThrow();
      await expect(handler(mockEvent, { title: "Test", content: "Content", creator: "" })).rejects.toThrow();
    });
  });

  describe("concept:update", () => {
    it("should update concept fields", async () => {
      const now = new Date();
      const conceptId = uuidv4();
      await testDb.insert(concept).values({
        id: conceptId,
        identifier: "zettel-12345",
        title: "Original Title",
        description: "Original Description",
        content: "Original Content",
        creator: "Original Creator",
        source: "Original Source",
        year: "2023",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:update")[0] as any;
      const result = await handler(mockEvent, {
        id: conceptId,
        title: "Updated Title",
        description: "Updated Description",
      });

      expect(result.title).toBe("Updated Title");
      expect(result.description).toBe("Updated Description");
      expect(result.content).toBe("Original Content"); // Unchanged
      expect(result.updatedAt.getTime()).toBeGreaterThan(now.getTime());
    });

    it("should throw error when concept not found", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:update")[0] as any;

      await expect(
        handler(mockEvent, { id: "non-existent-id", title: "New Title" })
      ).rejects.toThrow("Concept not found");
    });

    it("should validate input schema", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:update")[0] as any;

      await expect(handler(mockEvent, {})).rejects.toThrow();
    });
  });

  describe("concept:delete", () => {
    it("should soft delete concept (set status to trash)", async () => {
      const now = new Date();
      const conceptId = uuidv4();
      await testDb.insert(concept).values({
        id: conceptId,
        identifier: "zettel-12345",
        title: "To Delete",
        description: "Description",
        content: "Content",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:delete")[0] as any;
      const result = await handler(mockEvent, { id: conceptId });

      expect(result.status).toBe("trash");
      expect(result.trashedAt).toBeDefined();

      // Verify in database
      const deleted = await testDb.query.concept.findFirst({
        where: eq(concept.id, conceptId),
      });
      expect(deleted?.status).toBe("trash");
    });

    it("should throw error when concept not found", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:delete")[0] as any;

      await expect(
        handler(mockEvent, { id: "non-existent-id" })
      ).rejects.toThrow("Concept not found");
    });
  });

  describe("concept:restore", () => {
    it("should restore trashed concept", async () => {
      const now = new Date();
      const conceptId = uuidv4();
      await testDb.insert(concept).values({
        id: conceptId,
        identifier: "zettel-12345",
        title: "Trashed Concept",
        description: "Description",
        content: "Content",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
        status: "trash",
        createdAt: now,
        updatedAt: now,
        trashedAt: now,
      });

      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:restore")[0] as any;
      const result = await handler(mockEvent, { id: conceptId });

      expect(result.status).toBe("active");
      expect(result.trashedAt).toBeNull();
    });

    it("should throw error when concept not found", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:restore")[0] as any;

      await expect(
        handler(mockEvent, { id: "non-existent-id" })
      ).rejects.toThrow("Concept not found");
    });
  });

  describe("concept:purgeTrash", () => {
    it("should delete old trashed concepts", async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      const oldConceptId = uuidv4();
      const recentConceptId = uuidv4();

      await testDb.insert(concept).values([
        {
          id: oldConceptId,
          identifier: "zettel-12345",
          title: "Old Trashed",
          description: "Description",
          content: "Content",
          creator: "Test Creator",
          source: "Test Source",
          year: "2024",
          status: "trash",
          createdAt: oldDate,
          updatedAt: oldDate,
          trashedAt: oldDate,
        },
        {
          id: recentConceptId,
          identifier: "zettel-67890",
          title: "Recent Trashed",
          description: "Description",
          content: "Content",
          creator: "Test Creator",
          source: "Test Source",
          year: "2024",
          status: "trash",
          createdAt: recentDate,
          updatedAt: recentDate,
          trashedAt: recentDate,
        },
      ]);

      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:purgeTrash")[0] as any;
      const result = await handler(mockEvent, { daysOld: 30 });

      expect(result.deletedCount).toBeGreaterThan(0);

      // Verify old concept was deleted
      const oldConcept = await testDb.query.concept.findFirst({
        where: eq(concept.id, oldConceptId),
      });
      expect(oldConcept).toBeUndefined();

      // Verify recent concept still exists
      const recentConcept = await testDb.query.concept.findFirst({
        where: eq(concept.id, recentConceptId),
      });
      expect(recentConcept).toBeDefined();
    });

    it("should use default daysOld value", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:purgeTrash")[0] as any;

      // Should not throw with default value
      const result = await handler(mockEvent, {});
      expect(result).toBeDefined();
      expect(result.deletedCount).toBeDefined();
    });
  });

  describe("concept:proposeLinks", () => {
    it("should validate input schema", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:proposeLinks")[0] as any;

      await expect(handler(mockEvent, {})).rejects.toThrow();
      await expect(handler(mockEvent, { conceptId: 123 })).rejects.toThrow();
    });

    // Note: Full integration test for proposeLinks would require mocking linkProposer service
    // which is complex. This test validates the handler exists and validates input correctly.
  });

  describe("concept:generateCandidates", () => {
    it("should validate input schema", async () => {
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:generateCandidates")[0] as any;

      await expect(handler(mockEvent, {})).rejects.toThrow();
      await expect(handler(mockEvent, { text: "" })).rejects.toThrow();
    });

    // Note: Full integration test for generateCandidates would require mocking conceptProposer service
    // which is complex. This test validates the handler exists and validates input correctly.
  });
});

