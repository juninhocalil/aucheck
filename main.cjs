const { app, BrowserWindow, shell, protocol } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

// Servimos a pasta /web por um protocolo próprio (app://) para que o
// fetch() do áudio funcione dentro do .exe (file:// bloqueia isso).
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
]);

const WEB_DIR = path.join(__dirname, 'web');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4'
};

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 850,
    minWidth: 360,
    minHeight: 600,
    title: 'AcuCheck Audio Diagnostics',
    backgroundColor: '#0b1120',
    icon: path.join(WEB_DIR, 'icons', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  win.loadURL('app://acucheck/index.html');
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  protocol.handle('app', async (request) => {
    let pathname = decodeURIComponent(new URL(request.url).pathname);
    if (pathname === '/') pathname = '/index.html';
    const filePath = path.normalize(path.join(WEB_DIR, pathname));
    if (!filePath.startsWith(WEB_DIR + path.sep)) return new Response('Forbidden', { status: 403 });
    try {
      const data = await fs.readFile(filePath);
      const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      return new Response(data, { headers: { 'content-type': type } });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
