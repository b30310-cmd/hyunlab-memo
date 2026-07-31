import { useEffect, useRef, useState, type ReactNode } from 'react'

// ============================================================
// 팝오버 (버튼을 누르면 아래에 떠오르는 작은 패널)
//  - 바깥 클릭 / ESC 로 닫힙니다.
//  - 화면(창) 밖으로 넘치면 위/아래·좌/우를 자동으로 뒤집고, 그래도 창보다
//    패널이 크면(팝업 메모처럼 작은 창) 창 안에 들어오도록 크기를 줄입니다.
//    position: fixed를 써서, 조상에 overflow-hidden이 있어도(팝업 메모 창의
//    바깥 테두리) 화면 밖으로 밀려나거나 잘리지 않고 항상 창 안에 보입니다.
// ============================================================

interface Props {
  trigger: (open: boolean) => ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: 'left' | 'right'
  className?: string
  /**
   * 열 때 지금 선택된 텍스트(브라우저 Selection)를 유지합니다.
   * 서식 도구(글자색·형광펜·글자 크기 등)처럼 "지금 선택한 글자에 적용"해야 하는
   * 팝오버에서 켜 두세요. 켜지 않으면 버튼을 누르는 순간 에디터가 포커스를 잃어
   * 선택 영역이 풀려버립니다(mousedown 시점에 브라우저가 포커스를 옮기기 때문).
   */
  preserveSelection?: boolean
}

const EDGE_PAD = 8

export function Popover({ trigger, children, align = 'left', className = '', preserveSelection = false }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; maxWidth: number; maxHeight: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // 트리거 기준으로 패널 위치를 잡되, 창(팝업 메모는 작을 수 있음) 안에
  // 들어오도록 위/아래·좌/우를 뒤집고 최대 크기를 창 크기에 맞춰 줄입니다.
  useEffect(() => {
    if (!open || !triggerRef.current) return

    const place = () => {
      const t = triggerRef.current?.getBoundingClientRect()
      if (!t) return
      const panelW = panelRef.current?.offsetWidth ?? 0
      const panelH = panelRef.current?.offsetHeight ?? 0

      const spaceBelow = window.innerHeight - t.bottom
      const spaceAbove = t.top
      const flipUp = spaceBelow < panelH + EDGE_PAD && spaceAbove > spaceBelow
      const top = flipUp ? Math.max(EDGE_PAD, t.top - panelH - 4) : t.bottom + 4

      const preferredLeft = align === 'right' ? t.right - panelW : t.left
      const left = Math.min(
        Math.max(preferredLeft, EDGE_PAD),
        window.innerWidth - panelW - EDGE_PAD,
      )

      setPos({
        top,
        left: Math.max(left, EDGE_PAD),
        maxWidth: window.innerWidth - EDGE_PAD * 2,
        maxHeight: (flipUp ? t.top - EDGE_PAD * 2 : window.innerHeight - t.bottom - EDGE_PAD * 2),
      })
    }

    // 먼저 대략적인 위치로 그린 뒤(패널 실제 크기를 알아야 하므로), 크기를 잰 다음 다시 맞춥니다.
    place()
    const raf = requestAnimationFrame(place)
    window.addEventListener('resize', place)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
    }
  }, [open, align])

  return (
    // no-drag: Electron 프레임리스 창(팝업 메모)의 드래그 영역 안에서 열릴 수도 있으므로,
    // 트리거와 패널 모두 드래그 영역에서 제외해 클릭이 항상 먹히게 합니다.
    <div ref={rootRef} className="relative inline-flex no-drag">
      <div
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        onMouseDown={preserveSelection ? (e) => e.preventDefault() : undefined}
        className="inline-flex"
      >
        {trigger(open)}
      </div>
      {open && (
        <div
          ref={panelRef}
          className={`ui-panel animate-pop no-drag fixed z-50 max-w-full overflow-auto ${className}`}
          style={{
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            visibility: pos ? 'visible' : 'hidden',
            maxWidth: pos?.maxWidth,
            maxHeight: pos?.maxHeight,
          }}
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  )
}
