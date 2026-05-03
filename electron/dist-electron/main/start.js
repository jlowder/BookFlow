// Simple startup script for Electron
// This file serves as the entry point for Electron to start the app

import { app } from 'electron';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Setup require for Node.js modules in ESM context
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import the main process
import('./index.js').catch((err) => {
  console.error('Failed to load main process:', err);
  app.quit();
});
