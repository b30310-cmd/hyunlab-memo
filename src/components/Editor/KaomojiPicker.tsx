import { useMemo, useState } from 'react'
import { Search, X, Plus } from 'lucide-react'
import { KAOMOJIS } from '@/lib/constants'
import { useRecentFavorite } from '@/hooks/useRecentFavorite'
import { ICON } from '@/components/ui/Button'

// ============================================================
// 특수 이모티콘(카오모지) 선택기
//  - 기본 제공 목록 + 사용자가 직접 추가한 목록을 함께 보여줍니다.
//  - 클릭하면 바로 삽입, 우클릭하면 즐겨찾기 토글, 직접 추가한 것은 x로 삭제.
//  - 검색 / 최근 사용 / 즐겨찾기는 글꼴·이모지 피커와 같은 공용 훅을 씁니다.
// ============================================================

const CUSTOM_KEY = 'hyunlab-memo:custom-kaomoji'

function loadCustom(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]')
  } catch {
    return []
  }
}
const saveCustom = (list: string[]) => localStorage.setItem(CUSTOM_KEY, JSON.stringify(list))

export function KaomojiPicker({ onPick }: { onPick: (text: string) => void }) {
  const { recent, favorites, markUsed, toggleFavorite } = useRecentFavorite('kaomoji')
  const [custom, setCustom] = useState<string[]>(() => loadCustom())
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')

  const all = useMemo(() => [...custom, ...KAOMOJIS], [custom])
  const searchResults = useMemo(() => {
    const q = query.trim()
    if (!q) return null
    return all.filter((k) => k.includes(q))
  }, [query, all])

  const handlePick = (text: string) => {
    onPick(text)
    markUsed(text)
  }

  const addCustom = () => {
    const clean = draft.trim()
    if (!clean || custom.includes(clean) || KAOMOJIS.includes(clean)) return
    const next = [clean, ...custom].slice(0, 40)
    setCustom(next)
    saveCustom(next)
    setDraft('')
  }

  const removeCustom = (text: string) => {
    const next = custom.filter((t) => t !== text)
    setCustom(next)
    saveCustom(next)
  }

  return (
    <div className="w-64">
      <div className="flex gap-1">
        <div className="relative flex-1">
          <Search size={ICON.sm} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이모티콘 검색"
            className="ui-input !h-[var(--h-sm)] !pl-7 !text-sm"
          />
        </div>
      </div>

      <div className="mt-1.5 flex gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
          placeholder="직접 추가할 이모티콘 입력"
          className="ui-input !h-[var(--h-sm)] !text-sm"
        />
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            addCustom()
          }}
          title="추가"
          className="ui-icon-btn h-[var(--h-sm)] w-[var(--h-sm)] shrink-0"
        >
          <Plus size={ICON.sm} />
        </button>
      </div>

      {searchResults ? (
        <>
          <SectionLabel>검색 결과</SectionLabel>
          {searchResults.length === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-faint">검색 결과가 없습니다</p>
          ) : (
            <div className="grid grid-cols-4 gap-1">
              {searchResults.map((k, i) => (
                <KaomojiButton
                  key={'search' + i}
                  text={k}
                  onPick={handlePick}
                  onFav={toggleFavorite}
                  isFav={favorites.includes(k)}
                  onRemove={custom.includes(k) ? removeCustom : undefined}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {favorites.length > 0 && (
            <>
              <SectionLabel>즐겨찾기</SectionLabel>
              <div className="grid grid-cols-4 gap-1">
                {favorites.map((k, i) => (
                  <KaomojiButton key={'fav' + i} text={k} onPick={handlePick} onFav={toggleFavorite} isFav />
                ))}
              </div>
            </>
          )}

          {recent.length > 0 && (
            <>
              <SectionLabel>최근 사용</SectionLabel>
              <div className="grid grid-cols-4 gap-1">
                {recent.map((k, i) => (
                  <KaomojiButton
                    key={'recent' + i}
                    text={k}
                    onPick={handlePick}
                    onFav={toggleFavorite}
                    isFav={favorites.includes(k)}
                  />
                ))}
              </div>
            </>
          )}

          {custom.length > 0 && (
            <>
              <SectionLabel>내가 추가한 이모티콘</SectionLabel>
              <div className="grid grid-cols-4 gap-1">
                {custom.map((k, i) => (
                  <KaomojiButton
                    key={'custom' + i}
                    text={k}
                    onPick={handlePick}
                    onFav={toggleFavorite}
                    isFav={favorites.includes(k)}
                    onRemove={removeCustom}
                  />
                ))}
              </div>
            </>
          )}

          <SectionLabel>기본 목록</SectionLabel>
          <div className="grid max-h-40 grid-cols-4 gap-1 overflow-y-auto">
            {KAOMOJIS.map((k, i) => (
              <KaomojiButton key={i} text={k} onPick={handlePick} onFav={toggleFavorite} isFav={favorites.includes(k)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-1 pb-1 pt-2 text-xs font-medium text-faint">{children}</div>
}

function KaomojiButton({
  text, onPick, onFav, isFav, onRemove,
}: {
  text: string
  onPick: (t: string) => void
  onFav: (t: string) => void
  isFav: boolean
  onRemove?: (t: string) => void
}) {
  return (
    <div className="group relative">
      <button
        onMouseDown={(e) => {
          e.preventDefault()
          onPick(text)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          onFav(text)
        }}
        title={isFav ? '우클릭: 즐겨찾기 해제' : '우클릭: 즐겨찾기 추가'}
        className={`flex h-8 w-full items-center justify-center rounded-sm px-1 text-sm transition-colors hover:bg-[var(--hover)] ${
          isFav ? 'text-accent' : 'text-body'
        }`}
      >
        <span className="truncate">{text}</span>
      </button>
      {onRemove && (
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove(text)
          }}
          title="삭제"
          className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-surface-2 text-faint shadow-sm hover:text-body group-hover:flex"
        >
          <X size={10} />
        </button>
      )}
    </div>
  )
}
