import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const iconPath = path.join(__dirname, 'generated-icon.png');
  console.log(`[Electron] Loading icon from: ${iconPath}`);

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: iconPath
  });

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
