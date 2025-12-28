import { app, BrowserWindow, ipcMain } from "electron";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import { initDb, closeDb } from "./db.js";

// #region agent log
fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.ts:8',message:'Electron main.ts loaded',data:{__filename:import.meta.url,processCwd:process.cwd()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
// #endregion

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// #region agent log
const packageJsonPath = resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.ts:16',message:'Package.json read in main.ts',data:{packageJsonMain:packageJson.main,packageJsonPath,__dirname,resolvedMain:resolve(process.cwd(),packageJson.main),fileExists:existsSync(resolve(process.cwd(),packageJson.main))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
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

  // Load the app
  if (process.env.NODE_ENV === "development") {
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

