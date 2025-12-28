/**
 * Mock for electron module in tests
 */

import { jest } from "@jest/globals";

// Store registered handlers so listeners() can retrieve them
const registeredHandlers = new Map<string, any[]>();

export const ipcMain = {
  handle: jest.fn((channel: string, handler: any) => {
    if (!registeredHandlers.has(channel)) {
      registeredHandlers.set(channel, []);
    }
    registeredHandlers.get(channel)!.push(handler);
  }),
  listeners: jest.fn((channel: string) => {
    return registeredHandlers.get(channel) || [];
  }),
  removeHandler: jest.fn((channel: string) => {
    registeredHandlers.delete(channel);
  }),
};

export const app = {
  getPath: jest.fn((name: string) => {
    if (name === "userData") {
      return "/tmp/test-user-data";
    }
    return "/tmp";
  }),
  on: jest.fn(),
  quit: jest.fn(),
  whenReady: jest.fn(() => Promise.resolve()),
};

export const BrowserWindow = jest.fn().mockImplementation(() => ({
  loadURL: jest.fn(),
  loadFile: jest.fn(),
  webContents: {
    on: jest.fn(),
  },
  on: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  close: jest.fn(),
}));

