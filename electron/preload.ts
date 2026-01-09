import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "../src/types/electron-api";

/**
 * Preload script - exposes IPC methods to the renderer process
 * 
 * IMPORTANT: This implementation MUST match the ElectronAPI interface
 * defined in src/types/electron-api.ts. TypeScript will enforce this.
 */

// Implementation of ElectronAPI - TypeScript will error if this doesn't match the interface
const electronAPI: ElectronAPI = {
  // Concept handlers
  concept: {
    list: (input) => ipcRenderer.invoke("concept:list", input),
    getById: (input) => ipcRenderer.invoke("concept:getById", input),
    create: (input) => ipcRenderer.invoke("concept:create", input),
    update: (input) => ipcRenderer.invoke("concept:update", input),
    delete: (input) => ipcRenderer.invoke("concept:delete", input),
    restore: (input) => ipcRenderer.invoke("concept:restore", input),
    purgeTrash: (input) => ipcRenderer.invoke("concept:purgeTrash", input),
    proposeLinks: (input) => ipcRenderer.invoke("concept:proposeLinks", input),
    generateCandidates: (input) => ipcRenderer.invoke("concept:generateCandidates", input),
  },

  // Capsule handlers
  capsule: {
    list: (input) => ipcRenderer.invoke("capsule:list", input),
    getById: (input) => ipcRenderer.invoke("capsule:getById", input),
    create: (input) => ipcRenderer.invoke("capsule:create", input),
    createAnchorFromPDF: (input) => ipcRenderer.invoke("capsule:createAnchorFromPDF", input),
    regenerateRepurposedContent: (input) => ipcRenderer.invoke("capsule:regenerateRepurposedContent", input),
  },

  // Offer handlers
  offer: {
    list: () => ipcRenderer.invoke("offer:list"),
    getById: (input) => ipcRenderer.invoke("offer:getById", input),
    create: (input) => ipcRenderer.invoke("offer:create", input),
    update: (input) => ipcRenderer.invoke("offer:update", input),
    delete: (input) => ipcRenderer.invoke("offer:delete", input),
    assignCapsule: (input) => ipcRenderer.invoke("offer:assignCapsule", input),
    getUnassignedCapsules: () => ipcRenderer.invoke("offer:getUnassignedCapsules"),
  },

  // Chat handlers
  chat: {
    createSession: (input) => ipcRenderer.invoke("chat:createSession", input),
    getSessionsByConceptId: (input) => ipcRenderer.invoke("chat:getSessionsByConceptId", input),
    getSessionById: (input) => ipcRenderer.invoke("chat:getSessionById", input),
    deleteSession: (input) => ipcRenderer.invoke("chat:deleteSession", input),
    addMessage: (input) => ipcRenderer.invoke("chat:addMessage", input),
    getOrCreateSession: (input) => ipcRenderer.invoke("chat:getOrCreateSession", input),
  },

  // Link handlers
  link: {
    getAll: (input) => ipcRenderer.invoke("link:getAll", input),
    getByConcept: (input) => ipcRenderer.invoke("link:getByConcept", input),
    create: (input) => ipcRenderer.invoke("link:create", input),
    update: (input) => ipcRenderer.invoke("link:update", input),
    delete: (input) => ipcRenderer.invoke("link:delete", input),
  },

  // LinkName handlers
  linkName: {
    getAll: () => ipcRenderer.invoke("linkName:getAll"),
    create: (input) => ipcRenderer.invoke("linkName:create", input),
    update: (input) => ipcRenderer.invoke("linkName:update", input),
    delete: (input) => ipcRenderer.invoke("linkName:delete", input),
    getUsage: (input) => ipcRenderer.invoke("linkName:getUsage", input),
  },

  // Config handlers
  config: {
    getStyleGuide: () => ipcRenderer.invoke("config:getStyleGuide"),
    getCredo: () => ipcRenderer.invoke("config:getCredo"),
    getConstraints: () => ipcRenderer.invoke("config:getConstraints"),
    getStyleGuideRaw: () => ipcRenderer.invoke("config:getStyleGuideRaw"),
    getCredoRaw: () => ipcRenderer.invoke("config:getCredoRaw"),
    getConstraintsRaw: () => ipcRenderer.invoke("config:getConstraintsRaw"),
    updateStyleGuide: (input) => ipcRenderer.invoke("config:updateStyleGuide", input),
    updateCredo: (input) => ipcRenderer.invoke("config:updateCredo", input),
    updateConstraints: (input) => ipcRenderer.invoke("config:updateConstraints", input),
    getStatus: () => ipcRenderer.invoke("config:getStatus"),
  },

  // PDF handlers
  pdf: {
    extractText: (input) => ipcRenderer.invoke("pdf:extractText", input),
  },

  // AI handlers
  ai: {
    getSettings: () => ipcRenderer.invoke("ai:getSettings"),
    updateSettings: (input) => ipcRenderer.invoke("ai:updateSettings", input),
    getAvailableModels: () => ipcRenderer.invoke("ai:getAvailableModels"),
    getEmbeddingStatus: () => ipcRenderer.invoke("ai:getEmbeddingStatus"),
    generateMissingEmbeddings: (input) => ipcRenderer.invoke("ai:generateMissingEmbeddings", input),
    retryFailedEmbeddings: (input) => ipcRenderer.invoke("ai:retryFailedEmbeddings", input),
  },

  // Enrichment handlers
  enrichment: {
    analyze: (input) => ipcRenderer.invoke("enrichment:analyze", input),
    enrichMetadata: (input) => ipcRenderer.invoke("enrichment:enrichMetadata", input),
    chat: (input) => ipcRenderer.invoke("enrichment:chat", input),
    expandDefinition: (input) => ipcRenderer.invoke("enrichment:expandDefinition", input),
  },

  // Ping for testing
  ping: () => ipcRenderer.invoke("ping"),
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", electronAPI);

// Note: Window type augmentation is handled in src/types/electron-api.ts
// via the `declare global { interface Window { electronAPI: ElectronAPI } }` block
