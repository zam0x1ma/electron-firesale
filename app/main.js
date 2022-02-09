const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow = null;
const windows = new Set();

function createWindow() {
  let x, y;

  const currentWindow = BrowserWindow.getFocusedWindow();

  if (currentWindow) {
    const [ currentWindowX, currentWindowY ] = currentWindow.getPosition();
    x = currentWindowX + 10;
    y = currentWindowY + 10;
  }

  let newWindow = new BrowserWindow({
    width: 850,
    height: 600,
    x: x,
    y: y,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  newWindow.loadFile('app/index.html');

  // newWindow.webContents.openDevTools();

  newWindow.once('ready-to-show', () => {
    newWindow.show();
  });

  newWindow.on('closed', () => {
    windows.delete(newWindow);
    newWindow = null;
  });

  windows.add(newWindow);

  return newWindow;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('open-file', (event, arg) => {
  getFileFromUser(event, 'file-opened', BrowserWindow.getFocusedWindow());
});

ipcMain.on('new-file', () => {
  createWindow();
});

const getFileFromUser = (event, replyChannel, targetWindow) => {
  dialog.showOpenDialog(targetWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
    ],
  }).then(result => {
    if (result.filePaths.length > 0) {
      const file = result.filePaths[0];
      const content = fs.readFileSync(file).toString();

      event.reply(replyChannel, file, content);
    }
  }).catch(err => {
    console.log(err);
  });
};
