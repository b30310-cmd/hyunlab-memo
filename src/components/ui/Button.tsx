import type { ButtonHTMLAttributes, ReactNode } from 'react'

// ============================================================
// 공용 버튼
//
// 앱의 모든 버튼은 이 컴포넌트를 씁니다.
// 높이·여백·둥글기·hover·클릭 효과가 한 곳에서 정해지므로
// 화면마다 버튼이 달라 보이는 일이 없습니다.
//
// 아이콘 크기도 여기서 정합니다 → ICON.sm / ICON.md / ICON.lg
// ============================================================

/**
 * 앱 전체에서 쓰는 아이콘 크기 (Lucide 기준).
 * 이 4단계 외의 크기는 쓰지 않습니다.
 *   xs — 카드 안의 상태 표시(고정·즐겨찾기 등)
 *   sm — 칩, 좁은 툴바
 *   md — 일반 버튼, 메뉴
 *   lg — 상단 툴바, 헤더
 */
export const ICON = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
} as const

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** 선택된 상태 (토글 버튼용) */
  active?: boolean
  children?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  // 주요 동작 — 강조색 채움
  primary: 'text-white shadow-sm hover:brightness-110',
  // 보조 동작 — 테두리만
  secondary: 'border border-line bg-surface text-body hover:bg-[var(--hover)]',
  // 배경 없음 — 툴바 등
  ghost: 'text-muted hover:bg-[var(--hover)] hover:text-body',
  danger: 'text-red-500 hover:bg-red-500/10',
}

const SIZES: Record<Size, string> = {
  sm: 'h-[var(--h-sm)] px-2 text-sm',
  md: 'h-[var(--h-md)] px-3 text-base',
  lg: 'h-[var(--h-lg)] px-4 text-md',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  active,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={`ui-btn ${SIZES[size]} ${VARIANTS[variant]} ${
        active ? 'bg-accent-soft !text-accent' : ''
      } ${className}`}
      style={{
        ...(variant === 'primary' ? { background: 'var(--accent)' } : {}),
        ...rest.style,
      }}
    >
      {children}
    </button>
  )
}

// ------------------------------------------------------------
// 정사각 아이콘 버튼
// ------------------------------------------------------------

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 마우스를 올리면 뜨는 설명 (접근성상 필수) */
  title: string
  active?: boolean
  size?: Size
  children: ReactNode
}

const ICON_SIZES: Record<Size, string> = {
  sm: 'w-[var(--h-sm)] h-[var(--h-sm)]',
  md: 'w-[var(--h-md)] h-[var(--h-md)]',
  lg: 'w-[var(--h-lg)] h-[var(--h-lg)]',
}

export function IconButton({
  title,
  active,
  size = 'md',
  className = '',
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`ui-icon-btn ${ICON_SIZES[size]} ${
        active ? 'bg-accent-soft !text-accent' : ''
      } ${className}`}
    >
      {children}
    </button>
  )
}

// ------------------------------------------------------------
// 메뉴 항목 (더보기 메뉴 등에서 사용)
// ------------------------------------------------------------

interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode
  /** 오른쪽 끝에 표시할 것 (단축키, 체크 표시 등) */
  trailing?: ReactNode
  danger?: boolean
  children: ReactNode
}

export function MenuItem({ icon, trailing, danger, className = '', children, ...rest }: MenuItemProps) {
  return (
    <button
      {...rest}
      className={`ui-menu-item ${danger ? '!text-red-500' : ''} ${className}`}
    >
      {icon && <span className="flex w-4 shrink-0 justify-center text-muted">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing && <span className="shrink-0 text-xs text-faint">{trailing}</span>}
    </button>
  )
}

/** 메뉴 안의 구분선 */
export function MenuDivider() {
  return <div className="my-1 h-px bg-line" />
}

/** 메뉴 안의 소제목 */
export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2 pb-1 pt-2 text-xs font-medium text-faint">{children}</div>
}
