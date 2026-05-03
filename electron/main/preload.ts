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
    setAlwaysOnTop: (alwaysOnTop: boolean) => ipcRenderer.send('window-setAlwaysOnTop', alwaysOnTop),
  },

  // Theme management
  theme: {
    get: () => ipcRenderer.invoke('theme-get'),
    set: (useDark: boolean) => ipcRenderer.send('theme-set', useDark),
  },

  // File operations
  file: {
    open: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
    save: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  },

  // System events
  system: {
    onNetworkChange: (callback: (isOnline: boolean) => void) => {
      const subscription = ipcRenderer.on('network-change', (_event, isOnline) => {
        callback(isOnline);
      });
      return () => subscription.unsubscribe();
    },
  },

  // Notifications
  notify: (title: string, options?: any) => {
    new Notification(title, options);
  },
};

// Expose to renderer via context bridge
contextBridge.exposeInMainWorld('bookflow', api);

// Type definition for TypeScript support
declare global {
  interface Window {
    bookflow: typeof api;
    Notification: {
      new (title: string, options?: any): Notification;
      permission: string;
      requestPermission: () => Promise<string>;
    };
  }
}