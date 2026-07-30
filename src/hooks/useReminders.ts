import { useEffect } from 'react'
import { useMemoStore } from '@/store/useMemoStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useAlertStore } from '@/store/useAlertStore'
import { showNotification, flashWindow } from '@/lib/electron'
import { playAlertSound } from '@/lib/sound'
import { displayTitle } from '@/lib/filter'
import type { Memo } from '@/types'

// ============================================================
// 알림 스케줄러 훅
//  - 30초마다 알림이 예정된 메모가 있는지 확인합니다.
//  - 시간이 되면 알림을 띄우고, 반복 설정에 따라 다음 시각으로 갱신합니다.
// ============================================================

/** 반복 주기에 따라 다음 알림 시각을 계산 */
function nextDatetime(datetime: string, repeat: Memo['reminder']['repeat']): string | null {
  const d = new Date(datetime)
  switch (repeat) {
    case 'daily':
      d.setDate(d.getDate() + 1)
      break
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      break
    default:
      return null // 반복 없음 → 이후 비활성화
  }
  // datetime-local 형식(YYYY-MM-DDTHH:mm)으로 되돌리기
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function useReminders() {
  const memos = useMemoStore((s) => s.memos)
  const updateMemo = useMemoStore((s) => s.updateMemo)
  const pushAlert = useAlertStore((s) => s.push)

  useEffect(() => {
    // 웹에서 알림 권한 요청 (Electron은 자체 알림 사용)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const check = () => {
      const now = Date.now()
      // 최신 메모 상태를 store에서 직접 읽습니다.
      useMemoStore.getState().memos.forEach((m) => {
        if (!m.reminder.enabled || !m.reminder.datetime) return
        const target = new Date(m.reminder.datetime).getTime()
        if (Number.isNaN(target)) return
        // 예정 시각이 지났고, 1분 이내라면 알림 (놓친 알림 중복 방지)
        if (target <= now && now - target < 60 * 1000) {
          // Windows 알림 + 작업표시줄 깜박임(포커스가 올 때까지 유지) + 앱 안 팝업 알림.
          // 팝업 알림은 사용자가 '확인'하거나 '다시 알림'을 누를 때까지 화면에 남습니다.
          showNotification('HYUNLAB Memo 알림', displayTitle(m))
          flashWindow()
          if (useSettingsStore.getState().notifySound) playAlertSound()
          pushAlert(m.id)

          // 다음 시각 계산 (반복 없음이면 알림 자체를 끕니다)
          const next = nextDatetime(m.reminder.datetime, m.reminder.repeat)
          if (next) {
            updateMemo(m.id, { reminder: { ...m.reminder, datetime: next } })
          } else {
            updateMemo(m.id, { reminder: { ...m.reminder, enabled: false } })
          }
        }
      })
    }

    const timer = setInterval(check, 30 * 1000)
    check()
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return memos
}
