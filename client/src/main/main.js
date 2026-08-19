const { app, BrowserWindow, session, desktopCapturer, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    backgroundColor: '#111318',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Alguns drivers de vídeo no Windows deixam elementos com border-radius
    // sem repintar o texto no primeiro paint. Um nudge de resize força o
    // Chromium a repintar tudo.
    const [w, h] = mainWindow.getSize();
    mainWindow.setSize(w + 1, h);
    setImmediate(() => mainWindow.setSize(w, h));
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2) console.error(`[renderer] ${message} (${sourceId}:${line})`);
  });
}

function pickSource() {
  return new Promise((resolve) => {
    const picker = new BrowserWindow({
      width: 640,
      height: 440,
      parent: mainWindow,
      modal: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      backgroundColor: '#111318',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'picker-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    let settled = false;
    const finish = (source) => {
      if (settled) return;
      settled = true;
      ipcMain.removeHandler('picker:get-sources');
      ipcMain.removeListener('picker:choose', onChoose);
      ipcMain.removeListener('picker:cancel', onCancel);
      if (!picker.isDestroyed()) picker.destroy();
      resolve(source);
    };

    ipcMain.handle('picker:get-sources', async () => {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 300, height: 200 },
      });
      return sources.map((s) => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }));
    });

    const onChoose = async (event, sourceId) => {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      finish(sources.find((s) => s.id === sourceId) || null);
    };
    const onCancel = () => finish(null);

    ipcMain.on('picker:choose', onChoose);
    ipcMain.on('picker:cancel', onCancel);
    picker.on('closed', () => finish(null));

    picker.once('ready-to-show', () => picker.show());
    picker.loadFile(path.join(__dirname, '..', 'renderer', 'picker.html'));
  });
}

app.whenReady().then(() => {
  // useSystemPicker usa o seletor nativo do Windows/macOS quando disponível
  // (estilo Discord/Teams); nas plataformas sem esse suporte, o handler
  // abaixo mostra nosso próprio seletor de tela/janela.
  session.defaultSession.setDisplayMediaRequestHandler(
    async (request, callback) => {
      const source = await pickSource();
      if (source) callback({ video: source, audio: 'loopback' });
      else callback({});
    },
    { useSystemPicker: true }
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
