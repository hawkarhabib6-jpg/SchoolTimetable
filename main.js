const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ---- شوێنی هەڵگرتنی داتا (لەناو فۆڵدەری بەکارهێنەری بەرنامەکە) ----
function dataFile() {
  return path.join(app.getPath('userData'), 'timetable-data.json');
}

const EMPTY = { teachers: [], subjects: [], classes: [], offdays: [], timetable: [], seq: 1 };

function loadData() {
  try {
    const raw = fs.readFileSync(dataFile(), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return JSON.parse(JSON.stringify(EMPTY));
  }
}

function saveData(data) {
  fs.writeFileSync(dataFile(), JSON.stringify(data, null, 2), 'utf8');
}

// IPC: خوێندنەوە و نووسینی داتا
ipcMain.handle('data:load', () => loadData());
ipcMain.handle('data:save', (_e, data) => { saveData(data); return true; });

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
