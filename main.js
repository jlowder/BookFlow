import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';
import waitOn from 'wait-on';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
    icon: path.join(__dirname, 'generated-icon.png'),
  });

  // Use the port defined in server/index.ts
  const port = process.env.NODE_ENV === 'development' ? 5000 : 3000;

  // Use 127.0.0.1 instead of localhost to avoid IPv6 resolution delays
  const url = `http://127.0.0.1:${port}`;

  waitOn({
    resources: [url],
    timeout: 30000,
  }).then(() => {
    if (mainWindow) {
      mainWindow.loadURL(url);
    }
  }).catch((err) => {
    console.error('Failed to wait for server:', err);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  const serverPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, 'server/index.ts')
    : path.join(__dirname, 'dist/index.js');

  // When running in production (packaged), use app.getPath('userData') for the database
  const userDataPath = app.getPath('userData');

  const options = {
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
      IS_ELECTRON: 'true',
      ELECTRON_USER_DATA_PATH: userDataPath
    },
    stdio: 'inherit',
  };

  if (process.env.NODE_ENV === 'development') {
    serverProcess = fork(serverPath, [], {
      ...options,
      execArgv: ['--loader', 'tsx'],
    });
  } else {
    serverProcess = fork(serverPath, [], options);
  }
}

app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

app.on('ready', () => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
