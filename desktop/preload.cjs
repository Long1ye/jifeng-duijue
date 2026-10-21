const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('jifeng', Object.freeze({
  info: () => ipcRenderer.invoke('lan:info'),
  host: () => ipcRenderer.invoke('lan:host'),
  stop: () => ipcRenderer.invoke('lan:stop'),
  solo: () => ipcRenderer.invoke('lan:solo'),
  join: (address, code) => ipcRenderer.invoke('lan:join', address, code),
  copy: address => ipcRenderer.invoke('lan:copy', address),
}));
