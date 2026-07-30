import { useEffect, useRef, useState, type ReactNode } from 'react'

// ============================================================
// 우클릭 메뉴 (Context Menu)
//
//  목록에서 메모를 우클릭하면 그 메모에 필요한 동작만 보여줍니다.
//  화면 밖으로 넘치지 않도록 위치를 자동으로 보정합니다.
// ============================================================

export interface ContextMenuState {
  x: number
  y: number
  /** 메뉴를 띄운 대상 (메모 id 등) */
  targetId: string
}

interface Props {
  state: ContextMenuState | null
  onClose: () => void
  children: (close: () => void) => ReactNode
}

export function ContextMenu({ state, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  // 메뉴가 화면 밖으로 나가지 않도록 위치 보정
  useEffect(() => {
    if (!state || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const pad = 8
    setPos({
      x: Math.min(state.x, window.innerWidth - rect.width - pad),
      y: Math.min(state.y, window.innerHeight - rect.height - pad),
    })
  }, [state])

  useEffect(() => {
    if (!state) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    // 스크롤하면 닫습니다 (메뉴가 대상과 떨어지지 않도록)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onClose, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [state, onClose])

  if (!state) return null

  return (
    <div
      ref={ref}
      className="ui-panel animate-pop fixed z-[200] min-w-[12rem]"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children(onClose)}
    </div>
  )
}
