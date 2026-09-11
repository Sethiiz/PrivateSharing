const { app, BrowserWindow, session, desktopCapturer, ipcMain } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const { autoUpdater } = require('electron-updater');
const audioMixer = require(path.join(__dirname, '..', '..', 'native', 'audio_mixer'));

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

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
      height: 540,
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
      return sources.map((s) => ({
        id: s.id,
        name: s.name,
        thumbnail: s.thumbnail.toDataURL(),
        type: s.id.startsWith('screen:') ? 'screen' : 'window',
      }));
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

// ---------- mixer de áudio por app ----------

function resolveProcessInfo(pids) {
  return new Promise((resolve) => {
    if (pids.length === 0) return resolve([]);
    const script = `Get-Process -Id ${pids.join(',')} -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Path | ConvertTo-Json -Compress`;
    execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, timeout: 5000 },
      (err, stdout) => {
        if (err || !stdout || !stdout.trim()) return resolve([]);
        try {
          const parsed = JSON.parse(stdout);
          resolve(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          resolve([]);
        }
      }
    );
  });
}

async function listAudioSessions() {
  const pids = audioMixer.listSessions();
  const infos = await resolveProcessInfo(pids);
  const results = [];
  for (const info of infos) {
    if (!info || !info.Id) continue;
    // Nunca inclui o próprio app (main, renderer, GPU, utility rodam do mesmo
    // executável) — evita microfonia e não dá nem a opção de desmutar.
    if (info.Path && path.normalize(info.Path).toLowerCase() === path.normalize(process.execPath).toLowerCase()) {
      continue;
    }
    let icon = null;
    if (info.Path) {
      try {
        const img = await app.getFileIcon(info.Path, { size: 'normal' });
        icon = img.toDataURL();
      } catch {
        icon = null;
      }
    }
    results.push({ pid: info.Id, name: info.ProcessName || `pid ${info.Id}`, icon });
  }
  return results;
}

ipcMain.handle('audio-mixer:list-sessions', () => listAudioSessions());

ipcMain.on('audio-mixer:start', (event, pid) => {
  audioMixer.startCapture(pid, (samples) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('audio-mixer:chunk', { pid, samples });
    }
  });
});

ipcMain.on('audio-mixer:stop', (event, pid) => {
  audioMixer.stopCapture(pid);
});

ipcMain.on('audio-mixer:stop-all', () => {
  audioMixer.stopAll();
});

// ---------- atualização automática ----------

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;

autoUpdater.on('update-downloaded', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update:downloaded');
});
autoUpdater.on('error', (err) => console.error('[autoUpdater]', err.message));

ipcMain.on('update:install', () => autoUpdater.quitAndInstall());

ipcMain.handle('app:get-version', () => app.getVersion());

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

  autoUpdater.checkForUpdates().catch((err) => console.error('[autoUpdater]', err.message));
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => console.error('[autoUpdater]', err.message));
  }, UPDATE_CHECK_INTERVAL_MS);
});

app.on('window-all-closed', () => {
  audioMixer.stopAll();
  if (process.platform !== 'darwin') app.quit();
});
