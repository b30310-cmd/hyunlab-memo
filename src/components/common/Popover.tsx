import { useEffect, useRef, useState, type ReactNode } from 'react'

// ============================================================
// 팝오버 (버튼을 누르면 아래에 떠오르는 작은 패널)
//  - 바깥 클릭 / ESC 로 닫힙니다.
//  - 화면 밖으로 넘치면 위쪽이나 반대편으로 자동으로 뒤집힙니다.
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

export function Popover({ trigger, children, align = 'left', className = '', preserveSelection = false }: Props) {
  const [open, setOpen] = useState(false)
  const [flipUp, setFlipUp] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
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

  // 아래쪽 공간이 부족하면 위로 펼칩니다.
  useEffect(() => {
    if (!open || !panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    setFlipUp(rect.bottom > window.innerHeight - 8 && rect.top > rect.height)
  }, [open])

  return (
    <div ref={rootRef} className="relative inline-flex">
      <div
        onClick={() => setOpen((o) => !o)}
        onMouseDown={preserveSelection ? (e) => e.preventDefault() : undefined}
        className="inline-flex"
      >
        {trigger(open)}
      </div>
      {open && (
        <div
          ref={panelRef}
          className={`ui-panel animate-pop absolute z-50 ${
            flipUp ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${align === 'right' ? 'right-0' : 'left-0'} ${className}`}
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  )
}
