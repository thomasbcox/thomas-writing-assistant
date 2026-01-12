/**
 * Tests for IPC Client
 * Tests type-safe IPC wrapper for Electron app
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { ipc } from "~/lib/ipc-client";

describe("IPC Client", () => {
  // Mock electronAPI structure
  const mockElectronAPI = {
    concept: {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      purgeTrash: jest.fn(),
      proposeLinks: jest.fn(),
      generateCandidates: jest.fn(),
    },
    capsule: {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      createAnchorFromPDF: jest.fn(),
      regenerateRepurposedContent: jest.fn(),
    },
    link: {
      getAll: jest.fn(),
      getByConcept: jest.fn(),
      getCountsByConcept: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    linkName: {
      getAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getUsage: jest.fn(),
    },
    config: {
      getStyleGuide: jest.fn(),
      getCredo: jest.fn(),
      getConstraints: jest.fn(),
      getStyleGuideRaw: jest.fn(),
      getCredoRaw: jest.fn(),
      getConstraintsRaw: jest.fn(),
      updateStyleGuide: jest.fn(),
      updateCredo: jest.fn(),
      updateConstraints: jest.fn(),
      getStatus: jest.fn(),
    },
    pdf: {
      extractText: jest.fn(),
    },
    ai: {
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
      getAvailableModels: jest.fn(),
      getEmbeddingStatus: jest.fn(),
      generateMissingEmbeddings: jest.fn(),
      retryFailedEmbeddings: jest.fn(),
    },
    offer: {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      assignCapsule: jest.fn(),
      getUnassignedCapsules: jest.fn(),
    },
    enrichment: {
      analyze: jest.fn(),
      enrichMetadata: jest.fn(),
      chat: jest.fn(),
      expandDefinition: jest.fn(),
    },
    chat: {
      createSession: jest.fn(),
      getSessionsByConceptId: jest.fn(),
      getSessionById: jest.fn(),
      deleteSession: jest.fn(),
      addMessage: jest.fn(),
      getOrCreateSession: jest.fn(),
    },
    ping: jest.fn(),
  } as any; // Use 'as any' to avoid complex type inference issues with jest.fn()

  beforeEach(() => {
    // Mock global.window for Node.js test environment
    (global as any).window = {
      electronAPI: mockElectronAPI,
    };
    // Clear all mocks
    Object.values(mockElectronAPI).forEach((namespace: any) => {
      if (namespace && typeof namespace === 'object') {
        Object.values(namespace).forEach((fn: any) => {
          if (jest.isMockFunction(fn)) {
            fn.mockClear();
          }
        });
      }
    });
    // Clear ping mock separately
    if (jest.isMockFunction(mockElectronAPI.ping)) {
      mockElectronAPI.ping.mockClear();
    }
  });

  afterEach(() => {
    // @ts-ignore
    delete global.window;
  });

  describe("Window Detection", () => {
    it("should detect electronAPI from global.window", () => {
      expect(ipc.concept.list).toBeDefined();
    });

    it("should throw error when electronAPI is not available", () => {
      // @ts-ignore
      delete global.window;
      expect(() => ipc.concept.list({})).toThrow("IPC client not available - not running in Electron");
    });

    it("should throw error when window exists but electronAPI is missing", () => {
      // @ts-ignore
      global.window = {};
      expect(() => ipc.concept.list({})).toThrow("IPC client not available - not running in Electron");
    });
  });

  describe("Concept IPC Methods", () => {
    it("should call concept.list", async () => {
      const mockResult = [{ id: "1", title: "Test" }];
      mockElectronAPI.concept.list.mockResolvedValue(mockResult);

      const result = await ipc.concept.list({ includeTrash: false });
      expect(mockElectronAPI.concept.list).toHaveBeenCalledWith({ includeTrash: false });
      expect(result).toEqual(mockResult);
    });

    it("should call concept.getById", async () => {
      const mockResult = { id: "1", title: "Test" };
      mockElectronAPI.concept.getById.mockResolvedValue(mockResult);

      const result = await ipc.concept.getById({ id: "1" });
      expect(mockElectronAPI.concept.getById).toHaveBeenCalledWith({ id: "1" });
      expect(result).toEqual(mockResult);
    });

    it("should call concept.create", async () => {
      const input = { title: "Test", content: "Content", creator: "User" };
      const mockResult = { id: "1", ...input };
      mockElectronAPI.concept.create.mockResolvedValue(mockResult);

      const result = await ipc.concept.create(input);
      expect(mockElectronAPI.concept.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call concept.update", async () => {
      const input = { id: "1", title: "Updated" };
      const mockResult = { id: "1", title: "Updated" };
      mockElectronAPI.concept.update.mockResolvedValue(mockResult);

      const result = await ipc.concept.update(input);
      expect(mockElectronAPI.concept.update).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call concept.delete", async () => {
      mockElectronAPI.concept.delete.mockResolvedValue(undefined);

      await ipc.concept.delete({ id: "1" });
      expect(mockElectronAPI.concept.delete).toHaveBeenCalledWith({ id: "1" });
    });

    it("should call concept.restore", async () => {
      mockElectronAPI.concept.restore.mockResolvedValue(undefined);

      await ipc.concept.restore({ id: "1" });
      expect(mockElectronAPI.concept.restore).toHaveBeenCalledWith({ id: "1" });
    });

    it("should call concept.purgeTrash", async () => {
      mockElectronAPI.concept.purgeTrash.mockResolvedValue(undefined);

      await ipc.concept.purgeTrash({ daysOld: 30 });
      expect(mockElectronAPI.concept.purgeTrash).toHaveBeenCalledWith({ daysOld: 30 });
    });

    it("should call concept.proposeLinks", async () => {
      const mockResult = [{ id: "1", sourceId: "1", targetId: "2" }];
      mockElectronAPI.concept.proposeLinks.mockResolvedValue(mockResult);

      const result = await ipc.concept.proposeLinks({ conceptId: "1" });
      expect(mockElectronAPI.concept.proposeLinks).toHaveBeenCalledWith({ conceptId: "1" });
      expect(result).toEqual(mockResult);
    });

    it("should call concept.generateCandidates", async () => {
      const input = { text: "Test text", maxCandidates: 5 };
      const mockResult = [{ title: "Candidate 1" }];
      mockElectronAPI.concept.generateCandidates.mockResolvedValue(mockResult);

      const result = await ipc.concept.generateCandidates(input);
      expect(mockElectronAPI.concept.generateCandidates).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });
  });

  describe("Capsule IPC Methods", () => {
    it("should call capsule.list", async () => {
      const mockResult = [{ id: "1", title: "Test" }];
      mockElectronAPI.capsule.list.mockResolvedValue(mockResult);

      const result = await ipc.capsule.list();
      expect(mockElectronAPI.capsule.list).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockResult);
    });

    it("should call capsule.getById", async () => {
      const mockResult = { id: "1", title: "Test" };
      mockElectronAPI.capsule.getById.mockResolvedValue(mockResult);

      const result = await ipc.capsule.getById({ id: "1" });
      expect(mockElectronAPI.capsule.getById).toHaveBeenCalledWith({ id: "1" });
      expect(result).toEqual(mockResult);
    });

    it("should call capsule.create", async () => {
      const input = { title: "Test", promise: "Promise", cta: "CTA" };
      const mockResult = { id: "1", ...input };
      mockElectronAPI.capsule.create.mockResolvedValue(mockResult);

      const result = await ipc.capsule.create(input);
      expect(mockElectronAPI.capsule.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call capsule.createAnchorFromPDF", async () => {
      const input = { capsuleId: "1", fileData: "base64data" };
      const mockResult = { id: "1", title: "Anchor" };
      mockElectronAPI.capsule.createAnchorFromPDF.mockResolvedValue(mockResult);

      const result = await ipc.capsule.createAnchorFromPDF(input);
      expect(mockElectronAPI.capsule.createAnchorFromPDF).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call capsule.regenerateRepurposedContent", async () => {
      mockElectronAPI.capsule.regenerateRepurposedContent.mockResolvedValue(undefined);

      await ipc.capsule.regenerateRepurposedContent({ anchorId: "1" });
      expect(mockElectronAPI.capsule.regenerateRepurposedContent).toHaveBeenCalledWith({ anchorId: "1" });
    });
  });

  describe("Link IPC Methods", () => {
    it("should call link.getAll", async () => {
      const mockResult = [{ id: "1", sourceId: "1", targetId: "2" }];
      mockElectronAPI.link.getAll.mockResolvedValue(mockResult);

      const result = await ipc.link.getAll();
      expect(mockElectronAPI.link.getAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockResult);
    });

    it("should call link.getByConcept", async () => {
      const mockResult = [{ id: "1", sourceId: "1", targetId: "2" }];
      mockElectronAPI.link.getByConcept.mockResolvedValue(mockResult);

      const result = await ipc.link.getByConcept({ conceptId: "1" });
      expect(mockElectronAPI.link.getByConcept).toHaveBeenCalledWith({ conceptId: "1" });
      expect(result).toEqual(mockResult);
    });

    it("should call link.getCountsByConcept", async () => {
      const mockResult = [{ conceptId: "1", count: 5 }];
      mockElectronAPI.link.getCountsByConcept.mockResolvedValue(mockResult);

      const result = await ipc.link.getCountsByConcept();
      expect(mockElectronAPI.link.getCountsByConcept).toHaveBeenCalledWith();
      expect(result).toEqual(mockResult);
    });

    it("should call link.create", async () => {
      const input = { sourceId: "1", targetId: "2", linkNameId: "3" };
      const mockResult = { id: "1", ...input };
      mockElectronAPI.link.create.mockResolvedValue(mockResult);

      const result = await ipc.link.create(input);
      expect(mockElectronAPI.link.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call link.update", async () => {
      const input = { id: "1", notes: "Updated notes" };
      const mockResult = { id: "1", notes: "Updated notes" };
      mockElectronAPI.link.update.mockResolvedValue(mockResult);

      const result = await ipc.link.update(input);
      expect(mockElectronAPI.link.update).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call link.delete", async () => {
      mockElectronAPI.link.delete.mockResolvedValue(undefined);

      await ipc.link.delete({ sourceId: "1", targetId: "2" });
      expect(mockElectronAPI.link.delete).toHaveBeenCalledWith({ sourceId: "1", targetId: "2" });
    });
  });

  describe("LinkName IPC Methods", () => {
    it("should call linkName.getAll", async () => {
      const mockResult = [{ id: "1", forwardName: "relates to" }];
      mockElectronAPI.linkName.getAll.mockResolvedValue(mockResult);

      const result = await ipc.linkName.getAll();
      expect(mockElectronAPI.linkName.getAll).toHaveBeenCalledWith();
      expect(result).toEqual(mockResult);
    });

    it("should call linkName.create", async () => {
      const input = { forwardName: "relates to" };
      const mockResult = { id: "1", ...input };
      mockElectronAPI.linkName.create.mockResolvedValue(mockResult);

      const result = await ipc.linkName.create(input);
      expect(mockElectronAPI.linkName.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call linkName.update", async () => {
      const input = { id: "1", forwardName: "updated" };
      const mockResult = { id: "1", forwardName: "updated" };
      mockElectronAPI.linkName.update.mockResolvedValue(mockResult);

      const result = await ipc.linkName.update(input);
      expect(mockElectronAPI.linkName.update).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call linkName.delete", async () => {
      mockElectronAPI.linkName.delete.mockResolvedValue(undefined);

      await ipc.linkName.delete({ id: "1" });
      expect(mockElectronAPI.linkName.delete).toHaveBeenCalledWith({ id: "1" });
    });

    it("should call linkName.getUsage", async () => {
      const mockResult = { count: 5 };
      mockElectronAPI.linkName.getUsage.mockResolvedValue(mockResult);

      const result = await ipc.linkName.getUsage({ id: "1" });
      expect(mockElectronAPI.linkName.getUsage).toHaveBeenCalledWith({ id: "1" });
      expect(result).toEqual(mockResult);
    });
  });

  describe("Config IPC Methods", () => {
    it("should call config.getStyleGuide", async () => {
      const mockResult = { content: "Style guide" };
      mockElectronAPI.config.getStyleGuide.mockResolvedValue(mockResult);

      const result = await ipc.config.getStyleGuide();
      expect(mockElectronAPI.config.getStyleGuide).toHaveBeenCalledWith();
      expect(result).toEqual(mockResult);
    });

    it("should call config.getCredo", async () => {
      const mockResult = { content: "Credo" };
      mockElectronAPI.config.getCredo.mockResolvedValue(mockResult);

      const result = await ipc.config.getCredo();
      expect(mockElectronAPI.config.getCredo).toHaveBeenCalledWith();
      expect(result).toEqual(mockResult);
    });

    it("should call config.getConstraints", async () => {
      const mockResult = { content: "Constraints" };
      mockElectronAPI.config.getConstraints.mockResolvedValue(mockResult);

      const result = await ipc.config.getConstraints();
      expect(mockElectronAPI.config.getConstraints).toHaveBeenCalledWith();
      expect(result).toEqual(mockResult);
    });

    it("should call config.updateStyleGuide", async () => {
      const input = { content: "Updated style guide" };
      mockElectronAPI.config.updateStyleGuide.mockResolvedValue(undefined);

      await ipc.config.updateStyleGuide(input);
      expect(mockElectronAPI.config.updateStyleGuide).toHaveBeenCalledWith(input);
    });

    it("should call config.getStatus", async () => {
      const mockResult = { styleGuide: true, credo: true, constraints: true };
      mockElectronAPI.config.getStatus.mockResolvedValue(mockResult);

      const result = await ipc.config.getStatus();
      expect(mockElectronAPI.config.getStatus).toHaveBeenCalledWith();
      expect(result).toEqual(mockResult);
    });
  });

  describe("PDF IPC Methods", () => {
    it("should call pdf.extractText", async () => {
      const input = { fileData: "base64data", fileName: "test.pdf" };
      const mockResult = { text: "Extracted text" };
      mockElectronAPI.pdf.extractText.mockResolvedValue(mockResult);

      const result = await ipc.pdf.extractText(input);
      expect(mockElectronAPI.pdf.extractText).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });
  });

  describe("AI IPC Methods", () => {
    it("should call ai.getSettings", async () => {
      const mockResult = { provider: "openai", model: "gpt-4o", temperature: 0.7 };
      mockElectronAPI.ai.getSettings.mockResolvedValue(mockResult);

      const result = await ipc.ai.getSettings();
      expect(mockElectronAPI.ai.getSettings).toHaveBeenCalledWith();
      expect(result).toEqual(mockResult);
    });

    it("should call ai.updateSettings", async () => {
      const input = { provider: "gemini" as const };
      const mockResult = { provider: "gemini", model: "gemini-3-pro-preview", temperature: 0.7 };
      mockElectronAPI.ai.updateSettings.mockResolvedValue(mockResult);

      const result = await ipc.ai.updateSettings(input);
      expect(mockElectronAPI.ai.updateSettings).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call ai.getAvailableModels", async () => {
      const mockResult = { provider: "openai", models: [{ value: "gpt-4o", label: "GPT-4o" }] };
      mockElectronAPI.ai.getAvailableModels.mockResolvedValue(mockResult);

      const result = await ipc.ai.getAvailableModels();
      expect(mockElectronAPI.ai.getAvailableModels).toHaveBeenCalledWith();
      expect(result).toEqual(mockResult);
    });

    it("should call ai.getEmbeddingStatus", async () => {
      const mockResult = { totalConcepts: 10, conceptsWithEmbeddings: 8, conceptsWithoutEmbeddings: 2, isIndexing: false, lastIndexedAt: null };
      mockElectronAPI.ai.getEmbeddingStatus.mockResolvedValue(mockResult);

      const result = await ipc.ai.getEmbeddingStatus();
      expect(mockElectronAPI.ai.getEmbeddingStatus).toHaveBeenCalledWith();
      expect(result).toEqual(mockResult);
    });

    it("should call ai.generateMissingEmbeddings", async () => {
      const mockResult = { totalConcepts: 10, conceptsWithEmbeddings: 10, conceptsWithoutEmbeddings: 0, isIndexing: false, lastIndexedAt: new Date().toISOString() };
      mockElectronAPI.ai.generateMissingEmbeddings.mockResolvedValue(mockResult);

      const result = await ipc.ai.generateMissingEmbeddings();
      expect(mockElectronAPI.ai.generateMissingEmbeddings).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockResult);
    });

    it("should call ai.retryFailedEmbeddings", async () => {
      const mockResult = { totalConcepts: 10, conceptsWithEmbeddings: 10, conceptsWithoutEmbeddings: 0, isIndexing: false, lastIndexedAt: new Date().toISOString() };
      mockElectronAPI.ai.retryFailedEmbeddings.mockResolvedValue(mockResult);

      const result = await ipc.ai.retryFailedEmbeddings();
      expect(mockElectronAPI.ai.retryFailedEmbeddings).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockResult);
    });
  });

  describe("Offer IPC Methods", () => {
    it("should call offer.list", async () => {
      const mockResult = [{ id: "1", name: "Offer 1" }];
      mockElectronAPI.offer.list.mockResolvedValue(mockResult);

      const result = await ipc.offer.list();
      expect(mockElectronAPI.offer.list).toHaveBeenCalledWith();
      expect(result).toEqual(mockResult);
    });

    it("should call offer.getById", async () => {
      const mockResult = { id: "1", name: "Offer 1" };
      mockElectronAPI.offer.getById.mockResolvedValue(mockResult);

      const result = await ipc.offer.getById({ id: "1" });
      expect(mockElectronAPI.offer.getById).toHaveBeenCalledWith({ id: "1" });
      expect(result).toEqual(mockResult);
    });

    it("should call offer.create", async () => {
      const input = { name: "New Offer" };
      const mockResult = { id: "1", ...input };
      mockElectronAPI.offer.create.mockResolvedValue(mockResult);

      const result = await ipc.offer.create(input);
      expect(mockElectronAPI.offer.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call offer.update", async () => {
      const input = { id: "1", name: "Updated Offer" };
      const mockResult = { id: "1", name: "Updated Offer" };
      mockElectronAPI.offer.update.mockResolvedValue(mockResult);

      const result = await ipc.offer.update(input);
      expect(mockElectronAPI.offer.update).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call offer.delete", async () => {
      mockElectronAPI.offer.delete.mockResolvedValue(undefined);

      await ipc.offer.delete({ id: "1" });
      expect(mockElectronAPI.offer.delete).toHaveBeenCalledWith({ id: "1" });
    });

    it("should call offer.assignCapsule", async () => {
      mockElectronAPI.offer.assignCapsule.mockResolvedValue(undefined);

      await ipc.offer.assignCapsule({ capsuleId: "1", offerId: "2" });
      expect(mockElectronAPI.offer.assignCapsule).toHaveBeenCalledWith({ capsuleId: "1", offerId: "2" });
    });

    it("should call offer.getUnassignedCapsules", async () => {
      const mockResult = [{ id: "1", title: "Unassigned" }];
      mockElectronAPI.offer.getUnassignedCapsules.mockResolvedValue(mockResult);

      const result = await ipc.offer.getUnassignedCapsules();
      expect(mockElectronAPI.offer.getUnassignedCapsules).toHaveBeenCalledWith();
      expect(result).toEqual(mockResult);
    });
  });

  describe("Enrichment IPC Methods", () => {
    it("should call enrichment.analyze", async () => {
      const input = { title: "Test", description: "Desc", content: "Content", creator: "User", source: "Source", year: "2024" };
      const mockResult = { suggestions: [] };
      mockElectronAPI.enrichment.analyze.mockResolvedValue(mockResult);

      const result = await ipc.enrichment.analyze(input);
      expect(mockElectronAPI.enrichment.analyze).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call enrichment.enrichMetadata", async () => {
      const input = { title: "Test", description: "Desc" };
      const mockResult = { title: "Enriched Title", description: "Enriched Desc" };
      mockElectronAPI.enrichment.enrichMetadata.mockResolvedValue(mockResult);

      const result = await ipc.enrichment.enrichMetadata(input);
      expect(mockElectronAPI.enrichment.enrichMetadata).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call enrichment.chat", async () => {
      const input = {
        message: "Hello",
        conceptData: { title: "Test", description: "Desc", content: "Content", creator: "User", source: "Source", year: "2024" },
        chatHistory: [],
      };
      const mockResult = { response: "Hi there" };
      mockElectronAPI.enrichment.chat.mockResolvedValue(mockResult);

      const result = await ipc.enrichment.chat(input);
      expect(mockElectronAPI.enrichment.chat).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call enrichment.expandDefinition", async () => {
      const input = { currentDefinition: "Short", conceptTitle: "Test" };
      const mockResult = { expandedDefinition: "Long definition" };
      mockElectronAPI.enrichment.expandDefinition.mockResolvedValue(mockResult);

      const result = await ipc.enrichment.expandDefinition(input);
      expect(mockElectronAPI.enrichment.expandDefinition).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });
  });

  describe("Chat IPC Methods", () => {
    it("should call chat.createSession", async () => {
      const input = { conceptId: "1", title: "Session" };
      const mockResult = { id: "1", ...input };
      mockElectronAPI.chat.createSession.mockResolvedValue(mockResult);

      const result = await ipc.chat.createSession(input);
      expect(mockElectronAPI.chat.createSession).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call chat.getSessionsByConceptId", async () => {
      const mockResult = [{ id: "1", conceptId: "1" }];
      mockElectronAPI.chat.getSessionsByConceptId.mockResolvedValue(mockResult);

      const result = await ipc.chat.getSessionsByConceptId({ conceptId: "1" });
      expect(mockElectronAPI.chat.getSessionsByConceptId).toHaveBeenCalledWith({ conceptId: "1" });
      expect(result).toEqual(mockResult);
    });

    it("should call chat.getSessionById", async () => {
      const mockResult = { id: "1", conceptId: "1" };
      mockElectronAPI.chat.getSessionById.mockResolvedValue(mockResult);

      const result = await ipc.chat.getSessionById({ id: "1" });
      expect(mockElectronAPI.chat.getSessionById).toHaveBeenCalledWith({ id: "1" });
      expect(result).toEqual(mockResult);
    });

    it("should call chat.deleteSession", async () => {
      mockElectronAPI.chat.deleteSession.mockResolvedValue(undefined);

      await ipc.chat.deleteSession({ id: "1" });
      expect(mockElectronAPI.chat.deleteSession).toHaveBeenCalledWith({ id: "1" });
    });

    it("should call chat.addMessage", async () => {
      const input = { sessionId: "1", role: "user" as const, content: "Hello" };
      const mockResult = { id: "1", ...input };
      mockElectronAPI.chat.addMessage.mockResolvedValue(mockResult);

      const result = await ipc.chat.addMessage(input);
      expect(mockElectronAPI.chat.addMessage).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should call chat.getOrCreateSession", async () => {
      const input = { conceptId: "1" };
      const mockResult = { id: "1", conceptId: "1" };
      mockElectronAPI.chat.getOrCreateSession.mockResolvedValue(mockResult);

      const result = await ipc.chat.getOrCreateSession(input);
      expect(mockElectronAPI.chat.getOrCreateSession).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });
  });

  describe("Error Propagation", () => {
    it("should propagate errors from electronAPI", async () => {
      const error = new Error("IPC error");
      mockElectronAPI.concept.list.mockRejectedValue(error);

      await expect(ipc.concept.list({})).rejects.toThrow("IPC error");
    });

    it("should handle different error types", async () => {
      const error = new TypeError("Type error");
      mockElectronAPI.concept.getById.mockRejectedValue(error);

      await expect(ipc.concept.getById({ id: "1" })).rejects.toThrow("Type error");
    });
  });
});
