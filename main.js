import { app, BrowserWindow, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.name = 'BookFlow';

function createWindow() {
  const iconPath = path.join(__dirname, 'generated-icon.png');
  let icon;

  try {
    const buffer = fs.readFileSync(iconPath);
    icon = nativeImage.createFromBuffer(buffer);
    console.log(`[Electron] Loaded icon from buffer (${buffer.length} bytes), status: ${!icon.isEmpty()}`);
  } catch (err) {
    console.error(`[Electron] Failed to read icon from ${iconPath}:`, err);
    icon = nativeImage.createEmpty();
  }

  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: icon
  });

  if (process.platform === 'linux') {
    mainWindow.setIcon(icon);
  }

  // Default to 5000 for development, 3000 for production
  const isDev = process.env.NODE_ENV === 'development';
  const defaultPort = isDev ? 5000 : 3000;
  const port = process.env.PORT || defaultPort;
  mainWindow.loadURL(`http://localhost:${port}`);

  // Open the DevTools in dev mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  app.quit();
});
