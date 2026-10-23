/* ============================================================
   Windows staff app — the Electron shell.

   Loads the desktop build (dist-desktop/) from inside the
   installed program, so it opens instantly and keeps working
   on a flaky connection exactly like the Android app.

     npm run dev:desktop     try it on this computer
     npm run exe             build the Windows installer
   ============================================================ */
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

// One copy at a time: a second double-click just brings this one forward.
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#faf7f2',
    title: 'Asha Deep Staff',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => { win.maximize(); win.show(); });

  const devUrl = process.env.ELECTRON_DEV_URL;
  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, '..', 'dist-desktop', 'index.html'));

  // The receipt print window opens about:blank and writes the receipt into
  // it; allow that. Everything else (WhatsApp, phone links, websites) goes to
  // the computer's own browser instead of a bare window inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank' || url === '') {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 900, height: 1000, autoHideMenuBar: true } };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Never navigate the main window away from the app itself.
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !(devUrl && url.startsWith(devUrl))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});

app.whenReady().then(() => {
  // A small menu: zoom for older eyes, reload when the network hiccups.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'View', submenu: [
      { role: 'reload' }, { role: 'forceReload' }, { type: 'separator' },
      { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' },
      { role: 'togglefullscreen' },
    ] },
  ]));
  createWindow();
});

app.on('window-all-closed', () => app.quit());
