import { contextBridge, ipcRenderer } from 'electron';

// Exposed APIs for renderer process
const api = {
  // App information
  app: {
    getVersion: () => ipcRenderer.invoke('app-getVersion'),
  },

  // Window controls
  window: {
    close: () => ipcRenderer.send('window-close'),
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    isMaximized: () => ipcRenderer.invoke('window-isMaximized'),
    setAlwaysOnTop: (alwaysOnTop) => ipcRenderer.send('window-setAlwaysOnTop', alwaysOnTop),
  },

  // Theme management
  theme: {
    get: () => ipcRenderer.invoke('theme-get'),
    set: (useDark) => ipcRenderer.send('theme-set', useDark),
  },

  // File operations
  file: {
    open: (options) => ipcRenderer.invoke('show-open-dialog', options),
    save: (options) => ipcRenderer.invoke('show-save-dialog', options),
  },

  // System events
  system: {
    onNetworkChange: (callback) => {
      const subscription = ipcRenderer.on('network-change', (_event, isOnline) => {
        callback(isOnline);
      });
      return () => subscription.unsubscribe();
    },
  },
};

// Expose to renderer via context bridge
contextBridge.exposeInMainWorld('bookflow', api);
