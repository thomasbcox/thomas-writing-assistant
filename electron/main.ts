import { app, BrowserWindow, ipcMain } from "electron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { appendFileSync } from "fs";
import { config as dotenvConfig } from "dotenv";
import { initDb, closeDb } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
// This must happen before any code that uses process.env
// __dirname is dist-electron/electron/, so we need to go up 2 levels to reach project root
dotenvConfig({ path: join(__dirname, "../../.env") });

// #region agent log
appendFileSync('/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log', JSON.stringify({location:'main.ts:15',message:'dotenv loaded',data:{openaiSet:process.env.OPENAI_API_KEY?'SET':'UNSET',googleSet:process.env.GOOGLE_API_KEY?'SET':'UNSET',envPath:join(__dirname, "../../.env")},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'}) + '\n');
// #endregion

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: join(__dirname, "./preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Note: You may see harmless DevTools protocol warnings in the terminal like:
  // "Request Autofill.enable failed" or "Request Autofill.setAddresses failed"
  // These are logged directly to stderr by Electron's internal DevTools protocol client
  // and cannot be suppressed via console-message handlers. They occur because Electron's
  // DevTools tries to enable browser autofill features that don't exist in Electron.
  // These warnings are completely harmless and can be safely ignored.
  
  // Attempt to suppress renderer console messages (though Autofill errors come from Electron internals)
  mainWindow.webContents.on("console-message" as any, (event: any, level: number, message: string) => {
    // Filter out any renderer console messages about Autofill (if any)
    if (
      message?.includes("Autofill.enable") ||
      message?.includes("Autofill.setAddresses") ||
      message?.includes("Request Autofill") ||
      message?.includes("wasn't found")
    ) {
      // Suppress these harmless warnings
      return;
    }
  });

  // Load the app
  // Check if we're in development mode (either via NODE_ENV or if Vite dev server is available)
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(join(__dirname, "../dist/index.html"));
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize database first
  initDb();
  
  // Initialize vector index in background (non-blocking)
  import("../src/server/services/vectorIndex.js").then(({ initializeVectorIndex }) => {
    initializeVectorIndex().catch((error) => {
      console.error("Failed to initialize vector index:", error);
    });
  });
  
  // Then create window
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle app termination - close database connection
app.on("before-quit", () => {
  closeDb();
});

// Register IPC handlers
import { registerAllHandlers } from "./ipc-handlers/index.js";

// Register all IPC handlers
// Only register in actual Electron app, not during tests
// Tests will register handlers explicitly in their setup
if (typeof process !== "undefined" && process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID) {
  registerAllHandlers();
}

// Placeholder ping handler
ipcMain.handle("ping", () => "pong");

