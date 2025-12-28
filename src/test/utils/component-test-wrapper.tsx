/**
 * Test wrapper for components using IPC hooks
 * Mocks window.electronAPI for component tests
 */

import React from "react";
import { jest } from "@jest/globals";

// Mock window.electronAPI
const mockElectronAPI = {
  concept: {
    list: jest.fn(() => Promise.resolve([])),
    getById: jest.fn(() => Promise.resolve(null)),
    create: jest.fn(() => Promise.resolve({ id: "1", title: "New" })),
    update: jest.fn(() => Promise.resolve({ id: "1", title: "Updated" })),
    delete: jest.fn(() => Promise.resolve({ id: "1", status: "trash" })),
    restore: jest.fn(() => Promise.resolve({ id: "1", status: "active" })),
    purgeTrash: jest.fn(() => Promise.resolve({ deletedCount: 0 })),
    proposeLinks: jest.fn(() => Promise.resolve([])),
    generateCandidates: jest.fn(() => Promise.resolve([])),
  },
  link: {
    getAll: jest.fn(() => Promise.resolve([])),
    getByConcept: jest.fn(() => Promise.resolve({ outgoing: [], incoming: [] })),
    create: jest.fn(() => Promise.resolve({ id: "1" })),
    delete: jest.fn(() => Promise.resolve(null)),
  },
  capsule: {
    list: jest.fn(() => Promise.resolve([])),
    getById: jest.fn(() => Promise.resolve(null)),
    create: jest.fn(() => Promise.resolve({ id: "1" })),
    createAnchorFromPDF: jest.fn(() => Promise.resolve({ anchor: {}, repurposedContent: [] })),
  },
  config: {
    getStyleGuide: jest.fn(() => Promise.resolve({ voice: "test" })),
    getCredo: jest.fn(() => Promise.resolve({ values: [] })),
    getConstraints: jest.fn(() => Promise.resolve({ rules: [] })),
    getStyleGuideRaw: jest.fn(() => Promise.resolve({ content: "" })),
    getCredoRaw: jest.fn(() => Promise.resolve({ content: "" })),
    getConstraintsRaw: jest.fn(() => Promise.resolve({ content: "" })),
    updateStyleGuide: jest.fn(() => Promise.resolve({ success: true })),
    updateCredo: jest.fn(() => Promise.resolve({ success: true })),
    updateConstraints: jest.fn(() => Promise.resolve({ success: true })),
    getStatus: jest.fn(() => Promise.resolve({ styleGuide: true, credo: true, constraints: true })),
  },
  pdf: {
    extractText: jest.fn(() => Promise.resolve({ text: "", numPages: 0 })),
  },
  ai: {
    getSettings: jest.fn(() => Promise.resolve({ provider: "gemini", model: "gemini-3-pro-preview", temperature: 0.7 })),
    updateSettings: jest.fn(() => Promise.resolve({ provider: "gemini", model: "gemini-3-pro-preview", temperature: 0.7 })),
    getAvailableModels: jest.fn(() => Promise.resolve({ provider: "gemini", models: [] })),
  },
  ping: jest.fn(() => Promise.resolve("pong")),
};

// Setup window.electronAPI before components are imported
if (typeof window !== "undefined") {
  (window as any).electronAPI = mockElectronAPI;
} else {
  (global as any).window = { electronAPI: mockElectronAPI };
}

export function ComponentTestWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function getMockElectronAPI() {
  return mockElectronAPI;
}

export function resetMockElectronAPI() {
  Object.values(mockElectronAPI).forEach((namespace) => {
    if (typeof namespace === "object") {
      Object.values(namespace).forEach((method) => {
        if (jest.isMockFunction(method)) {
          method.mockClear();
        }
      });
    }
  });
}

