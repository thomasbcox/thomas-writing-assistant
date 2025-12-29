import { app, BrowserWindow, ipcMain } from "electron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { initDb, closeDb } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
app.whenReady().then(() => {
  // Initialize database first
  initDb();
  
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

