import { useEffect } from 'react'
import { useMemoStore } from '@/store/useMemoStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useAlertStore } from '@/store/useAlertStore'
import { useScratchStore } from '@/store/useScratchStore'
import { showNotification, flashWindow } from '@/lib/electron'
import { playAlertSound } from '@/lib/sound'
import { displayTitle, stripHtml } from '@/lib/filter'
import type { Memo } from '@/types'

// ============================================================
// 알림 스케줄러 훅
//  - 30초마다 알림이 예정된 메모가 있는지 확인합니다.
//  - 시간이 되면 알림을 띄우고, 반복 설정에 따라 다음 시각으로 갱신합니다.
//  - 저장된 메모뿐 아니라, 아직 프로젝트에 저장하지 않은 스크래치 초안
//    (메인 화면 스크래치패드 · '새 메모' 팝업)에 걸어 둔 알림도 확인합니다.
//    ReminderEditor는 두 곳 모두에서 열 수 있으므로, 여기서도 둘 다 봐야
//    실제로 알림이 울립니다.
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

    /** 알림 시각이 됐을 때 공통으로 하는 일 (Windows 알림 + 깜박임 + 소리 + 앱 안 알림 카드) */
    const fire = (title: string, targetId: string) => {
      showNotification('HYUNLAB Memo 알림', title)
      flashWindow()
      if (useSettingsStore.getState().notifySound) playAlertSound()
      pushAlert(targetId)
    }

    const check = () => {
      const now = Date.now()

      // 저장된 메모 — 최신 상태를 store에서 직접 읽습니다.
      useMemoStore.getState().memos.forEach((m) => {
        if (!m.reminder.enabled || !m.reminder.datetime) return
        const target = new Date(m.reminder.datetime).getTime()
        if (Number.isNaN(target)) return
        // 예정 시각이 지났고, 1분 이내라면 알림 (놓친 알림 중복 방지)
        if (target <= now && now - target < 60 * 1000) {
          fire(displayTitle(m), m.id)

          // 다음 시각 계산 (반복 없음이면 알림 자체를 끕니다)
          const next = nextDatetime(m.reminder.datetime, m.reminder.repeat)
          if (next) {
            updateMemo(m.id, { reminder: { ...m.reminder, datetime: next } })
          } else {
            updateMemo(m.id, { reminder: { ...m.reminder, enabled: false } })
          }
        }
      })

      // 아직 프로젝트에 저장하지 않은 스크래치 초안 (메인 스크래치패드 · 새 메모 팝업)
      const scratch = useScratchStore.getState()
      Object.entries(scratch.drafts).forEach(([draftId, draft]) => {
        if (!draft.reminder.enabled || !draft.reminder.datetime) return
        const target = new Date(draft.reminder.datetime).getTime()
        if (Number.isNaN(target)) return
        if (target <= now && now - target < 60 * 1000) {
          // 팝업(새 메모)에는 제목 입력창이 없어 title이 늘 비어 있을 수 있으므로,
          // 저장된 메모와 같은 규칙으로 본문 첫 줄을 대신 보여줍니다.
          const title = draft.title.trim() || stripHtml(draft.content).split('\n')[0].trim() || '새 메모'
          fire(title, draftId)

          const next = nextDatetime(draft.reminder.datetime, draft.reminder.repeat)
          if (next) {
            scratch.update(draftId, { reminder: { ...draft.reminder, datetime: next } })
          } else {
            scratch.update(draftId, { reminder: { ...draft.reminder, enabled: false } })
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
