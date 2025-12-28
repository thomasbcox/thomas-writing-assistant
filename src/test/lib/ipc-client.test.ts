/**
 * Tests for IPC client library
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { ipc } from "~/lib/ipc-client";

// Mock window.electronAPI
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
  link: {
    getAll: jest.fn(),
    getByConcept: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  capsule: {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    createAnchorFromPDF: jest.fn(),
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
  },
  ping: jest.fn(),
};

describe("IPC Client", () => {
  beforeEach(() => {
    // Setup window.electronAPI mock - need to set global.window for Node.js test environment
    (global as any).window = {
      electronAPI: mockElectronAPI,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up window mock
    delete (global as any).window;
  });

  describe("concept methods", () => {
    it("should call electronAPI.concept.list", async () => {
      const mockData = [{ id: "1", title: "Test" }];
      mockElectronAPI.concept.list.mockResolvedValue(mockData);

      const result = await ipc.concept.list({ includeTrash: false });

      expect(mockElectronAPI.concept.list).toHaveBeenCalledWith({ includeTrash: false });
      expect(result).toEqual(mockData);
    });

    it("should call electronAPI.concept.getById", async () => {
      const mockData = { id: "1", title: "Test" };
      mockElectronAPI.concept.getById.mockResolvedValue(mockData);

      const result = await ipc.concept.getById({ id: "1" });

      expect(mockElectronAPI.concept.getById).toHaveBeenCalledWith({ id: "1" });
      expect(result).toEqual(mockData);
    });

    it("should call electronAPI.concept.create", async () => {
      const mockData = { id: "1", title: "New Concept" };
      const input = {
        title: "New Concept",
        content: "Content",
        creator: "Creator",
      };
      mockElectronAPI.concept.create.mockResolvedValue(mockData);

      const result = await ipc.concept.create(input);

      expect(mockElectronAPI.concept.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockData);
    });

    it("should throw error when electronAPI not available", () => {
      (global as any).window = {};

      expect(() => {
        ipc.concept.list({ includeTrash: false });
      }).toThrow("IPC client not available - not running in Electron");
    });
  });

  describe("link methods", () => {
    it("should call electronAPI.link.getAll", async () => {
      const mockData = [{ id: "1", sourceId: "s1", targetId: "t1" }];
      mockElectronAPI.link.getAll.mockResolvedValue(mockData);

      const result = await ipc.link.getAll({ summary: true });

      expect(mockElectronAPI.link.getAll).toHaveBeenCalledWith({ summary: true });
      expect(result).toEqual(mockData);
    });

    it("should call electronAPI.link.create", async () => {
      const mockData = { id: "1", sourceId: "s1", targetId: "t1" };
      const input = {
        sourceId: "s1",
        targetId: "t1",
        linkNameId: "ln1",
      };
      mockElectronAPI.link.create.mockResolvedValue(mockData);

      const result = await ipc.link.create(input);

      expect(mockElectronAPI.link.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockData);
    });
  });

  describe("config methods", () => {
    it("should call electronAPI.config.getStyleGuide", async () => {
      const mockData = { voice: "test" };
      mockElectronAPI.config.getStyleGuide.mockResolvedValue(mockData);

      const result = await ipc.config.getStyleGuide();

      expect(mockElectronAPI.config.getStyleGuide).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it("should call electronAPI.config.updateStyleGuide", async () => {
      const input = { content: "new content" };
      mockElectronAPI.config.updateStyleGuide.mockResolvedValue({ success: true });

      const result = await ipc.config.updateStyleGuide(input);

      expect(mockElectronAPI.config.updateStyleGuide).toHaveBeenCalledWith(input);
      expect(result).toEqual({ success: true });
    });
  });

  describe("pdf methods", () => {
    it("should call electronAPI.pdf.extractText", async () => {
      const mockData = { text: "extracted text", numPages: 1 };
      const input = { fileData: "base64data", fileName: "test.pdf" };
      mockElectronAPI.pdf.extractText.mockResolvedValue(mockData);

      const result = await ipc.pdf.extractText(input);

      expect(mockElectronAPI.pdf.extractText).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockData);
    });
  });

  describe("ai methods", () => {
    it("should call electronAPI.ai.getSettings", async () => {
      const mockData = { provider: "gemini", model: "gemini-3-pro-preview", temperature: 0.7 };
      mockElectronAPI.ai.getSettings.mockResolvedValue(mockData);

      const result = await ipc.ai.getSettings();

      expect(mockElectronAPI.ai.getSettings).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it("should call electronAPI.ai.updateSettings", async () => {
      const input = { provider: "openai" as const, model: "gpt-4o", temperature: 0.8 };
      const mockData = { provider: "openai", model: "gpt-4o", temperature: 0.8 };
      mockElectronAPI.ai.updateSettings.mockResolvedValue(mockData);

      const result = await ipc.ai.updateSettings(input);

      expect(mockElectronAPI.ai.updateSettings).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockData);
    });
  });
});

