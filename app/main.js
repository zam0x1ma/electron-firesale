const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const windows = new Set();
const openFiles = new Map();

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

  newWindow.on('close', (event) => {
    if (newWindow.isDocumentEdited()) {
      event.preventDefault();

      const result = dialog.showMessageBoxSync(newWindow, {
        type: 'warning',
        title: 'Quit with Unsave Changes?',
        message: 'Your changes will be lost if you do not save.',
        buttons: [
          'Quit Anyway',
          'Cancel',
        ],
        defaultId: 0,
        cancelId: 1,
      });

      if (result === 0) newWindow.destroy();
    }
  });

  newWindow.on('closed', () => {
    windows.delete(newWindow);
    stopWatchingFile(newWindow);
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

app.on('will-finish-launching', () => {
  app.on('open-file', (event, file) => {
    const win = createWindow();
    win.once('ready-to-show', () => {
      openFile(win, file);
    });
  });
});

ipcMain.on('open-file', (event, file) => {
  if (file) {
    openFile(BrowserWindow.getFocusedWindow(), file);
  } else {
    getFileFromUser(BrowserWindow.getFocusedWindow());
  }
});

ipcMain.on('new-file', () => {
  createWindow();
});

ipcMain.on('set-title', (event, title) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow !== null) {
    focusedWindow.setTitle(title);
  }
});

ipcMain.on('set-edited', (event, isEdited) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow !== null) {
    focusedWindow.setDocumentEdited(isEdited);
  }
});

ipcMain.on('save-html', (event, content) => {
  saveHtml(BrowserWindow.getFocusedWindow(), content);
});

ipcMain.on('save-markdown', (event, filePath, content) => {
  saveMarkdown(BrowserWindow.getFocusedWindow(), filePath, content);
});

const getFileFromUser = (targetWindow) => {
  dialog.showOpenDialog(targetWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
    ],
  }).then(result => {
    if (result.filePaths.length > 0) {
      openFile(targetWindow, result.filePaths[0]);
    }
  }).catch(err => {
    console.log(err);
  });
};

const openFile = (targetWindow, file) => {
  if (targetWindow === null) return;

  const content = fs.readFileSync(file).toString();

  app.addRecentDocument(file);
  targetWindow.setRepresentedFilename(file);

  if (targetWindow.isDocumentEdited()) {
    const result = confirmOverwrite(targetWindow,
      'Opening a new file in this window will overwrite your unsaved changes. Open this file anyway?');

    if (result === 1) return;
  }

  targetWindow.webContents.send('file-opened', file, content);
};

const saveHtml = (targetWindow, content) => {
  dialog.showSaveDialog(targetWindow, {
    title: 'Save HTML',
    defaultPath: app.getPath('documents'),
    filters: [
      { name: 'HTML Files', extensions: ['html', 'htm'] },
    ],
  }).then(result => {
    if (!result.filePath) return;

    fs.writeFileSync(result.filePath, content);
  });
};

const saveMarkdown = (targetWindow, file, content) => {
  if (!file) {
    dialog.showSaveDialog(targetWindow, {
      title: 'Save Markdown',
      defaultPath: app.getPath('documents'),
      filters: [
        { name: 'Markdown Files', extensions: [ 'md', 'markdown' ]},
      ],
    }).then(result => {
      if (!result.filePath) return;

      fs.writeFileSync(result.filePath, content);
      openFile(targetWindow, result.filePath);
    });
  } else {
    fs.writeFileSync(file, content);
    openFile(targetWindow, file);
  }
};

const startWatchingFile = (targetWindow, file) => {
  stopWatchingFile(targetWindow);

  const watcher = fs.watchFile(file, (event) => {
    if (event === 'change') {
      const content = fs.readFileSync(file).toString();
      confirmOverwrite(targetWindow,
        'Another application has changed this file. Load changes?');
      targetWindow.webContents.send('file-changed', file, content);
    }
  });

  openFiles.set(targetWindow, watcher);
};

const stopWatchingFile = (targetWindow) => {
  if (openFiles.has(targetWindow)) {
    openFiles.get(targetWindow).stop();
    openFiles.delete(targetWindow);
  }
};

const confirmOverwrite = (targetWindow, message) => {
  const result = dialog.showMessageBoxSync(currentWindow, {
    type: 'warning',
    title: 'Overwrite Current Unsaved Changes?',
    message: message,
    buttons: [
      'Yes',
      'Cancel',
    ],
    defaultId: 0,
    cancelId: 1,
  });

  return result;
};
