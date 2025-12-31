// Central registration point for all IPC handlers
import { registerConceptHandlers } from "./concept-handlers.js";
import { registerLinkHandlers } from "./link-handlers.js";
import { registerLinkNameHandlers } from "./linkName-handlers.js";
import { registerCapsuleHandlers } from "./capsule-handlers.js";
import { registerConfigHandlers } from "./config-handlers.js";
import { registerPdfHandlers } from "./pdf-handlers.js";
import { registerAiHandlers } from "./ai-handlers.js";
import { registerEnrichmentHandlers } from "./enrichment-handlers.js";
import { registerOfferHandlers } from "./offer-handlers.js";
import { registerChatHandlers } from "./chat-handlers.js";

export function registerAllHandlers() {
  registerConceptHandlers();
  registerLinkHandlers();
  registerLinkNameHandlers();
  registerCapsuleHandlers();
  registerConfigHandlers();
  registerPdfHandlers();
  registerAiHandlers();
  registerEnrichmentHandlers();
  registerOfferHandlers();
  registerChatHandlers();
  // TODO: Add dataQuality handlers as needed
}

