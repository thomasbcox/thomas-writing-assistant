// Central registration point for all IPC handlers
import { registerConceptHandlers } from "./concept-handlers.js";
import { registerLinkHandlers } from "./link-handlers.js";
import { registerLinkNameHandlers } from "./linkName-handlers.js";
import { registerCapsuleHandlers } from "./capsule-handlers.js";
import { registerConfigHandlers } from "./config-handlers.js";
import { registerPdfHandlers } from "./pdf-handlers.js";
import { registerAiHandlers } from "./ai-handlers.js";

export function registerAllHandlers() {
  registerConceptHandlers();
  registerLinkHandlers();
  registerLinkNameHandlers();
  registerCapsuleHandlers();
  registerConfigHandlers();
  registerPdfHandlers();
  registerAiHandlers();
  // TODO: Add enrichment, dataQuality handlers as needed
}

