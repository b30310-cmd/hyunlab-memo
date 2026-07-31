import { Bell, Clock, X } from 'lucide-react'
import { useAlertStore } from '@/store/useAlertStore'
import { useMemoStore, DEFAULT_POPUP } from '@/store/useMemoStore'
import { useScratchStore, MAIN_SCRATCH_ID } from '@/store/useScratchStore'
import { displayTitle, previewText, stripHtml } from '@/lib/filter'
import { openScratchPopup } from '@/lib/electron'
import { ICON } from '@/components/ui/Button'

// ============================================================
// 팝업 알림 — 알림 시각이 되면 화면 우측 아래에 뜨는 카드입니다.
//  Windows 알림(토스트)은 몇 초 뒤 자동으로 사라지지만(운영체제 정책),
//  이 카드는 사용자가 '확인'하거나 '다시 알림'을 누르기 전까지 계속 남아 있습니다.
//
//  알림은 저장된 메모뿐 아니라, 아직 프로젝트에 저장하지 않은 스크래치 초안
//  (메인 스크래치패드·'새 메모' 팝업)에도 걸 수 있어서, 여기서도 둘 다
//  찾아서 보여줍니다.
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
  const drafts = useScratchStore((s) => s.drafts)
  const updateDraft = useScratchStore((s) => s.update)

  if (alerts.length === 0) return null

  const snooze = (alertId: string, targetId: string, minutes: number, isDraft: boolean) => {
    const next = toDatetimeLocal(new Date(Date.now() + minutes * 60 * 1000))
    if (isDraft) {
      const draft = useScratchStore.getState().drafts[targetId]
      if (draft) updateDraft(targetId, { reminder: { ...draft.reminder, enabled: true, datetime: next } })
    } else {
      const memo = useMemoStore.getState().memos.find((m) => m.id === targetId)
      if (memo) updateMemo(targetId, { reminder: { ...memo.reminder, enabled: true, datetime: next } })
    }
    dismiss(alertId)
  }

  /** 스크래치 초안의 알림을 눌렀을 때 그 초안을 볼 수 있는 곳으로 이동합니다. */
  const openDraft = (draftId: string) => {
    if (draftId === MAIN_SCRATCH_ID) {
      select(null) // 메인 화면을 스크래치패드로 되돌립니다.
    } else {
      openScratchPopup(draftId, { ...DEFAULT_POPUP })
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[300] flex w-80 flex-col gap-2">
      {alerts.map((a) => {
        const memo = memos.find((m) => m.id === a.memoId)
        const draft = !memo ? drafts[a.memoId] : undefined
        if (!memo && !draft) return null

        const title = memo
          ? displayTitle(memo)
          : draft!.title.trim() || stripHtml(draft!.content).split('\n')[0].trim() || '새 메모'
        const preview = memo
          ? previewText(memo)
          : draft!.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

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
                  onClick={() => {
                    if (memo) select(memo.id)
                    else openDraft(a.memoId)
                    dismiss(a.id)
                  }}
                >
                  {title}
                  {draft && <span className="ml-1.5 text-xs font-normal text-faint">· 저장 전 메모</span>}
                </button>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                  {preview || '알림 시각이 되었습니다'}
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
                  onClick={() => snooze(a.id, a.memoId, o.minutes, !memo)}
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
