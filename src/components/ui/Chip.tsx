import type { ReactNode } from 'react'

// ============================================================
// 도구를 펼치는 칩 버튼 (서식·꾸미기·그리기·알림·태그 등)
//  메인 에디터와 팝업 메모가 똑같은 모양으로 씁니다.
// ============================================================

export function Chip({
  children, active, onClick, disabled, title,
}: {
  children: ReactNode
  active: boolean
  onClick?: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-[var(--h-sm)] items-center gap-1.5 rounded-full border px-3 text-sm transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'border-transparent bg-accent text-white'
          : 'border-line bg-surface/70 text-muted hover:border-line-strong hover:text-body'
      }`}
    >
      {children}
    </button>
  )
}
