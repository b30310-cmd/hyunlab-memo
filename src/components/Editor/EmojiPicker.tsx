import { useMemo, useState } from 'react'
import { EMOJIS } from '@/lib/constants'
import { useRecentFavorite } from '@/hooks/useRecentFavorite'

// ============================================================
// 이모지 선택기 — 검색 / 최근 사용 / 즐겨찾기(우클릭)
//  (최근 사용/즐겨찾기는 글꼴·특수 이모티콘 피커와 같은 공용 훅을 씁니다)
// ============================================================

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [tab, setTab] = useState<string>(EMOJIS[0].name)
  const [query, setQuery] = useState('')
  const { recent, favorites, markUsed, toggleFavorite } = useRecentFavorite('emojis', 16)

  const searchResults = useMemo(() => {
    if (!query.trim()) return null
    const q = query.trim().toLowerCase()
    const matchedCats = EMOJIS.filter((c) => c.name.toLowerCase().includes(q))
    if (matchedCats.length) return matchedCats.flatMap((c) => c.emojis)
    return EMOJIS.flatMap((c) => c.emojis).filter((e) => e.includes(query))
  }, [query])

  const handlePick = (emoji: string) => {
    onPick(emoji)
    markUsed(emoji)
  }

  const activeCategory = EMOJIS.find((c) => c.name === tab)
  const gridEmojis = searchResults ?? activeCategory?.emojis ?? []

  return (
    <div className="w-[272px]">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이모지 검색"
        className="ui-input !h-[var(--h-sm)] !text-sm"
      />

      {favorites.length > 0 && !searchResults && (
        <>
          <SectionLabel>즐겨찾기</SectionLabel>
          <div className="grid grid-cols-8 gap-0.5">
            {favorites.map((e, i) => (
              <EmojiButton key={'fav' + i} emoji={e} onPick={handlePick} onFav={toggleFavorite} isFav />
            ))}
          </div>
        </>
      )}

      {recent.length > 0 && !searchResults && (
        <>
          <SectionLabel>최근 사용</SectionLabel>
          <div className="grid grid-cols-8 gap-0.5">
            {recent.map((e, i) => (
              <EmojiButton
                key={'recent' + i}
                emoji={e}
                onPick={handlePick}
                onFav={toggleFavorite}
                isFav={favorites.includes(e)}
              />
            ))}
          </div>
        </>
      )}

      <SectionLabel>{searchResults ? '검색 결과' : tab}</SectionLabel>
      <div className="grid max-h-40 grid-cols-8 gap-0.5 overflow-y-auto">
        {gridEmojis.map((e, i) => (
          <EmojiButton key={i} emoji={e} onPick={handlePick} onFav={toggleFavorite} isFav={favorites.includes(e)} />
        ))}
      </div>

      {!searchResults && (
        <div className="mt-2 flex justify-around border-t border-line pt-2">
          {EMOJIS.map((c) => (
            <button
              key={c.name}
              onMouseDown={(ev) => {
                ev.preventDefault()
                setTab(c.name)
              }}
              title={c.name}
              className={`flex h-7 w-7 items-center justify-center rounded-sm text-md transition-colors ${
                tab === c.name ? 'bg-accent-soft' : 'hover:bg-[var(--hover)]'
              }`}
            >
              {c.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-1 pb-1 pt-2 text-xs font-medium text-faint">{children}</div>
}

function EmojiButton({
  emoji, onPick, onFav, isFav,
}: {
  emoji: string
  onPick: (e: string) => void
  onFav: (e: string) => void
  isFav: boolean
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        onPick(emoji)
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        onFav(emoji)
      }}
      title={isFav ? '우클릭: 즐겨찾기 해제' : '우클릭: 즐겨찾기 추가'}
      className="flex h-8 items-center justify-center rounded-sm text-md transition-transform hover:scale-125 hover:bg-[var(--hover)]"
    >
      {emoji}
    </button>
  )
}
