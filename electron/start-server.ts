import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Start the backend server for Electron
 */
export function startServer() {
  const distPath = path.join(__dirname, '..', '..', 'dist');
  const serverPath = path.join(distPath, 'server', 'index.js');

  console.log('Starting backend server from:', serverPath);

  const serverProcess = spawn('node', [serverPath], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: '3000',
    },
    stdio: 'inherit',
    windowsHide: true,
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });

  serverProcess.on('message', (message) => {
    console.log('Server message:', message);
  });

  // Log server startup
  setTimeout(() => {
    console.log('Backend server started successfully');
  }, 1000);

  return serverProcess;
}

export default startServer;