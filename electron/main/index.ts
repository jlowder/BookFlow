import { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme } from 'electron';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Setup require for Node.js modules in ESM context
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// State
let mainWindow: BrowserWindow | null = null;
let serverProcess: any = null;
const SERVER_PORT = 3000;

/**
 * Start the backend server
 */
function startServer() {
  const serverPath = path.join(__dirname, '..', '..', 'dist', 'server', 'index.js');

  serverProcess = spawn('node', [serverPath], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
    stdio: 'inherit',
    windowsHide: true,
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });

  console.log('Server started on port', SERVER_PORT);

  // Wait for server to be ready
  const checkServer = setInterval(() => {
    const { exec } = require('node:child_process');
    exec(`curl -s http://localhost:${SERVER_PORT} > /dev/null 2>&1`, (error) => {
      if (!error) {
        clearInterval(checkServer);
        console.log('Server is ready');
        createWindow();
      }
    });
  }, 1000);

  // Timeout after 30 seconds
  setTimeout(() => {
    clearInterval(checkServer);
    console.warn('Server failed to start within 30 seconds');
    createWindow();
  }, 30000);
}

/**
 * Create the main browser window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#0f172a',
    show: false,
    titleBarStyle: 'hidden',
    title: 'BookFlow',
  });

  // Load the app
  const startUrl = process.env.ELECTRON_START_URL || `http://localhost:${SERVER_PORT}`;

  if (process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadURL(startUrl);
  }

  // Show window when ready
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow navigation within the app
    if (url.startsWith(startUrl)) {
      return { action: 'allow' };
    }

    // Open external URLs in default browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Window lifecycle events
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('Window created');
}

/**
 * Create IPC handlers
 */
function setupIpcHandlers() {
  // App version
  ipcMain.handle('app-getVersion', () => app.getVersion());

  // Window controls
  ipcMain.on('window-close', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.on('window-minimize', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      const isMaximized = mainWindow.isMaximized();
      if (isMaximized) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window-isMaximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  ipcMain.on('window-setAlwaysOnTop', (event, alwaysOnTop) => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(alwaysOnTop);
    }
  });

  // Theme management
  ipcMain.handle('theme-get', () => nativeTheme.shouldUseDarkColors);
  ipcMain.on('theme-set', (event, useDark) => {
    nativeTheme.themeSource = useDark ? 'dark' : 'light';
  });

  // Show file dialog
  ipcMain.handle('show-open-dialog', async (event, options) => {
    if (mainWindow) {
      const result = await dialog.showOpenDialog(mainWindow, options);
      return result;
    }
    return { canceled: true, filePaths: [] };
  });

  // Show save dialog
  ipcMain.handle('show-save-dialog', async (event, options) => {
    if (mainWindow) {
      const result = await dialog.showSaveDialog(mainWindow, options);
      return result;
    }
    return { canceled: true, filePath: '' };
  });

  // Show message box
  ipcMain.handle('show-message-box', async (event, options) => {
    if (mainWindow) {
      const result = await dialog.showMessageBox(mainWindow, options);
      return result;
    }
    return { response: 0, checkboxChecked: false };
  });

  // Show error dialog
  ipcMain.handle('show-error-dialog', async (event, message) => {
    if (mainWindow) {
      const result = await dialog.showErrorBox('Error', message);
      return result;
    }
    return null;
  });
}

/**
 * App lifecycle
 */
app.on('ready', () => {
  console.log('Electron app ready');
  setupIpcHandlers();
  startServer();
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    // Quit the app on non-macOS platforms
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', () => {
  // Re-create window on macOS when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('quit', () => {
  console.log('App quitting');
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Handle any unexpected errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});