const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('audioMixer', {
  listSessions: () => ipcRenderer.invoke('audio-mixer:list-sessions'),
  startCapture: (pid) => ipcRenderer.send('audio-mixer:start', pid),
  stopCapture: (pid) => ipcRenderer.send('audio-mixer:stop', pid),
  stopAll: () => ipcRenderer.send('audio-mixer:stop-all'),
  onChunk: (cb) => {
    const listener = (event, data) => cb(data);
    ipcRenderer.on('audio-mixer:chunk', listener);
    return () => ipcRenderer.removeListener('audio-mixer:chunk', listener);
  },
  onEnded: (cb) => {
    const listener = (event, data) => cb(data);
    ipcRenderer.on('audio-mixer:ended', listener);
    return () => ipcRenderer.removeListener('audio-mixer:ended', listener);
  },
});

contextBridge.exposeInMainWorld('appUpdater', {
  onDownloaded: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('update:downloaded', listener);
    return () => ipcRenderer.removeListener('update:downloaded', listener);
  },
  install: () => ipcRenderer.send('update:install'),
  checkNow: () => ipcRenderer.invoke('update:check'),
});

contextBridge.exposeInMainWorld('appInfo', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
});

contextBridge.exposeInMainWorld('appIcon', {
  set: (mode) => ipcRenderer.send('app-icon:set', mode),
});
