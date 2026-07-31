// ============================================================
// Electron 메인 프로세스
//  - 앱 창을 생성하고, 팝업(스티커) 창, 알림, 트레이, 자동시작을 담당합니다.
//  - 렌더러(React)와는 preload.ts를 통해 안전하게 통신합니다(IPC).
// ============================================================

import {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  screen,
} from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 빌드 결과물 경로
//  - dist-electron/main.js 기준으로 상위가 프로젝트 루트
process.env.APP_ROOT = path.join(__dirname, '..')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
const PUBLIC_DIR = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
// 열려 있는 팝업 창들 (memoId → 창)
const popupWindows = new Map<string, BrowserWindow>()

const preload = path.join(__dirname, 'preload.cjs')

/** 렌더러의 특정 라우트(해시)를 로드하는 헬퍼 */
function loadRoute(win: BrowserWindow, hash = '') {
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL + (hash ? '#' + hash : ''))
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'), hash ? { hash } : undefined)
  }
}

/** 메인 창 생성 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 720,
    minHeight: 480,
    title: 'HYUNLAB Memo',
    icon: path.join(PUBLIC_DIR, 'icon.ico'),
    backgroundColor: '#ffffff',
    // 기본 메뉴바(File/Edit/View...)를 숨겨 깔끔한 앱처럼 보이게 합니다.
    autoHideMenuBar: true,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  loadRoute(mainWindow)

  // 개발 중에는 개발자도구 자동 오픈
  if (VITE_DEV_SERVER_URL) mainWindow.webContents.openDevTools({ mode: 'detach' })

  // X 버튼을 눌러도 완전히 종료하지 않고 트레이로 숨깁니다.
  // (알림을 확인하는 반복 작업은 이 창의 렌더러에서 돌아가므로,
  //  창을 아예 없애버리면 메인 창을 닫아 둔 사이에는 알림이 울리지 않게 됩니다.
  //  완전 종료는 트레이 메뉴의 '종료'로만 합니다.)
  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow?.hide()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 알림 때문에 깜박이던 작업표시줄 아이콘은 창에 포커스가 오면 멈춥니다.
  mainWindow.on('focus', () => {
    mainWindow?.flashFrame(false)
  })
}

/** 팝업(스티커) 창 하나를 만드는 공통 로직. route만 다르게 넘겨서 재사용합니다. */
function createFloatingWindow(id: string, route: string, state: PopupInitState) {
  // 이미 열려 있으면 앞으로 가져오기
  const existing = popupWindows.get(id)
  if (existing && !existing.isDestroyed()) {
    existing.focus()
    return
  }

  const win = new BrowserWindow({
    width: state.width || 320,
    height: state.height || 340,
    x: state.x,
    y: state.y,
    frame: false, // 프레임 없는 스티커 스타일
    transparent: false,
    alwaysOnTop: state.alwaysOnTop ?? true,
    skipTaskbar: true,
    minWidth: 220,
    minHeight: 180,
    icon: path.join(PUBLIC_DIR, 'icon.ico'),
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (state.opacity) win.setOpacity(state.opacity)
  loadRoute(win, route)

  // 창을 옮기거나 크기를 바꾸면 렌더러에 알려 메모에 위치를 저장하게 합니다.
  // (Windows 스티커 메모처럼 "메모 위치 기억")
  const sendBounds = () => {
    if (win.isDestroyed()) return
    const b = win.getBounds()
    win.webContents.send('popup:bounds-changed', b)
  }
  win.on('moved', sendBounds)
  win.on('resized', sendBounds)

  popupWindows.set(id, win)
  win.on('closed', () => popupWindows.delete(id))
}

/** 팝업(스티커) 창 생성 — 이미 저장된 메모용 */
function createPopupWindow(memoId: string, state: PopupInitState) {
  createFloatingWindow(memoId, `/popup/${memoId}`, state)
}

/** 스크래치(임시) 팝업 창 생성 — 아직 저장 전인 '새 메모' 초안용 */
function createScratchPopupWindow(draftId: string, state: PopupInitState) {
  createFloatingWindow(draftId, `/scratch-popup/${draftId}`, state)
}

/**
 * 5단계: 빠른 캡처
 *  Ctrl + Shift + N 을 누르면 어느 프로그램을 쓰고 있든
 *  마우스 근처에 빈 팝업 메모가 즉시 뜹니다.
 *
 *  ※ 전역 단축키는 Windows 설치 버전에서만 동작합니다(웹 불가).
 */
function registerQuickCapture() {
  const ok = globalShortcut.register('CommandOrControl+Shift+N', () => {
    // 마우스가 있는 화면(모니터) 기준으로 위치를 잡습니다.
    const point = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(point)
    const width = 340
    const height = 380
    // 화면 밖으로 나가지 않도록 보정
    const x = Math.min(Math.max(point.x - width / 2, display.workArea.x), display.workArea.x + display.workArea.width - width)
    const y = Math.min(Math.max(point.y - 20, display.workArea.y), display.workArea.y + display.workArea.height - height)

    // 렌더러에 '새 메모 만들어서 팝업으로 열어라'고 알립니다.
    // (메모 데이터는 렌더러의 저장소가 관리하므로 여기서 직접 만들지 않습니다)
    if (!mainWindow) createMainWindow()
    mainWindow?.webContents.send('quick-capture', { x, y, width, height })
  })
  if (!ok) console.warn('[quick-capture] 단축키 등록 실패 (다른 앱이 사용 중일 수 있습니다)')
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// 창이 모두 닫혀도 트레이로 남기기 (Windows). 완전 종료는 트레이 메뉴에서.
app.on('window-all-closed', () => {
  // macOS 관례상 유지, Windows에서는 트레이가 있으면 유지
})

// 하나의 인스턴스만 실행되도록.
// ⚠️ 반드시 app.whenReady()를 등록하기 '전에' 락을 확인해야 합니다. 順序가
// 반대면(예전 코드), 이미 실행 중인 상태에서 아이콘을 더블클릭해 두 번째
// 인스턴스가 뜰 때 — 락을 못 받아 app.quit()을 부르더라도, 그 전에 이미
// 등록해 둔 whenReady().then(...) 콜백이 종료 중인 프로세스에서 뒤늦게
// 실행되면서 "앱이 완전히 준비되기 전에 globalShortcut을 썼다"는 에러가
// 났습니다. 락을 먼저 확인해 실패하면 whenReady 콜백 자체를 등록하지
// 않도록 순서를 바꿨습니다.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    // Windows 알림센터에 앱 이름이 제대로 표시되도록 앱 ID를 지정합니다.
    // (지정하지 않으면 알림이 'electron.app...' 으로 뜨거나 표시되지 않을 수 있습니다.)
    if (process.platform === 'win32') app.setAppUserModelId('com.hyunlab.memo')

    // 상단 기본 메뉴 제거 (복사/붙여넣기 등 단축키는 그대로 동작합니다)
    Menu.setApplicationMenu(null)
    createMainWindow()
    createTray()
    registerQuickCapture()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
  })
}

/** 트레이 아이콘 + 우클릭 메뉴 */
function createTray() {
  const icon = nativeImage.createFromPath(path.join(PUBLIC_DIR, 'icon.ico'))
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('HYUNLAB Memo')
  const menu = Menu.buildFromTemplate([
    {
      label: '메모 열기',
      click: () => {
        if (!mainWindow) createMainWindow()
        else {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: 'separator' },
    { label: '종료', click: () => app.exit(0) },
  ])
  tray.setContextMenu(menu)
  tray.on('double-click', () => {
    if (!mainWindow) createMainWindow()
    else mainWindow.show()
  })
}

// ------------------------------------------------------------
// IPC 핸들러 (렌더러 → 메인)
// ------------------------------------------------------------
interface PopupInitState {
  x: number
  y: number
  width: number
  height: number
  alwaysOnTop: boolean
  opacity: number
}

ipcMain.on('open-popup', (_e, memoId: string, state: PopupInitState) => {
  createPopupWindow(memoId, state)
})

ipcMain.on('open-scratch-popup', (_e, draftId: string, state: PopupInitState) => {
  createScratchPopupWindow(draftId, state)
})

ipcMain.on('popup:set-always-on-top', (e, value: boolean) => {
  BrowserWindow.fromWebContents(e.sender)?.setAlwaysOnTop(value)
})

ipcMain.on('popup:set-opacity', (e, value: number) => {
  BrowserWindow.fromWebContents(e.sender)?.setOpacity(value)
})

ipcMain.on('window:open-main', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow()
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

ipcMain.on('window:close', (e) => {
  BrowserWindow.fromWebContents(e.sender)?.close()
})

ipcMain.on('notify', (_e, title: string, body: string) => {
  if (!Notification.isSupported()) return
  // 소리는 항상 끄고 보냅니다. 렌더러가 설정(알림음 On/Off)에 따라
  // 자체적으로 소리를 내므로, 여기서까지 울리면 이중으로 납니다.
  const notification = new Notification({ title, body, silent: true })
  notification.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })
  notification.show()
})

ipcMain.on('window:flash', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return
  // 알림이 울릴 때 메인 창이 트레이에 숨겨져 있으면(X로 닫아 둔 상태) 작업표시줄에
  // 아이콘 자체가 없어 깜박임이 보이지 않고, 창 안의 알림 카드(ReminderAlertOverlay)도
  // 보이지 않습니다. showInactive()로 포커스는 뺏지 않으면서 창과 작업표시줄 아이콘만
  // 다시 보이게 한 뒤 깜박여서, 사용자가 하던 작업을 방해받지 않고도 알림을 확인할 수
  // 있게 합니다.
  if (!win.isVisible()) win.showInactive()
  win.flashFrame(true)
})

// 메모/디자인 등 저장 데이터가 바뀌면(메인 창·팝업·스크래치 팝업 어디서든)
// 나머지 창들에도 알려서 각자 최신 데이터를 다시 읽게 합니다.
// (알림 스케줄러는 메인 창 하나에서만 도는데, 팝업에서 알림을 등록해도
//  메인 창이 이걸 몰라 알림이 울리지 않는 문제를 막기 위함)
ipcMain.on('data:changed', (e) => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.webContents.id !== e.sender.id) win.webContents.send('data:changed')
  }
})

ipcMain.on('set-auto-start', (_e, enable: boolean) => {
  // Windows 시작 프로그램 등록/해제
  app.setLoginItemSettings({ openAtLogin: enable })
})
