import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Concept handlers
  concept: {
    list: (input: { includeTrash?: boolean; search?: string }) =>
      ipcRenderer.invoke("concept:list", input),
    getById: (input: { id: string }) =>
      ipcRenderer.invoke("concept:getById", input),
    create: (input: {
      title: string;
      description?: string;
      content: string;
      creator: string;
      source?: string;
      year?: string;
    }) => ipcRenderer.invoke("concept:create", input),
    update: (input: {
      id: string;
      title?: string;
      description?: string;
      content?: string;
      creator?: string;
      source?: string;
      year?: string;
    }) => ipcRenderer.invoke("concept:update", input),
    delete: (input: { id: string }) =>
      ipcRenderer.invoke("concept:delete", input),
    restore: (input: { id: string }) =>
      ipcRenderer.invoke("concept:restore", input),
    purgeTrash: (input: { daysOld?: number }) =>
      ipcRenderer.invoke("concept:purgeTrash", input),
    proposeLinks: (input: { conceptId: string; maxProposals?: number }) =>
      ipcRenderer.invoke("concept:proposeLinks", input),
    generateCandidates: (input: {
      text: string;
      instructions?: string;
      maxCandidates?: number;
      defaultCreator?: string;
      defaultYear?: string;
    }) => ipcRenderer.invoke("concept:generateCandidates", input),
  },

  // Capsule handlers
  capsule: {
    list: (input?: { summary?: boolean }) =>
      ipcRenderer.invoke("capsule:list", input),
    getById: (input: { id: string }) =>
      ipcRenderer.invoke("capsule:getById", input),
    create: (input: {
      title: string;
      promise: string;
      cta: string;
      offerMapping?: string;
    }) => ipcRenderer.invoke("capsule:create", input),
    createAnchorFromPDF: (input: {
      capsuleId: string;
      fileData: string;
      fileName?: string;
      autoRepurpose?: boolean;
    }) => ipcRenderer.invoke("capsule:createAnchorFromPDF", input),
  },

  // Link handlers
  link: {
    getAll: (input?: { summary?: boolean }) =>
      ipcRenderer.invoke("link:getAll", input),
    getByConcept: (input: { conceptId: string }) =>
      ipcRenderer.invoke("link:getByConcept", input),
    create: (input: {
      sourceId: string;
      targetId: string;
      linkNameId: string;
      notes?: string;
    }) => ipcRenderer.invoke("link:create", input),
    delete: (input: { sourceId: string; targetId: string }) =>
      ipcRenderer.invoke("link:delete", input),
  },

  // LinkName handlers
  linkName: {
    getAll: () => ipcRenderer.invoke("linkName:getAll"),
    create: (input: { forwardName: string; reverseName?: string }) =>
      ipcRenderer.invoke("linkName:create", input),
    update: (input: { id: string; forwardName: string; reverseName?: string }) =>
      ipcRenderer.invoke("linkName:update", input),
    delete: (input: { id: string; replaceWithId?: string }) =>
      ipcRenderer.invoke("linkName:delete", input),
    getUsage: (input: { id: string }) =>
      ipcRenderer.invoke("linkName:getUsage", input),
  },

  // Config handlers
  config: {
    getStyleGuide: () => ipcRenderer.invoke("config:getStyleGuide"),
    getCredo: () => ipcRenderer.invoke("config:getCredo"),
    getConstraints: () => ipcRenderer.invoke("config:getConstraints"),
    getStyleGuideRaw: () => ipcRenderer.invoke("config:getStyleGuideRaw"),
    getCredoRaw: () => ipcRenderer.invoke("config:getCredoRaw"),
    getConstraintsRaw: () => ipcRenderer.invoke("config:getConstraintsRaw"),
    updateStyleGuide: (input: { content: string }) =>
      ipcRenderer.invoke("config:updateStyleGuide", input),
    updateCredo: (input: { content: string }) =>
      ipcRenderer.invoke("config:updateCredo", input),
    updateConstraints: (input: { content: string }) =>
      ipcRenderer.invoke("config:updateConstraints", input),
    getStatus: () => ipcRenderer.invoke("config:getStatus"),
  },

  // PDF handlers
  pdf: {
    extractText: (input: { fileData: string; fileName?: string }) =>
      ipcRenderer.invoke("pdf:extractText", input),
  },

  // AI handlers
  ai: {
    getSettings: () => ipcRenderer.invoke("ai:getSettings"),
    updateSettings: (input: {
      provider?: "openai" | "gemini";
      model?: string;
      temperature?: number;
    }) => ipcRenderer.invoke("ai:updateSettings", input),
    getAvailableModels: () => ipcRenderer.invoke("ai:getAvailableModels"),
  },

  // Ping for testing
  ping: () => ipcRenderer.invoke("ping"),
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      concept: {
        list: (input: { includeTrash?: boolean; search?: string }) => Promise<any>;
        getById: (input: { id: string }) => Promise<any>;
        create: (input: {
          title: string;
          description?: string;
          content: string;
          creator: string;
          source?: string;
          year?: string;
        }) => Promise<any>;
        update: (input: {
          id: string;
          title?: string;
          description?: string;
          content?: string;
          creator?: string;
          source?: string;
          year?: string;
        }) => Promise<any>;
        delete: (input: { id: string }) => Promise<any>;
        restore: (input: { id: string }) => Promise<any>;
        purgeTrash: (input: { daysOld?: number }) => Promise<any>;
        proposeLinks: (input: { conceptId: string; maxProposals?: number }) => Promise<any>;
        generateCandidates: (input: {
          text: string;
          instructions?: string;
          maxCandidates?: number;
          defaultCreator?: string;
          defaultYear?: string;
        }) => Promise<any>;
      };
      link: {
        getAll: (input?: { summary?: boolean }) => Promise<any>;
        getByConcept: (input: { conceptId: string }) => Promise<any>;
        create: (input: {
          sourceId: string;
          targetId: string;
          linkNameId: string;
          notes?: string;
        }) => Promise<any>;
        delete: (input: { sourceId: string; targetId: string }) => Promise<any>;
      };
      config: {
        getStyleGuide: () => Promise<any>;
        getCredo: () => Promise<any>;
        getConstraints: () => Promise<any>;
        getStyleGuideRaw: () => Promise<any>;
        getCredoRaw: () => Promise<any>;
        getConstraintsRaw: () => Promise<any>;
        updateStyleGuide: (input: { content: string }) => Promise<any>;
        updateCredo: (input: { content: string }) => Promise<any>;
        updateConstraints: (input: { content: string }) => Promise<any>;
        getStatus: () => Promise<any>;
      };
      pdf: {
        extractText: (input: { fileData: string; fileName?: string }) => Promise<any>;
      };
      ai: {
        getSettings: () => Promise<any>;
        updateSettings: (input: {
          provider?: "openai" | "gemini";
          model?: string;
          temperature?: number;
        }) => Promise<any>;
        getAvailableModels: () => Promise<any>;
      };
      ping: () => Promise<string>;
    };
  }
}
