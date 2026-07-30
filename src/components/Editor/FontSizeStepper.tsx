import { useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Popover } from '@/components/common/Popover'
import { IconButton, ICON } from '@/components/ui/Button'

// ============================================================
// 글자 크기 [-] [ 14 ] [+]
//  - 1~100 사이 숫자를 직접 입력하거나(Enter로 적용), +/-·↑/↓로 1씩 조절합니다.
//  - 입력창을 누르면 자주 쓰는 크기 드롭다운이 뜹니다.
//  - 선택한 글자가 있으면 그 글자에만, 없으면 이후 입력할 글자에 적용됩니다
//    (실제 적용 로직은 lib/richtext.ts의 setFontSize가 담당합니다).
// ============================================================

const MIN = 1
const MAX = 100
const QUICK_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32]

const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n))

interface Props {
  /** 처음 보여줄 값 (메모의 현재 기본 글자 크기) */
  value: number
  /** 실제로 크기를 적용할 때 호출 (rt.setFontSize 등을 여기서 실행) */
  onApply: (px: number) => void
}

export function FontSizeStepper({ value, onApply }: Props) {
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  /** 입력값을 검증해서 적용합니다. 숫자가 아니면 이전 값으로 되돌립니다. */
  const commit = (raw: string) => {
    const n = Number(raw)
    if (raw.trim() === '' || !Number.isFinite(n)) {
      setDraft(String(value))
      return
    }
    const clamped = clamp(Math.round(n))
    setDraft(String(clamped))
    onApply(clamped)
  }

  const step = (delta: number) => {
    const current = Number(draft)
    const base = Number.isFinite(current) && draft.trim() !== '' ? current : value
    const next = clamp(base + delta)
    setDraft(String(next))
    onApply(next)
  }

  return (
    <div className="flex items-center gap-0.5">
      <IconButton
        title="글자 크기 줄이기 (1씩)"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); step(-1) }}
      >
        <Minus size={ICON.sm} />
      </IconButton>

      <Popover
        trigger={() => (
          <input
            ref={inputRef}
            value={draft}
            title="글자 크기 (1~100)"
            inputMode="numeric"
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commit(draft)
                inputRef.current?.blur()
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                step(1)
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                step(-1)
              }
            }}
            onBlur={() => commit(draft)}
            className="ui-input !h-[var(--h-sm)] !w-11 !px-1 text-center !text-sm"
          />
        )}
      >
        {(close) => (
          <div className="grid w-32 grid-cols-3 gap-1">
            {QUICK_SIZES.map((size) => (
              <button
                key={size}
                onMouseDown={(e) => {
                  e.preventDefault()
                  setDraft(String(size))
                  onApply(size)
                  close()
                }}
                className="flex h-7 items-center justify-center rounded-sm text-sm text-muted transition-colors hover:bg-[var(--hover)] hover:text-body"
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </Popover>

      <IconButton
        title="글자 크기 키우기 (1씩)"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); step(1) }}
      >
        <Plus size={ICON.sm} />
      </IconButton>
    </div>
  )
}
