import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { PopupWindow } from './pages/PopupWindow'
import { ScratchPopupWindow } from './pages/ScratchPopupWindow'

// ============================================================
// 진입점 + 아주 단순한 해시 라우팅
//  - #/popup/:id          → 팝업(스티커) 메모 창 (이미 저장된 메모)
//  - #/scratch-popup/:id  → 스크래치(임시) 팝업 창 ('새 메모'로 여는 저장 전 초안)
//  - 그 외                 → 메인 앱
// ============================================================

function Root() {
  const [hash, setHash] = React.useState(window.location.hash)

  React.useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const scratchPopupMatch = hash.match(/^#\/scratch-popup\/(.+)$/)
  if (scratchPopupMatch) {
    return <ScratchPopupWindow draftId={decodeURIComponent(scratchPopupMatch[1])} />
  }

  const popupMatch = hash.match(/^#\/popup\/(.+)$/)
  if (popupMatch) {
    return <PopupWindow memoId={decodeURIComponent(popupMatch[1])} />
  }
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)

// 개발 모드에서만 스토어를 노출합니다 (자동 테스트/디버깅용).
// 배포 빌드(production)에는 포함되지 않습니다.
if (import.meta.env.DEV) {
  import('./store/useMemoStore').then((m) => {
    ;(window as unknown as Record<string, unknown>).__memoStore = m.useMemoStore
  })
  import('./store/useAlertStore').then((m) => {
    ;(window as unknown as Record<string, unknown>).__alertStore = m.useAlertStore
  })
  import('./lib/storage').then((m) => {
    ;(window as unknown as Record<string, unknown>).__runMigrations = m.runMigrations
  })
  import('./lib/exporter').then((m) => {
    ;(window as unknown as Record<string, unknown>).__exporter = m
  })
}

// PWA 서비스워커 등록 (웹 전용, 오프라인 지원)
if ('serviceWorker' in navigator && !window.electronAPI) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* 등록 실패는 조용히 무시 */
    })
  })
}
