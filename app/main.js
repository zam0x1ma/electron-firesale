const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 850,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('app/index.html');

  // mainWindow.webContents.openDevTools();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
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
  getFileFromUser(event, 'file-opened');
});

const getFileFromUser = (event, replayChannel) => {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
    ],
  }).then(result => {
    if (result.filePaths.length > 0) {
      const file = result.filePaths[0];
      const content = fs.readFileSync(file).toString();

      event.reply(replayChannel, file, content);
    }
  }).catch(err => {
    console.log(err);
  });
};
