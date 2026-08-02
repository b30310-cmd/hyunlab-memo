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

// 메인 프로세스에서 예기치 못한 예외가 발생해도 Electron 기본 "A JavaScript
// Error occurred in the main process" 팝업이 뜨지 않게 합니다. 그 팝업은 앱을
// 잘 모르는 사용자에게는 그냥 무섭고 원인도 알 수 없는 에러 창일 뿐이라, 대신
// 콘솔에 로그만 남기고 앱은 계속 동작하게 둡니다. (예: 빠른 더블클릭으로 두
// 프로세스가 거의 동시에 떠서 생기는 타이밍 문제 등, 완전히 없애기 어려운
// 레이스가 남아 있어도 사용자에게는 보이지 않도록 하는 안전장치)
process.on('uncaughtException', (err) => {
  console.error('[main] Uncaught exception:', err)
})

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

// ------------------------------------------------------------
// 알림 — 작업표시줄 아이콘 빠르게 깜박이기
//  Electron의 flashFrame(true)는 켜고 끄는 신호만 보낼 뿐, 깜박이는
//  속도 자체는 Windows 기본값(운영체제가 정함)이라 직접 조절할 수
//  없습니다. 대신 짧은 간격으로 껐다 켰다를 반복해서 기본값보다 눈에
//  더 잘 띄게(빠르게 깜박이는 것처럼) 만듭니다. 창에 포커스가 오거나
//  일정 시간이 지나면 자동으로 멈춥니다.
// ------------------------------------------------------------
const flashTimers = new Map<number, ReturnType<typeof setInterval>>()
const FAST_FLASH_INTERVAL = 350 // ms — Windows 기본 깜박임보다 빠르게
const FAST_FLASH_DURATION = 8000 // ms — 계속 깜박이면 방해가 되므로 이후 자동 정지

function startFastFlash(win: BrowserWindow) {
  stopFastFlash(win)
  let on = false
  const timer = setInterval(() => {
    if (win.isDestroyed()) {
      stopFastFlash(win)
      return
    }
    on = !on
    win.flashFrame(on)
  }, FAST_FLASH_INTERVAL)
  flashTimers.set(win.id, timer)
  setTimeout(() => stopFastFlash(win), FAST_FLASH_DURATION)
}

function stopFastFlash(win: BrowserWindow) {
  const timer = flashTimers.get(win.id)
  if (timer) {
    clearInterval(timer)
    flashTimers.delete(win.id)
  }
  if (!win.isDestroyed()) win.flashFrame(false)
}

// ------------------------------------------------------------
// 모서리 피크 — 팝업 창을 화면 가장자리에 살짝만 보이게 숨겨 두었다가,
// 마우스를 올리면 전체가 나오는 기능. 창의 실제 크기는 그대로 두고
// 위치만 화면 밖으로 밀어내는 방식이라 별도의 애니메이션 라이브러리 없이
// 구현할 수 있습니다.
//
// 접혔을 때 보이는 손잡이(세로 위치, collapsedY)는 사용자가 직접 위아래로
// 드래그해서 원하는 곳으로 옮길 수 있습니다(가로는 항상 가장자리에 고정).
// 새로 피크를 켤 때는 같은 가장자리에 이미 피크 중인 다른 창들 바로
// 아래로 기본 배치해서, 적어도 처음엔 서로 겹치지 않게 합니다.
// ------------------------------------------------------------
interface PeekInfo {
  edge: 'left' | 'right'
  /** 피크가 아닐 때(펼쳐졌을 때)의 진짜 크기(너비·높이) */
  fullBounds: Electron.Rectangle
  /** 지금 접힌 상태인지 — sendBounds에서 이 위치를 "진짜 위치"로 잘못 저장하지 않기 위해 씀 */
  collapsed: boolean
  /** 접혔을 때(손잡이) 세로 위치 — 사용자가 드래그하면 여기가 바뀝니다 */
  collapsedY: number
  hideTimer?: ReturnType<typeof setTimeout>
}
const peekMap = new Map<number, PeekInfo>() // BrowserWindow.id → 상태

/** 화면 밖으로 살짝 밀려나 실제로 보이는 폭(px) */
const PEEK_STRIP = 14
/** 접혔을 때 세로로 차지하는 높이(손잡이 크기) */
const PEEK_COLLAPSED_HEIGHT = 46
/** 새로 피크를 켤 때, 기존에 피크 중인 창들 사이에 두는 간격 */
const PEEK_ROW_GAP = 6
/** 화면 위쪽에서 첫 손잡이까지의 기본 여백 */
const PEEK_TOP_MARGIN = 24
/** 마우스가 창을 벗어난 뒤 다시 접기까지 기다리는 시간(ms) — 너무 빨리 접히면 실수로 닫히는 느낌이 듦 */
const PEEK_HIDE_DELAY = 450

function peekWorkArea(fullBounds: Electron.Rectangle) {
  return screen.getDisplayMatching(fullBounds).workArea
}

/** 접혔을 때(x는 가장자리 고정, y는 collapsedY) 위치·크기를 계산합니다. */
function collapsedBounds(info: PeekInfo): Electron.Rectangle {
  const wa = peekWorkArea(info.fullBounds)
  const y = Math.min(Math.max(info.collapsedY, wa.y), wa.y + wa.height - PEEK_COLLAPSED_HEIGHT)
  const x = info.edge === 'left'
    ? wa.x - (info.fullBounds.width - PEEK_STRIP)
    : wa.x + wa.width - PEEK_STRIP
  return { x, y, width: info.fullBounds.width, height: PEEK_COLLAPSED_HEIGHT }
}

/** 펼쳤을 때(가장자리에 완전히 붙은) 위치·크기를 계산합니다. */
function revealedBounds(info: PeekInfo): Electron.Rectangle {
  const wa = peekWorkArea(info.fullBounds)
  const y = Math.min(Math.max(info.collapsedY, wa.y), wa.y + wa.height - info.fullBounds.height)
  const x = info.edge === 'left' ? wa.x : wa.x + wa.width - info.fullBounds.width
  return { x, y, width: info.fullBounds.width, height: info.fullBounds.height }
}

/** 새로 피크를 켤 때 쓸 기본 세로 위치 — 같은 가장자리의 기존 손잡이들 바로 아래 */
function defaultCollapsedY(edge: 'left' | 'right', wa: Electron.Rectangle): number {
  let y = wa.y + PEEK_TOP_MARGIN
  for (const info of peekMap.values()) {
    if (info.edge !== edge) continue
    y = Math.max(y, info.collapsedY + PEEK_COLLAPSED_HEIGHT + PEEK_ROW_GAP)
  }
  return Math.min(y, wa.y + wa.height - PEEK_COLLAPSED_HEIGHT)
}

function enablePeek(win: BrowserWindow, edge: 'left' | 'right', savedY?: number | null) {
  const existing = peekMap.get(win.id)
  // 펼쳐진 상태에서 켰다면 지금 크기를 "진짜 크기"로, 이미 접힌 상태에서
  // 가장자리만 바꿨다면(왼쪽↔오른쪽) 기존에 기억해 둔 크기를 그대로 씁니다.
  const fullBounds = existing && existing.collapsed ? existing.fullBounds : win.getBounds()
  if (existing?.hideTimer) clearTimeout(existing.hideTimer)
  const wa = peekWorkArea(fullBounds)
  // 저장돼 있던 위치가 있으면 그대로, 없으면(처음 켜는 경우) 기존 손잡이들
  // 아래로 기본 배치합니다.
  const collapsedY = existing ? existing.collapsedY : savedY ?? defaultCollapsedY(edge, wa)
  const info: PeekInfo = { edge, fullBounds, collapsed: true, collapsedY }
  peekMap.set(win.id, info)
  win.setAlwaysOnTop(true) // 항상 위와 함께가 아니면 다른 창에 가려 의미가 없음
  win.setBounds(collapsedBounds(info))
}

function disablePeek(win: BrowserWindow) {
  const info = peekMap.get(win.id)
  if (!info) return
  if (info.hideTimer) clearTimeout(info.hideTimer)
  // 화면 밖에 있던 접힌 위치 그대로 남지 않도록, 펼친(가장자리에 붙은) 위치로 되돌립니다.
  win.setBounds(revealedBounds(info))
  peekMap.delete(win.id)
}

function peekReveal(win: BrowserWindow) {
  const info = peekMap.get(win.id)
  if (!info) return
  if (info.hideTimer) clearTimeout(info.hideTimer)
  info.collapsed = false
  win.setBounds(revealedBounds(info))
}

function peekCollapse(win: BrowserWindow) {
  const info = peekMap.get(win.id)
  if (!info) return
  if (info.hideTimer) clearTimeout(info.hideTimer)
  info.hideTimer = setTimeout(() => {
    if (win.isDestroyed()) return
    // 펼쳐진 동안 사용자가 창 크기를 조절했을 수 있으니 반영합니다.
    const cur = win.getBounds()
    info.fullBounds = { ...info.fullBounds, width: cur.width, height: cur.height }
    info.collapsed = true
    win.setBounds(collapsedBounds(info))
  }, PEEK_HIDE_DELAY)
}

/**
 * 접힌 손잡이를 사용자가 드래그했을 때 호출합니다. 가로는 항상 가장자리에
 * 고정하고(드래그로 벗어났어도 되돌림), 세로 위치만 반영해서 기억해 둡니다.
 * 반환값이 있으면 렌더러에 알려서 그 메모에 저장하게 합니다.
 */
function handlePeekDrag(win: BrowserWindow): number | null {
  const info = peekMap.get(win.id)
  if (!info || !info.collapsed) return null
  const wa = peekWorkArea(info.fullBounds)
  const cur = win.getBounds()
  const clampedY = Math.min(Math.max(cur.y, wa.y), wa.y + wa.height - PEEK_COLLAPSED_HEIGHT)
  info.collapsedY = clampedY
  const expected = collapsedBounds(info)
  if (cur.x !== expected.x || cur.y !== expected.y) win.setBounds(expected)
  return clampedY
}

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
    if (mainWindow) stopFastFlash(mainWindow)
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

  // 이전에 모서리 피크를 켜 둔 채로 저장된 메모라면, 창을 열자마자 다시
  // 접힌 상태로(저장돼 있던 세로 위치 그대로) 시작합니다.
  if (state.peekEdge) enablePeek(win, state.peekEdge, state.peekY)

  // 창을 옮기거나 크기를 바꾸면 렌더러에 알려 메모에 위치를 저장하게 합니다.
  // (Windows 스티커 메모처럼 "메모 위치 기억")
  //
  // 접힌(피크) 상태에서 옮기는 건 사용자가 손잡이를 드래그해 원하는 자리로
  // 옮기는 것이므로, 일반 위치 저장과는 다르게 처리합니다 — 가로는 가장
  // 자리에 고정시키고, 세로 위치만 별도 채널로 알려서 peekY로 저장하게 합니다.
  const handleMoved = () => {
    if (win.isDestroyed()) return
    const info = peekMap.get(win.id)
    if (info?.collapsed) {
      const y = handlePeekDrag(win)
      if (y != null) win.webContents.send('popup:peek-y-changed', y)
      return
    }
    win.webContents.send('popup:bounds-changed', win.getBounds())
  }
  const handleResized = () => {
    if (win.isDestroyed()) return
    // 피크로 접힌 동안의 크기는 손잡이용 임시 크기라, 그대로 저장하면 다음에
    // 열 때 창이 그 작은 크기로 시작해 버립니다.
    if (peekMap.get(win.id)?.collapsed) return
    win.webContents.send('popup:bounds-changed', win.getBounds())
  }
  win.on('moved', handleMoved)
  win.on('resized', handleResized)

  popupWindows.set(id, win)
  win.on('closed', () => {
    popupWindows.delete(id)
    const info = peekMap.get(win.id)
    if (info?.hideTimer) clearTimeout(info.hideTimer)
    peekMap.delete(win.id)
  })
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
  try {
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
  } catch (err) {
    // 앱이 완전히 준비되기 전에 호출되는 등 예외적인 타이밍에도 여기서 막아
    // 사용자에게 에러 창이 뜨지 않게 합니다.
    console.error('[quick-capture] 단축키 등록 중 오류:', err)
  }
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
  peekEdge?: 'left' | 'right' | null
  peekY?: number | null
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

ipcMain.on('popup:enable-peek', (e, edge: 'left' | 'right') => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (win) enablePeek(win, edge)
})

ipcMain.on('popup:disable-peek', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (win) disablePeek(win)
})

ipcMain.on('popup:peek-reveal', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (win) peekReveal(win)
})

ipcMain.on('popup:peek-collapse', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (win) peekCollapse(win)
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

// 렌더러에서 새 DOM 노드에 element.focus()를 불러도, Windows에서는 그
// 노드가 진짜 키보드 입력을 못 받는 상태가 남는 경우가 있었습니다(다른
// 창을 열었다 닫거나, 최소화했다 복원하면 그제서야 정상화됨 — 사용자가
// 직접 확인해 준 재현 방법). document.activeElement는 맞게 가리키고
// 있어도 Chromium의 렌더 위젯 쪽 포커스 상태가 따로 놀 때가 있는
// 것으로 보입니다. 창을 blur() 했다가 곧바로 focus()하면, 실제로 다른
// 창을 열었다 닫는 것과 같은 "진짜 포커스 전환"이 강제로 일어나서 그
// 상태가 다시 맞춰집니다.
ipcMain.on('window:refocus', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win || win.isDestroyed()) return
  win.blur()
  win.focus()
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
  startFastFlash(win)
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

// 알림 스케줄러(메인 창)가 알림을 울리면, 그 메모를 팝업으로 열어 둔 창이
// 있을 수도 있으니 모든 창에 알려서 각자 "이 메모 맞으면 표시 내기"를
// 하게 합니다 (팝업 창을 주황색으로 표시).
ipcMain.on('alert:fired', (e, memoId: string) => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.webContents.id !== e.sender.id) win.webContents.send('alert:fired', memoId)
  }
})

ipcMain.on('set-auto-start', (_e, enable: boolean) => {
  // Windows 시작 프로그램 등록/해제
  app.setLoginItemSettings({ openAtLogin: enable })
})
