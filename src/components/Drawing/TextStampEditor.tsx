import { useEffect, useRef, useState } from 'react'
import { Check, X, Smile, Star, Laugh } from 'lucide-react'
import { Popover } from '@/components/common/Popover'
import { IconButton, ICON } from '@/components/ui/Button'
import { EmojiPicker } from '@/components/Editor/EmojiPicker'
import { SpecialCharPicker } from '@/components/Editor/SpecialCharPicker'
import { KaomojiPicker } from '@/components/Editor/KaomojiPicker'

// ============================================================
// 그림(주석) 위에 글자·이모지·특수문자를 찍어 넣는 작은 입력 패널.
//  DrawingLayer에서 '텍스트' 도구로 캔버스를 클릭하면 그 자리에 뜹니다.
//  키보드로 직접 타이핑하거나, 기존 이모지/특수문자/카오모지 선택기에서
//  골라 커서 위치에 끼워 넣을 수 있습니다.
// ============================================================

interface Props {
  x: number
  y: number
  /** 있으면 새로 찍는 게 아니라 이미 놓인 텍스트를 고쳐 쓰는 것 — 입력창에 미리 채워 둡니다. */
  initialValue?: string
  onConfirm: (text: string) => void
  onCancel: () => void
}

const EDGE_PAD = 8

export function TextStampEditor({ x, y, initialValue, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState(initialValue ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // 팝업 메모처럼 작은 창에서도 패널이 화면 밖으로 잘리지 않도록, 실제로
  // 렌더된 크기를 잰 뒤(Popover.tsx와 같은 방식) 위치를 다시 계산합니다.
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const [maxSize] = useState(() => ({
    maxWidth: window.innerWidth - EDGE_PAD * 2,
    maxHeight: window.innerHeight - EDGE_PAD * 2,
  }))

  useEffect(() => {
    // offsetWidth/Height는 위의 maxWidth/maxHeight 제약이 이미 적용된 뒤의
    // 실제 렌더 크기이므로(작은 창이면 그만큼 줄어든 값), 이걸로 위치를
    // 잡아야 오른쪽/아래로 넘치지 않습니다.
    const place = () => {
      const w = panelRef.current?.offsetWidth ?? 256
      const h = panelRef.current?.offsetHeight ?? 96
      setPos({
        left: Math.max(EDGE_PAD, Math.min(x, window.innerWidth - w - EDGE_PAD)),
        top: Math.max(EDGE_PAD, Math.min(y, window.innerHeight - h - EDGE_PAD)),
      })
    }
    place()
    const raf = requestAnimationFrame(place)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y])

  const insertAtCursor = (text: string) => {
    const el = inputRef.current
    if (!el) return
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const next = value.slice(0, start) + text + value.slice(end)
    setValue(next)
    // 다음 렌더 이후 커서를 삽입한 글자 뒤로 되돌립니다.
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + text.length
      el.setSelectionRange(pos, pos)
    })
  }

  const confirm = () => {
    if (value.trim()) onConfirm(value)
    else onCancel()
  }

  return (
    <div
      ref={panelRef}
      // pointer-events-auto: 이 패널은 DrawingLayer의 pointer-events-none인
      // 바깥 래퍼 안에 렌더되므로, 명시적으로 켜 주지 않으면 눈에는 보여도
      // 클릭이 전부 아래 캔버스로 새어 나갑니다.
      className="ui-panel animate-pop no-drag pointer-events-auto fixed z-50 flex w-64 flex-col gap-1.5 overflow-auto"
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
        maxWidth: maxSize.maxWidth,
        maxHeight: maxSize.maxHeight,
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            confirm()
          }
        }}
        placeholder="글자나 이모지를 입력하세요"
        className="ui-input !text-md"
      />
      <div className="flex items-center gap-0.5">
        <Popover
          trigger={() => (
            <IconButton title="이모지" size="sm">
              <Smile size={ICON.md} />
            </IconButton>
          )}
        >
          {() => <EmojiPicker onPick={insertAtCursor} />}
        </Popover>
        <Popover
          trigger={() => (
            <IconButton title="특수문자" size="sm">
              <Star size={ICON.md} />
            </IconButton>
          )}
        >
          {() => <SpecialCharPicker onPick={insertAtCursor} />}
        </Popover>
        <Popover
          trigger={() => (
            <IconButton title="특수 이모티콘" size="sm">
              <Laugh size={ICON.md} />
            </IconButton>
          )}
        >
          {() => <KaomojiPicker onPick={insertAtCursor} />}
        </Popover>

        <div className="flex-1" />

        <IconButton title="취소" size="sm" onClick={onCancel}>
          <X size={ICON.md} />
        </IconButton>
        <IconButton title="넣기" size="sm" onClick={confirm} disabled={!value.trim()}>
          <Check size={ICON.md} />
        </IconButton>
      </div>
    </div>
  )
}
