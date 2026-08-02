// ============================================================
// Electron 브릿지
//  - preload.ts에서 window.electronAPI 로 노출한 함수들을 타입 안전하게 감쌉니다.
//  - 웹 환경(Electron이 아님)에서는 각 함수가 안전하게 대체 동작(폴백)합니다.
// ============================================================

import type { PopupState } from '@/types'

/** preload.ts에서 노출하는 API의 타입 */
export interface ElectronAPI {
  /** 팝업(스티커) 창 열기 */
  openPopup: (memoId: string, state: PopupState) => void
  /** 스크래치(임시) 팝업 창 열기 — 아직 저장 전인 '새 메모' 초안용 */
  openScratchPopup: (draftId: string, state: PopupState) => void
  /** 팝업 창의 '항상 위' 설정 */
  setAlwaysOnTop: (value: boolean) => void
  /** 팝업 창의 투명도 설정 (0.3 ~ 1.0) */
  setOpacity: (value: number) => void
  /** 모서리 피크 켜기 — 창을 화면 가장자리에 살짝만 보이게 붙입니다 */
  enablePeek: (edge: 'left' | 'right') => void
  /** 모서리 피크 끄기 — 원래 크기·위치로 되돌립니다 */
  disablePeek: () => void
  /** 마우스가 피크 중인 창 위로 올라왔을 때 — 전체를 펼쳐 보여줍니다 */
  peekReveal: () => void
  /** 마우스가 창에서 벗어났을 때 — 잠시 뒤 다시 가장자리로 접습니다 */
  peekCollapse: () => void
  /** 접힌 손잡이를 드래그해 세로 위치가 바뀌었을 때 알림 구독. 반환값은 구독 해제 함수입니다. */
  onPeekYChanged: (callback: (y: number) => void) => () => void
  /** 현재 창 닫기 */
  closeWindow: () => void
  /** 지금 창에 진짜 키보드 포커스를 강제로 다시 줍니다(blur 후 focus) */
  refocusWindow: () => void
  /** Windows 알림 표시 (소리는 항상 끄고 보내며, 소리는 렌더러에서 자체적으로 냅니다) */
  notify: (title: string, body: string) => void
  /** 작업표시줄 아이콘 깜박이기 (창이 포커스를 받으면 자동으로 멈춥니다) */
  flashWindow: () => void
  /** 시작 프로그램 등록/해제 */
  setAutoStart: (enable: boolean) => void
  /**
   * 팝업 창의 위치/크기 변경 알림 구독.
   * 반환값은 구독 해제 함수입니다.
   */
  onBoundsChanged: (
    callback: (bounds: { x: number; y: number; width: number; height: number }) => void,
  ) => () => void
  /** 메인 창 열기 / 앞으로 가져오기 */
  openMain: () => void
  /** 빠른 캡처 단축키 알림 구독 (Ctrl+Shift+N) */
  onQuickCapture: (
    callback: (bounds: { x: number; y: number; width: number; height: number }) => void,
  ) => () => void
  /** 메모/디자인 등 저장 데이터가 바뀌었음을 다른 창들에 알림 */
  notifyDataChanged: () => void
  /** 다른 창에서 저장 데이터가 바뀌었다는 알림 구독. 반환값은 구독 해제 함수입니다. */
  onDataChanged: (callback: () => void) => () => void
  /** 알림(리마인더)이 울렸음을 다른 창들에 알림 (그 메모를 팝업으로 열어 뒀을 수 있으므로) */
  notifyAlertFired: (memoId: string) => void
  /** 다른 창에서 알림이 울렸다는 소식 구독. 반환값은 구독 해제 함수입니다. */
  onAlertFired: (callback: (memoId: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

/** 현재 Electron 환경인지 여부 */
export const isElectron = (): boolean =>
  typeof window !== 'undefined' && !!window.electronAPI

/** Electron API 접근 (없으면 undefined) */
export const electron = (): ElectronAPI | undefined =>
  typeof window !== 'undefined' ? window.electronAPI : undefined

/**
 * 팝업 메모 열기.
 * - Electron: 독립된 네이티브 창 생성
 * - 웹: 새 브라우저 팝업 창(window.open)
 */
export function openPopupMemo(memoId: string, state: PopupState): void {
  const api = electron()
  if (api) {
    api.openPopup(memoId, state)
    return
  }
  // 웹 폴백: 해시 라우팅으로 팝업 페이지를 새 창에 띄웁니다.
  const url = `${location.pathname}#/popup/${memoId}`
  window.open(
    url,
    `popup-${memoId}`,
    `width=${state.width},height=${state.height},left=${state.x},top=${state.y}`,
  )
}

/**
 * 스크래치(임시) 팝업 창 열기 — '새 메모' 버튼이 여는, 아직 저장 전인 초안 창.
 * - Electron: 독립된 네이티브 창 생성
 * - 웹: 새 브라우저 팝업 창(window.open)
 */
export function openScratchPopup(draftId: string, state: PopupState): void {
  const api = electron()
  if (api) {
    api.openScratchPopup(draftId, state)
    return
  }
  const url = `${location.pathname}#/scratch-popup/${draftId}`
  window.open(
    url,
    `scratch-popup-${draftId}`,
    `width=${state.width},height=${state.height},left=${state.x},top=${state.y}`,
  )
}

/** 알림 표시 (Electron이면 네이티브, 웹이면 Notification API) */
export function showNotification(title: string, body: string): void {
  const api = electron()
  if (api) {
    api.notify(title, body)
    return
  }
  // 웹 폴백
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

/** 작업표시줄 아이콘을 깜박여 알림을 놓치지 않게 합니다 (Windows 설치 버전 전용) */
export function flashWindow(): void {
  electron()?.flashWindow()
}

/**
 * 지금 창에 진짜 키보드 포커스를 강제로 다시 줍니다 (Windows 설치 버전 전용).
 * DOM의 element.focus()만으로는 실제 키보드 입력이 안 들어오는 경우를 위한
 * 보정 — 다른 창을 열었다 닫거나 최소화했다 복원하는 것과 같은 효과입니다.
 */
export function refocusWindow(): void {
  electron()?.refocusWindow()
}

/**
 * 저장 데이터가 바뀌었음을 다른 창들에 알립니다 (Windows 설치 버전 전용).
 * 웹에서는 브라우저의 storage 이벤트가 같은 역할을 대신하므로 아무 일도 하지 않습니다.
 */
export function notifyDataChanged(): void {
  electron()?.notifyDataChanged()
}

/**
 * 알림(리마인더)이 울렸음을 다른 창들에 알립니다 (Windows 설치 버전 전용).
 * 그 메모를 팝업으로 열어 둔 창이 있으면 눈에 띄게 표시할 수 있게 합니다.
 */
export function notifyAlertFired(memoId: string): void {
  electron()?.notifyAlertFired(memoId)
}
