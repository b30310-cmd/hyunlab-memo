import { ChevronLeft } from 'lucide-react'
import { useMemoStore } from '@/store/useMemoStore'
import { stripHtml, friendlyDate } from '@/lib/filter'
import { ICON } from '@/components/ui/Button'

// ============================================================
// 메모 기록 복원
//  입력이 2초간 멈출 때마다 스냅샷이 자동으로 쌓입니다.
// ============================================================

interface Props {
  memoId: string
  onBack: () => void
  onDone: () => void
}

export function HistoryPanel({ memoId, onBack, onDone }: Props) {
  const history = useMemoStore((s) => s.history.filter((h) => h.memoId === memoId))
  const restoreHistory = useMemoStore((s) => s.restoreHistory)

  return (
    <div className="w-56">
      <button
        onClick={onBack}
        className="mb-1 flex h-[var(--h-md)] w-full items-center gap-1.5 border-b border-line px-2 text-base font-medium text-body"
      >
        <ChevronLeft size={ICON.md} className="text-muted" />
        이전 내용 복원
      </button>

      {history.length === 0 ? (
        <p className="px-2 py-4 text-xs leading-relaxed text-faint">
          아직 저장된 기록이 없습니다.
          <br />
          메모를 수정하면 자동으로 쌓입니다.
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          {history.map((h) => (
            <button
              key={h.savedAt}
              onClick={() => {
                if (confirm('이 시점의 내용으로 되돌릴까요?\n(현재 내용도 기록에 남아 있습니다)')) {
                  restoreHistory(h)
                  onDone()
                }
              }}
              className="w-full rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-[var(--hover)]"
            >
              <div className="text-xs text-faint">{friendlyDate(h.savedAt)}</div>
              <div className="truncate text-sm text-muted">
                {stripHtml(h.content).slice(0, 40) || '(빈 내용)'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
