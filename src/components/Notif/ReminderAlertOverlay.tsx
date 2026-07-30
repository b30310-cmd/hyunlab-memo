import { Bell, Clock, X } from 'lucide-react'
import { useAlertStore } from '@/store/useAlertStore'
import { useMemoStore } from '@/store/useMemoStore'
import { displayTitle, previewText } from '@/lib/filter'
import { ICON } from '@/components/ui/Button'

// ============================================================
// 팝업 알림 — 알림 시각이 되면 화면 우측 아래에 뜨는 카드입니다.
//  Windows 알림(토스트)은 몇 초 뒤 자동으로 사라지지만(운영체제 정책),
//  이 카드는 사용자가 '확인'하거나 '다시 알림'을 누르기 전까지 계속 남아 있습니다.
// ============================================================

const SNOOZE_OPTIONS = [
  { label: '5분 후', minutes: 5 },
  { label: '10분 후', minutes: 10 },
  { label: '1시간 후', minutes: 60 },
]

/** datetime-local(YYYY-MM-DDTHH:mm) 형식으로 변환 */
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ReminderAlertOverlay() {
  const alerts = useAlertStore((s) => s.alerts)
  const dismiss = useAlertStore((s) => s.dismiss)
  const memos = useMemoStore((s) => s.memos)
  const select = useMemoStore((s) => s.select)
  const updateMemo = useMemoStore((s) => s.updateMemo)

  if (alerts.length === 0) return null

  const snooze = (alertId: string, memoId: string, minutes: number) => {
    const memo = useMemoStore.getState().memos.find((m) => m.id === memoId)
    if (memo) {
      const next = new Date(Date.now() + minutes * 60 * 1000)
      updateMemo(memoId, { reminder: { ...memo.reminder, enabled: true, datetime: toDatetimeLocal(next) } })
    }
    dismiss(alertId)
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[300] flex w-80 flex-col gap-2">
      {alerts.map((a) => {
        const memo = memos.find((m) => m.id === a.memoId)
        if (!memo) return null
        return (
          <div
            key={a.id}
            className="animate-pop ui-panel pointer-events-auto !border-l-4 !border-l-accent !p-3"
          >
            <div className="flex items-start gap-2">
              <Bell size={ICON.md} className="mt-0.5 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <button
                  className="block w-full truncate text-left text-base font-semibold text-body hover:underline"
                  onClick={() => { select(memo.id); dismiss(a.id) }}
                >
                  {displayTitle(memo)}
                </button>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                  {previewText(memo) || '알림 시각이 되었습니다'}
                </p>
              </div>
              <button
                onClick={() => dismiss(a.id)}
                title="닫기"
                className="shrink-0 text-faint transition-colors hover:text-body"
              >
                <X size={ICON.sm} />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="flex items-center gap-1 text-xs text-faint">
                <Clock size={ICON.xs} /> 다시 알림
              </span>
              {SNOOZE_OPTIONS.map((o) => (
                <button
                  key={o.minutes}
                  onClick={() => snooze(a.id, memo.id, o.minutes)}
                  className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted transition-colors hover:text-body"
                >
                  {o.label}
                </button>
              ))}
              <button
                onClick={() => dismiss(a.id)}
                className="ml-auto rounded-full bg-accent px-2.5 py-0.5 text-xs text-white"
              >
                확인
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
