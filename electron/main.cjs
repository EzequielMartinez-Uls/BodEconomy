const { app, BrowserWindow, ipcMain, dialog, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// Configurar autoUpdater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', { status: 'checking' });
    }
  });

  autoUpdater.on('update-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', { status: 'up-to-date', info });
    }
  });

  autoUpdater.on('error', (err) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:error', { message: err?.message || String(err) });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:downloaded', info);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#ffffff',
    title: 'Restaurante El Bodegón — Control ERP de Cajas',
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    // In production, load the built index.html from dist
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  // Buscar actualizaciones automáticamente tras iniciar (si está empaquetado)
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        console.error('Error comprobando actualizaciones:', err);
      });
    }, 4000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for Native Desktop Integrations
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:save-dialog', async (event, options) => {
  if (!mainWindow) return null;
  const res = await dialog.showSaveDialog(mainWindow, options);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    mainWindow.webContents.focus();
  }
  return res;
});

ipcMain.handle('app:refocus', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.blur();
    mainWindow.focus();
    mainWindow.webContents.focus();
  }
  return true;
});

// Bodegón Pass: las consultas salen desde aquí (proceso principal) y no desde la ventana,
// porque la API ya no acepta peticiones sin sesión ni desde el origen file:// de la app.
// El token de sesión vive solo en memoria y se pierde al cerrar la app.
const PASS_RUTAS_PERMITIDAS = ['/api/empleados/', '/api/horas-extra/', '/api/compensaciones-feriados/'];
const PASS_TIMEOUT_MS = 20000;
const passSesiones = new Map(); // baseUrl -> { token, expira }

function passBaseUrl(raw) {
  const url = new URL(String(raw || ''));
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('La URL de Bodegón Pass debe usar https.');
  }
  return url.origin;
}

async function passFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PASS_TIMEOUT_MS);
  try {
    const res = await net.fetch(url, { ...options, signal: controller.signal });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.name === 'AbortError' ? 'Tiempo de espera agotado' : (err?.message || 'Sin conexión') };
  } finally {
    clearTimeout(timer);
  }
}

function passSesionVigente(base) {
  const s = passSesiones.get(base);
  if (s && s.expira > Date.now()) return s;
  passSesiones.delete(base);
  return null;
}

ipcMain.handle('pass:has-session', (event, baseUrl) => {
  try { return Boolean(passSesionVigente(passBaseUrl(baseUrl))); } catch { return false; }
});

ipcMain.handle('pass:login', async (event, baseUrl, pin) => {
  let base;
  try { base = passBaseUrl(baseUrl); } catch (err) { return { ok: false, status: 0, error: err.message }; }
  const res = await passFetch(`${base}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ pin: String(pin || '') }),
  });
  if (res.ok && res.data?.token) {
    const segundos = Number(res.data.expires_in) || 12 * 3600;
    // Margen de 5 minutos para no usar un token a punto de vencer
    passSesiones.set(base, { token: res.data.token, expira: Date.now() + (segundos - 300) * 1000 });
    return { ok: true, status: res.status };
  }
  return { ok: false, status: res.status, error: res.data?.detail || res.error || 'No se pudo iniciar sesión.' };
});

ipcMain.handle('pass:logout', (event, baseUrl) => {
  try { passSesiones.delete(passBaseUrl(baseUrl)); } catch { /* URL inválida: nada que cerrar */ }
  return true;
});

ipcMain.handle('pass:get', async (event, baseUrl, ruta) => {
  let base;
  try { base = passBaseUrl(baseUrl); } catch (err) { return { ok: false, status: 0, data: null, error: err.message }; }
  if (!PASS_RUTAS_PERMITIDAS.includes(ruta)) {
    return { ok: false, status: 0, data: null, error: 'Ruta no permitida.' };
  }
  const sesion = passSesionVigente(base);
  if (!sesion) return { ok: false, status: 401, data: null, error: 'Se requiere el PIN de Bodegón Pass.' };
  const res = await passFetch(`${base}${ruta}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${sesion.token}` },
  });
  if (res.status === 401) passSesiones.delete(base);
  return res;
});

// IPC Handlers for Updates
ipcMain.handle('updater:check', async () => {
  if (app.isPackaged) {
    return await autoUpdater.checkForUpdates();
  }
  return null;
});

ipcMain.handle('updater:install', () => {
  // isSilent: false (permite que Windows muestre el cuadro de confirmación UAC para permisos de administrador en Program Files)
  // isForceRunAfter: true (vuelve a abrir la aplicación automáticamente tras terminar)
  autoUpdater.quitAndInstall(false, true);
});
