// Main entry point for Electron app
// Can be run with: npx tsx electron/electron.ts

import { app } from 'electron';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Setup require for Node.js modules in ESM context
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import the main process
import('./dist-electron/main/index.js').then(() => {
  console.log('Electron app loaded');
}).catch((err) => {
  console.error('Failed to load Electron app:', err);
  app.quit();
});

// Handle any uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});
