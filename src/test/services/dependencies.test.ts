/**
 * Tests for dependency injection container
 * Tests getDependencies, setDependencies, resetDependencies, getDependency
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  getDependencies,
  setDependencies,
  resetDependencies,
  getDependency,
  type AppDependencies,
} from "~/server/dependencies";
import type { LLMClient } from "~/server/services/llm/client";
import type { ConfigLoader } from "~/server/services/config";
import type { DatabaseInstance } from "~/server/db";

// Mock the singleton getters
const mockLLMClient = {
  complete: jest.fn(),
  completeJSON: jest.fn(),
  embed: jest.fn(),
  getProvider: jest.fn(() => "openai"),
  getModel: jest.fn(() => "gpt-4"),
  getTemperature: jest.fn(() => 0.7),
  setModel: jest.fn(),
  setTemperature: jest.fn(),
  setProvider: jest.fn(),
} as unknown as LLMClient;

const mockConfigLoader = {
  getStyleGuide: jest.fn(),
  getCredo: jest.fn(),
  getConstraints: jest.fn(),
  getSystemPrompt: jest.fn(),
  getPrompt: jest.fn(),
  validateConfigForContentGeneration: jest.fn(),
  reloadConfigs: jest.fn(),
  getConfigStatus: jest.fn(),
} as unknown as ConfigLoader;

const mockDb = {} as unknown as DatabaseInstance;

jest.mock("~/server/services/llm/client", () => ({
  getLLMClient: jest.fn(() => mockLLMClient),
}));

jest.mock("~/server/services/config", () => ({
  getConfigLoader: jest.fn(() => mockConfigLoader),
}));

jest.mock("~/server/db", () => ({
  db: mockDb,
}));

describe("Dependency Injection Container", () => {
  beforeEach(() => {
    resetDependencies();
    jest.clearAllMocks();
  });

  describe("getDependencies", () => {
    it("should return production dependencies when none are set", () => {
      const deps = getDependencies();
      
      expect(deps).toHaveProperty("llmClient");
      expect(deps).toHaveProperty("configLoader");
      expect(deps).toHaveProperty("db");
    });

    it("should return the same instance on subsequent calls (singleton)", () => {
      const deps1 = getDependencies();
      const deps2 = getDependencies();
      
      expect(deps1).toBe(deps2);
    });
  });

  describe("setDependencies", () => {
    it("should allow setting custom dependencies", () => {
      const customDeps: AppDependencies = {
        llmClient: mockLLMClient,
        configLoader: mockConfigLoader,
        db: mockDb,
      };

      setDependencies(customDeps);
      const deps = getDependencies();

      expect(deps).toBe(customDeps);
      expect(deps.llmClient).toBe(mockLLMClient);
      expect(deps.configLoader).toBe(mockConfigLoader);
      expect(deps.db).toBe(mockDb);
    });
  });

  describe("resetDependencies", () => {
    it("should reset dependencies to null", () => {
      const customDeps: AppDependencies = {
        llmClient: mockLLMClient,
        configLoader: mockConfigLoader,
        db: mockDb,
      };

      setDependencies(customDeps);
      resetDependencies();
      
      // After reset, getDependencies should create fresh production dependencies
      const deps = getDependencies();
      expect(deps).not.toBe(customDeps);
    });

    it("should allow setting new dependencies after reset", () => {
      const customDeps1: AppDependencies = {
        llmClient: mockLLMClient,
        configLoader: mockConfigLoader,
        db: mockDb,
      };

      setDependencies(customDeps1);
      resetDependencies();

      const customDeps2: AppDependencies = {
        llmClient: mockLLMClient,
        configLoader: mockConfigLoader,
        db: mockDb,
      };

      setDependencies(customDeps2);
      const deps = getDependencies();

      expect(deps).toBe(customDeps2);
    });
  });

  describe("getDependency", () => {
    it("should return a specific dependency by key", () => {
      const customDeps: AppDependencies = {
        llmClient: mockLLMClient,
        configLoader: mockConfigLoader,
        db: mockDb,
      };

      setDependencies(customDeps);

      expect(getDependency("llmClient")).toBe(mockLLMClient);
      expect(getDependency("configLoader")).toBe(mockConfigLoader);
      expect(getDependency("db")).toBe(mockDb);
    });

    it("should work with production dependencies", () => {
      const llmClient = getDependency("llmClient");
      const configLoader = getDependency("configLoader");
      const db = getDependency("db");

      expect(llmClient).toBeDefined();
      expect(configLoader).toBeDefined();
      expect(db).toBeDefined();
    });
  });
});

