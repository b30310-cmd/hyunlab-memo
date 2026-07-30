import { useEffect, useState } from 'react'
import { isElectron } from '@/lib/electron'

// ============================================================
// PWA 설치 상태 관리
//
//  브라우저가 'beforeinstallprompt' 이벤트를 보내주면 그 신호를
//  붙잡아 두었다가, 사용자가 버튼을 눌렀을 때 설치 창을 띄웁니다.
//  (이 이벤트는 브라우저가 "설치할 만하다"고 판단했을 때만 옵니다 —
//   manifest·서비스워커·HTTPS 조건을 모두 만족해야 합니다)
//
//  이미 설치되어 독립 창(standalone)으로 실행 중이면 버튼을 숨깁니다.
//  Electron 안에서는 이 개념 자체가 없으므로 항상 숨깁니다.
// ============================================================

/** 브라우저가 보내는 설치 프롬프트 이벤트 (표준 타입에는 아직 없어 직접 정의) */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** 이미 PWA로 설치되어 실행 중인지 확인 */
function isRunningStandalone(): boolean {
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  // iOS Safari 전용 플래그
  if ((window.navigator as unknown as { standalone?: boolean }).standalone) return true
  return false
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isRunningStandalone)

  useEffect(() => {
    if (isElectron()) return // Electron 앱 안에서는 해당 없음

    const onPrompt = (e: Event) => {
      e.preventDefault() // 브라우저 기본 배너 대신 우리 버튼으로 유도
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  /** 설치 가능 여부 (버튼 노출 조건) */
  const canInstall = !isElectron() && !installed && deferred !== null

  /** 설치 창 띄우기 */
  const promptInstall = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferred(null)
  }

  return { canInstall, installed, promptInstall }
}
