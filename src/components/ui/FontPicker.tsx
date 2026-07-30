import { useMemo, useState } from 'react'
import { Search, Star } from 'lucide-react'
import { FONTS, FONT_CATEGORIES, type FontOption } from '@/lib/constants'
import { useRecentFavorite } from '@/hooks/useRecentFavorite'
import { ICON } from './Button'

// ============================================================
// 글꼴 선택기 — 카테고리 탭 / 검색 / 최근 사용 / 즐겨찾기 / 실시간 미리보기
//  '꾸미기'의 제목·본문 글꼴, 서식 툴바의 선택 영역 글꼴에서 공용으로 씁니다.
// ============================================================

const PREVIEW_TEXT = '안녕하세요. HYUNLAB Memo입니다.'

type Tab = 'all' | 'fav' | 'recent' | FontOption['category']

interface Props {
  /** 지금 선택되어 있는 글꼴 키 (강조 표시용, 선택 사항) */
  value?: string
  onPick: (font: FontOption) => void
}

export function FontPicker({ value, onPick }: Props) {
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const { recent, favorites, markUsed, toggleFavorite } = useRecentFavorite('fonts', 8)

  const handlePick = (f: FontOption) => {
    onPick(f)
    markUsed(f.key)
  }

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q) return FONTS.filter((f) => f.name.toLowerCase().includes(q))
    if (tab === 'fav') return FONTS.filter((f) => favorites.includes(f.key))
    if (tab === 'recent') return FONTS.filter((f) => recent.includes(f.key))
    if (tab === 'all') return FONTS
    return FONTS.filter((f) => f.category === tab)
  }, [query, tab, favorites, recent])

  return (
    <div className="w-full min-w-[224px] max-w-[256px]">
      <div className="relative">
        <Search size={ICON.sm} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="글꼴 검색"
          className="ui-input !h-[var(--h-sm)] !pl-7 !text-sm"
        />
      </div>

      {!query && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          <CategoryChip active={tab === 'all'} onClick={() => setTab('all')}>
            전체
          </CategoryChip>
          <CategoryChip active={tab === 'fav'} onClick={() => setTab('fav')}>
            ⭐ 즐겨찾기
          </CategoryChip>
          <CategoryChip active={tab === 'recent'} onClick={() => setTab('recent')}>
            🕒 최근 사용
          </CategoryChip>
          {FONT_CATEGORIES.map((c) => (
            <CategoryChip key={c.key} active={tab === c.key} onClick={() => setTab(c.key)}>
              {c.icon} {c.name}
            </CategoryChip>
          ))}
        </div>
      )}

      <div className="mt-1.5 max-h-56 overflow-y-auto">
        {list.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs leading-relaxed text-faint">
            {tab === 'fav' && '즐겨찾기한 글꼴이 없습니다'}
            {tab === 'recent' && '최근 사용한 글꼴이 없습니다'}
            {tab !== 'fav' && tab !== 'recent' && '검색 결과가 없습니다'}
          </p>
        ) : (
          list.map((f) => (
            <div
              key={f.key}
              className={`group flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--hover)] ${
                value === f.key ? 'bg-accent-soft' : ''
              }`}
            >
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  handlePick(f)
                }}
                className="min-w-0 flex-1 text-left"
              >
                <div className="text-xs text-faint">{f.name}</div>
                <div className="truncate text-base text-body" style={{ fontFamily: f.stack }}>
                  {PREVIEW_TEXT}
                </div>
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  toggleFavorite(f.key)
                }}
                title={favorites.includes(f.key) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                className="shrink-0 text-faint transition-opacity hover:text-accent md:opacity-0 md:group-hover:opacity-100"
              >
                <Star size={ICON.sm} className={favorites.includes(f.key) ? 'fill-current text-accent opacity-100' : ''} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CategoryChip({
  children, active, onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs transition-colors ${
        active ? 'bg-accent text-white' : 'bg-surface-2 text-muted hover:text-body'
      }`}
    >
      {children}
    </button>
  )
}
