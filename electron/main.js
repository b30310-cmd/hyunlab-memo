const { app, BrowserWindow, ipcMain, Menu, globalShortcut, screen, Notification, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

// The renderer is the existing HYUNLAB Memo web build (unmodified) — it already
// checks for `window.electronAPI` (see preload.js) and switches its popup /
// notification / auto-start / quick-capture behavior on when it finds it.
const APP_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'app')
  : path.join(__dirname, '..', 'app')
const INDEX_HTML = path.join(APP_DIR, 'index.html')

const STATE_PATH = path.join(app.getPath('userData'), 'window-state.json')
const DEFAULT_BOUNDS = { width: 1180, height: 760 }
const MIN_SIZE = { width: 720, height: 480 }
const POPUP_MIN_SIZE = { width: 180, height: 160 }
const QUICK_CAPTURE_ACCELERATOR = 'CommandOrControl+Shift+N'

let mainWindow = null
const popupWindows = new Map() // memoId -> BrowserWindow

// ---------------------------------------------------------------------------
// Main window position/size memory
// ---------------------------------------------------------------------------

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'))
  } catch {
    return null
  }
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const isMaximized = mainWindow.isMaximized()
  const bounds = isMaximized ? mainWindow.getNormalBounds() : mainWindow.getBounds()
  try {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true })
    fs.writeFileSync(STATE_PATH, JSON.stringify({ ...bounds, isMaximized }))
  } catch {
    // Non-fatal — worst case the window opens at the default position next time.
  }
}

// A saved position from a monitor that's no longer connected would otherwise
// place the window off-screen and out of reach.
function isOnScreen(bounds) {
  return screen.getAllDisplays().some((display) => {
    const a = display.workArea
    return (
      bounds.x < a.x + a.width &&
      bounds.x + bounds.width > a.x &&
      bounds.y < a.y + a.height &&
      bounds.y + bounds.height > a.y
    )
  })
}

function createMainWindow() {
  const saved = loadWindowState()
  const bounds = saved && isOnScreen(saved) ? saved : DEFAULT_BOUNDS

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    resizable: true,
    show: false,
    title: 'HYUNLAB Memo',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (saved?.isMaximized) mainWindow.maximize()

  mainWindow.loadFile(INDEX_HTML)
  mainWindow.once('ready-to-show', () => mainWindow.show())

  let saveTimer = null
  const scheduleSave = () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(saveWindowState, 400)
  }
  mainWindow.on('resize', scheduleSave)
  mainWindow.on('move', scheduleSave)
  mainWindow.on('close', saveWindowState)
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Links the page opens with target=_blank should go to the system browser,
  // not spawn an unmanaged Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  } else {
    createMainWindow()
  }
}

// ---------------------------------------------------------------------------
// Popup ("sticky note") windows — one per memo, opened via window.electronAPI.openPopup
// ---------------------------------------------------------------------------

function createOrFocusPopup(memoId, popupState = {}) {
  const existing = popupWindows.get(memoId)
  if (existing && !existing.isDestroyed()) {
    existing.show()
    existing.focus()
    return existing
  }

  const width = Math.round(popupState.width) || 280
  const height = Math.round(popupState.height) || 320
  const x = Number.isFinite(popupState.x) ? Math.round(popupState.x) : undefined
  const y = Number.isFinite(popupState.y) ? Math.round(popupState.y) : undefined
  const opacity =
    typeof popupState.opacity === 'number' ? Math.min(1, Math.max(0, popupState.opacity)) : 1

  const popup = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: POPUP_MIN_SIZE.width,
    minHeight: POPUP_MIN_SIZE.height,
    frame: false,
    resizable: true,
    alwaysOnTop: !!popupState.alwaysOnTop,
    opacity,
    show: false,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  popup.loadFile(INDEX_HTML, { hash: `/popup/${memoId}` })
  popup.once('ready-to-show', () => popup.show())

  const reportBounds = () => {
    if (popup.isDestroyed()) return
    popup.webContents.send('popup:bounds-changed', popup.getBounds())
  }
  popup.on('moved', reportBounds)
  popup.on('resized', reportBounds)
  popup.on('closed', () => popupWindows.delete(memoId))

  popupWindows.set(memoId, popup)
  return popup
}

// ---------------------------------------------------------------------------
// Global shortcut — Ctrl+Shift+N quick capture (matches the hint shown in the
// app's own Settings panel)
// ---------------------------------------------------------------------------

function registerQuickCapture() {
  globalShortcut.register(QUICK_CAPTURE_ACCELERATOR, () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const point = screen.getCursorScreenPoint()
    mainWindow.webContents.send('quick-capture', { x: point.x - 140, y: point.y - 40 })
  })
}

// ---------------------------------------------------------------------------
// IPC bridge — mirrors window.electronAPI exposed by preload.js
// ---------------------------------------------------------------------------

ipcMain.on('popup:open', (event, memoId, popupState) => {
  createOrFocusPopup(memoId, popupState || {})
})

ipcMain.on('notify', (event, title, body) => {
  if (!Notification.isSupported()) return
  new Notification({
    title: title || 'HYUNLAB Memo',
    body: body || '',
    icon: path.join(__dirname, 'build', 'icon.ico'),
  }).show()
})

ipcMain.on('auto-start:set', (event, enabled) => {
  // Only meaningful for an installed/portable build with a stable exe path.
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: !!enabled })
})

ipcMain.on('window:set-always-on-top', (event, flag) => {
  BrowserWindow.fromWebContents(event.sender)?.setAlwaysOnTop(!!flag)
})

ipcMain.on('window:set-opacity', (event, value) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) win.setOpacity(Math.min(1, Math.max(0, Number(value))) || 1)
})

ipcMain.on('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close()
})

ipcMain.on('window:open-main', () => {
  showMainWindow()
})

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

// Avoid two copies of the app fighting over the same global shortcut / popup windows.
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', showMainWindow)

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    createMainWindow()
    registerQuickCapture()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })

  app.on('window-all-closed', () => {
    app.quit()
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
}
