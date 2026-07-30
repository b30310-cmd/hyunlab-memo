import type { Memo, RepeatType } from '@/types'
import { useMemoStore } from '@/store/useMemoStore'

// ============================================================
// 알림 설정 패널
// ============================================================

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: 'none', label: '반복 없음' },
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'monthly', label: '매월' },
]

interface Props {
  memo: Memo
  /** 기본은 메모 저장소에 저장하지만, 스크래치패드처럼 다른 곳에 저장해야 하면 재정의합니다. */
  onUpdate?: (patch: Partial<Memo>) => void
}

export function ReminderEditor({ memo, onUpdate }: Props) {
  const updateMemo = useMemoStore((s) => s.updateMemo)
  const { reminder } = memo

  const patch = (p: Partial<Memo['reminder']>) => {
    const next = { reminder: { ...reminder, ...p } }
    if (onUpdate) onUpdate(next)
    else updateMemo(memo.id, next)
  }

  return (
    <div className="w-56">
      <label className="flex h-[var(--h-md)] items-center justify-between px-1 text-base">
        <span>알림 사용</span>
        <button
          onClick={() => patch({ enabled: !reminder.enabled })}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
            reminder.enabled ? 'bg-accent' : 'bg-line-strong'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              reminder.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </label>

      <div className="px-1 pb-1.5 pt-3 text-xs font-medium text-faint">날짜 / 시간</div>
      <input
        type="datetime-local"
        value={reminder.datetime}
        onChange={(e) => patch({ datetime: e.target.value, enabled: true })}
        className="ui-input"
      />

      <div className="px-1 pb-1.5 pt-3 text-xs font-medium text-faint">반복</div>
      <div className="grid grid-cols-2 gap-1">
        {REPEAT_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => patch({ repeat: o.value })}
            className={`flex h-[var(--h-sm)] items-center justify-center rounded-sm text-sm transition-colors ${
              reminder.repeat === o.value ? 'bg-accent text-white' : 'bg-surface-2 text-muted hover:text-body'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {reminder.enabled && reminder.datetime && (
        <p className="px-1 pt-3 text-xs leading-relaxed text-faint">
          {new Date(reminder.datetime).toLocaleString('ko-KR')}에 알림이 표시됩니다.
        </p>
      )}
    </div>
  )
}
