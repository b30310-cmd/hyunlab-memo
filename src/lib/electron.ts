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
  /** 현재 창 닫기 */
  closeWindow: () => void
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
