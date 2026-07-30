import { Check } from 'lucide-react'
import type { LabelKey } from '@/types'
import { LABELS } from '@/lib/constants'
import { ICON } from './Button'

// ============================================================
// 컬러 라벨 선택기
//  긴급 / 오늘 / 진행 중 / 완료 / 업무 / 개인
// ============================================================

interface Props {
  value: LabelKey | null | undefined
  onChange: (label: LabelKey | null) => void
  /** 가로 한 줄로 점만 표시 (메뉴 안에서 사용) */
  compact?: boolean
}

export function LabelPicker({ value, onChange, compact }: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        {LABELS.map((l) => (
          <button
            key={l.key}
            title={l.name}
            onClick={() => onChange(value === l.key ? null : l.key)}
            className="flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110"
          >
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full"
              style={{ background: l.color }}
            >
              {value === l.key && <Check size={ICON.xs} className="text-white" strokeWidth={3} />}
            </span>
          </button>
        ))}
        <button
          title="라벨 없음"
          onClick={() => onChange(null)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-faint transition-transform hover:scale-110"
        >
          <span className="h-4 w-4 rounded-full border border-dashed border-line-strong" />
        </button>
      </div>
    )
  }

  return (
    <div className="w-40">
      {LABELS.map((l) => (
        <button
          key={l.key}
          onClick={() => onChange(value === l.key ? null : l.key)}
          className="ui-menu-item"
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l.color }} />
          <span className="flex-1 text-left">{l.name}</span>
          {value === l.key && <Check size={ICON.sm} className="text-accent" />}
        </button>
      ))}
      <button onClick={() => onChange(null)} className="ui-menu-item text-muted">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-dashed border-line-strong" />
        <span className="flex-1 text-left">라벨 없음</span>
      </button>
    </div>
  )
}
