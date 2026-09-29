const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:version'),
  showSaveDialog: (options) => ipcRenderer.invoke('app:save-dialog', options),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  restartAndInstall: () => ipcRenderer.invoke('updater:install'),
  onUpdateAvailable: (callback) => {
    const sub = (_event, data) => callback(data);
    ipcRenderer.on('updater:available', sub);
    return () => ipcRenderer.removeListener('updater:available', sub);
  },
  onUpdateProgress: (callback) => {
    const sub = (_event, data) => callback(data);
    ipcRenderer.on('updater:progress', sub);
    return () => ipcRenderer.removeListener('updater:progress', sub);
  },
  onUpdateDownloaded: (callback) => {
    const sub = (_event, data) => callback(data);
    ipcRenderer.on('updater:downloaded', sub);
    return () => ipcRenderer.removeListener('updater:downloaded', sub);
  },
  onUpdateStatus: (callback) => {
    const sub = (_event, data) => callback(data);
    ipcRenderer.on('updater:status', sub);
    return () => ipcRenderer.removeListener('updater:status', sub);
  },
  isDesktop: true,
});
