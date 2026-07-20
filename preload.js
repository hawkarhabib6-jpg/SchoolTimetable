const { contextBridge, ipcRenderer } = require('electron');

// پردێکی سەلامەت لەنێوان بەرنامەکە و سیستەمی فایلەکان
contextBridge.exposeInMainWorld('store', {
  load: () => ipcRenderer.invoke('data:load'),
  save: (data) => ipcRenderer.invoke('data:save', data)
});
