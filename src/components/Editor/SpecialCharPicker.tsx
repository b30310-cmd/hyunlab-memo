import { SPECIAL_CHARS } from '@/lib/constants'

// 특수문자 선택 패널. 문자를 클릭하면 onPick으로 전달합니다.
export function SpecialCharPicker({ onPick }: { onPick: (char: string) => void }) {
  return (
    <div className="max-h-80 w-60 overflow-y-auto">
      {SPECIAL_CHARS.map((cat) => (
        <div key={cat.name} className="mb-1">
          <div className="px-1 pb-1 pt-2 text-xs font-medium text-faint">{cat.name}</div>
          <div className="grid grid-cols-6 gap-0.5">
            {cat.chars.map((ch, i) => (
              <button
                key={cat.name + i}
                // mousedown으로 처리해야 에디터 선택이 유지됩니다.
                onMouseDown={(e) => {
                  e.preventDefault()
                  onPick(ch)
                }}
                title={ch}
                className="flex h-8 items-center justify-center rounded-sm text-md text-body transition-colors hover:bg-[var(--hover)]"
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
