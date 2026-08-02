// ============================================================
// preload 스크립트
//  - 렌더러(React)는 Node.js에 직접 접근할 수 없습니다(보안).
//  - 여기서 필요한 기능만 골라 window.electronAPI로 안전하게 노출합니다.
// ============================================================

import { contextBridge, ipcRenderer } from 'electron'

interface PopupState {
  x: number
  y: number
  width: number
  height: number
  alwaysOnTop: boolean
  opacity: number
  locked: boolean
  peekEdge: 'left' | 'right' | null
}

contextBridge.exposeInMainWorld('electronAPI', {
  /** 팝업(스티커) 창 열기 */
  openPopup: (memoId: string, state: PopupState) =>
    ipcRenderer.send('open-popup', memoId, state),

  /** 스크래치(임시) 팝업 창 열기 — 아직 저장 전인 '새 메모' 초안용 */
  openScratchPopup: (draftId: string, state: PopupState) =>
    ipcRenderer.send('open-scratch-popup', draftId, state),

  /** 현재 창의 '항상 위' 설정 */
  setAlwaysOnTop: (value: boolean) => ipcRenderer.send('popup:set-always-on-top', value),

  /** 현재 창의 투명도 설정 */
  setOpacity: (value: number) => ipcRenderer.send('popup:set-opacity', value),

  /** 모서리 피크 켜기 (edge: 'left' | 'right') — 창을 그 가장자리에 살짝만 보이게 붙입니다 */
  enablePeek: (edge: 'left' | 'right') => ipcRenderer.send('popup:enable-peek', edge),

  /** 모서리 피크 끄기 — 원래 크기·위치로 되돌립니다 */
  disablePeek: () => ipcRenderer.send('popup:disable-peek'),

  /** 마우스가 피크 중인 창 위로 올라왔을 때 — 전체를 펼쳐 보여줍니다 */
  peekReveal: () => ipcRenderer.send('popup:peek-reveal'),

  /** 마우스가 창에서 벗어났을 때 — 잠시 뒤 다시 가장자리로 접습니다 */
  peekCollapse: () => ipcRenderer.send('popup:peek-collapse'),

  /** 현재 창 닫기 */
  closeWindow: () => ipcRenderer.send('window:close'),

  /** Windows 알림 표시 */
  notify: (title: string, body: string) => ipcRenderer.send('notify', title, body),

  /** 작업표시줄 아이콘 깜박이기 */
  flashWindow: () => ipcRenderer.send('window:flash'),

  /** 시작 프로그램 등록/해제 */
  setAutoStart: (enable: boolean) => ipcRenderer.send('set-auto-start', enable),

  /** 메인 창 열기 / 앞으로 가져오기 */
  openMain: () => ipcRenderer.send('window:open-main'),

  /**
   * 메모/디자인 등 저장 데이터가 바뀌었음을 다른 창들에 알립니다.
   * (팝업에서 알림을 등록해도, 알림 스케줄러가 도는 메인 창이 최신 데이터를
   *  모르면 알림이 울리지 않으므로 필요합니다)
   */
  notifyDataChanged: () => ipcRenderer.send('data:changed'),

  /** 다른 창에서 저장 데이터가 바뀌었다는 알림을 받습니다. */
  onDataChanged: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('data:changed', listener)
    return () => ipcRenderer.removeListener('data:changed', listener)
  },

  /** 빠른 캡처 단축키(Ctrl+Shift+N)가 눌렸을 때 알림 받기 */
  onQuickCapture: (
    callback: (bounds: { x: number; y: number; width: number; height: number }) => void,
  ) => {
    const listener = (_e: unknown, bounds: { x: number; y: number; width: number; height: number }) =>
      callback(bounds)
    ipcRenderer.on('quick-capture', listener)
    return () => ipcRenderer.removeListener('quick-capture', listener)
  },

  /** 팝업 창의 위치/크기가 바뀔 때 알림 받기 */
  onBoundsChanged: (
    callback: (bounds: { x: number; y: number; width: number; height: number }) => void,
  ) => {
    const listener = (_e: unknown, bounds: { x: number; y: number; width: number; height: number }) =>
      callback(bounds)
    ipcRenderer.on('popup:bounds-changed', listener)
    return () => ipcRenderer.removeListener('popup:bounds-changed', listener)
  },
})
