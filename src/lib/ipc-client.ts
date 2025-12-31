/**
 * IPC Client - Type-safe wrapper around Electron IPC
 * Replaces tRPC client for Electron app
 */

// Check if we're in Electron
// Support both browser (window) and Node.js test environment (global.window)
const getWindow = (): (Window & typeof globalThis) | undefined => {
  if (typeof window !== "undefined") {
    return window as Window & typeof globalThis;
  }
  if (typeof global !== "undefined" && (global as any).window) {
    return (global as any).window;
  }
  return undefined;
};

const windowObj = getWindow();
const isElectron = windowObj !== undefined && windowObj.electronAPI !== undefined;

if (!isElectron) {
  console.warn("IPC client used outside Electron environment");
}

// Helper to get window object at runtime (for dynamic checks)
const getWindowRuntime = () => {
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined" && (global as any).window) return (global as any).window;
  return undefined;
};

// Type-safe IPC client that mimics tRPC API structure
export const ipc = {
  concept: {
    list: (input: { includeTrash?: boolean; search?: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.concept.list(input);
    },
    getById: (input: { id: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.concept.getById(input);
    },
    create: (input: {
      title: string;
      description?: string;
      content: string;
      creator: string;
      source?: string;
      year?: string;
    }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.concept.create(input);
    },
    update: (input: {
      id: string;
      title?: string;
      description?: string;
      content?: string;
      creator?: string;
      source?: string;
      year?: string;
    }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.concept.update(input);
    },
    delete: (input: { id: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.concept.delete(input);
    },
    restore: (input: { id: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.concept.restore(input);
    },
    purgeTrash: (input: { daysOld?: number }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.concept.purgeTrash(input);
    },
    proposeLinks: (input: { conceptId: string; maxProposals?: number }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.concept.proposeLinks(input);
    },
    generateCandidates: (input: {
      text: string;
      instructions?: string;
      maxCandidates?: number;
      defaultCreator?: string;
      defaultYear?: string;
    }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.concept.generateCandidates(input);
    },
  },
  capsule: {
    list: (input?: { summary?: boolean }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.capsule.list(input);
    },
    getById: (input: { id: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.capsule.getById(input);
    },
    create: (input: {
      title: string;
      promise: string;
      cta: string;
      offerMapping?: string;
    }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.capsule.create(input);
    },
    createAnchorFromPDF: (input: {
      capsuleId: string;
      fileData: string;
      fileName?: string;
      autoRepurpose?: boolean;
    }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.capsule.createAnchorFromPDF(input);
    },
  },
  link: {
    getAll: (input?: { summary?: boolean }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.link.getAll(input);
    },
    getByConcept: (input: { conceptId: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.link.getByConcept(input);
    },
    create: (input: {
      sourceId: string;
      targetId: string;
      linkNameId: string;
      notes?: string;
    }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.link.create(input);
    },
    delete: (input: { sourceId: string; targetId: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.link.delete(input);
    },
  },
  linkName: {
    getAll: () => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.linkName.getAll();
    },
    create: (input: { forwardName: string; reverseName?: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.linkName.create(input);
    },
    update: (input: { id: string; forwardName: string; reverseName?: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.linkName.update(input);
    },
    delete: (input: { id: string; replaceWithId?: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.linkName.delete(input);
    },
    getUsage: (input: { id: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.linkName.getUsage(input);
    },
  },
  config: {
    getStyleGuide: () => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.config.getStyleGuide();
    },
    getCredo: () => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.config.getCredo();
    },
    getConstraints: () => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.config.getConstraints();
    },
    getStyleGuideRaw: () => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.config.getStyleGuideRaw();
    },
    getCredoRaw: () => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.config.getCredoRaw();
    },
    getConstraintsRaw: () => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.config.getConstraintsRaw();
    },
    updateStyleGuide: (input: { content: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.config.updateStyleGuide(input);
    },
    updateCredo: (input: { content: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.config.updateCredo(input);
    },
    updateConstraints: (input: { content: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.config.updateConstraints(input);
    },
    getStatus: () => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.config.getStatus();
    },
  },
  pdf: {
    extractText: (input: { fileData: string; fileName?: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.pdf.extractText(input);
    },
  },
  ai: {
    getSettings: () => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.ai.getSettings();
    },
    updateSettings: (input: {
      provider?: "openai" | "gemini";
      model?: string;
      temperature?: number;
    }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.ai.updateSettings(input);
    },
    getAvailableModels: () => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.ai.getAvailableModels();
    },
  },
  offer: {
    list: () => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.offer.list();
    },
    getById: (input: { id: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.offer.getById(input);
    },
    create: (input: { name: string; description?: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.offer.create(input);
    },
    update: (input: { id: string; name?: string; description?: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.offer.update(input);
    },
    delete: (input: { id: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.offer.delete(input);
    },
    assignCapsule: (input: { capsuleId: string; offerId: string | null }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.offer.assignCapsule(input);
    },
    getUnassignedCapsules: () => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.offer.getUnassignedCapsules();
    },
  },
  chat: {
    createSession: (input: { conceptId: string; title?: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.chat.createSession(input);
    },
    getSessionsByConceptId: (input: { conceptId: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.chat.getSessionsByConceptId(input);
    },
    getSessionById: (input: { id: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.chat.getSessionById(input);
    },
    deleteSession: (input: { id: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.chat.deleteSession(input);
    },
    addMessage: (input: {
      sessionId: string;
      role: "user" | "assistant";
      content: string;
      suggestions?: string;
      actions?: string;
    }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.chat.addMessage(input);
    },
    getOrCreateSession: (input: { conceptId: string; title?: string }) => {
      const win = getWindowRuntime();
      if (!win || !win.electronAPI) {
        throw new Error("IPC client not available - not running in Electron");
      }
      return win.electronAPI.chat.getOrCreateSession(input);
    },
  },
};

