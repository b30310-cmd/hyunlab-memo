import { X } from 'lucide-react'
import type { Memo } from '@/types'
import { useMemoStore } from '@/store/useMemoStore'
import { SUGGESTED_TAGS } from '@/lib/constants'
import { ICON } from './Button'

// ============================================================
// 태그 편집 — 입력 + 현재 태그(제거 가능) + 추천 태그
//  메인 에디터·팝업 메모 공용 (4단계: '관리' 모드 안에서 사용)
// ============================================================

interface Props {
  memo: Memo
  /** 기본은 메모 저장소에 저장하지만, 스크래치패드처럼 다른 곳에 저장해야 하면 재정의합니다. */
  onUpdate?: (patch: Partial<Memo>) => void
}

export function TagEditor({ memo, onUpdate }: Props) {
  const updateMemo = useMemoStore((s) => s.updateMemo)
  const setTags = (tags: string[]) => (onUpdate ? onUpdate({ tags }) : updateMemo(memo.id, { tags }))

  const addTag = (tag: string) => {
    const clean = tag.trim().replace(/^#/, '')
    if (!clean || memo.tags.includes(clean)) return
    setTags([...memo.tags, clean])
  }
  const removeTag = (tag: string) => setTags(memo.tags.filter((t) => t !== tag))

  return (
    <div className="w-56">
      <input
        placeholder="태그 입력 후 Enter"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            addTag((e.target as HTMLInputElement).value)
            ;(e.target as HTMLInputElement).value = ''
          }
        }}
        className="ui-input"
      />
      <div className="mt-2 flex flex-wrap gap-1">
        {memo.tags.map((t) => (
          <span
            key={t}
            className="inline-flex h-6 items-center gap-1 rounded-full bg-surface-2 px-2 text-xs text-muted"
          >
            #{t}
            <button onClick={() => removeTag(t)} className="hover:text-body">
              <X size={ICON.xs} />
            </button>
          </span>
        ))}
        {SUGGESTED_TAGS.filter((t) => !memo.tags.includes(t)).map((t) => (
          <button
            key={t}
            onClick={() => addTag(t)}
            className="inline-flex h-6 items-center rounded-full border border-dashed border-line-strong px-2 text-xs text-faint hover:text-body"
          >
            +{t}
          </button>
        ))}
      </div>
    </div>
  )
}
