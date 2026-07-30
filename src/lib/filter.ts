// ============================================================
// 메모 목록 필터/정렬 유틸
// ============================================================

import type { LabelKey, Memo, SortType } from '@/types'

/**
 * HTML 태그를 제거하고 순수 텍스트만 추출합니다 (검색/미리보기용).
 *
 * 단순히 textContent를 쓰면 <div>목표</div><div>신규 가입</div> 가
 * "목표신규 가입"처럼 붙어버립니다.
 * 그래서 줄이 바뀌는 요소 뒤에 줄바꿈을 넣어 준 뒤 글자를 뽑습니다.
 */
const BLOCK_TAGS = 'div,p,li,br,h1,h2,h3,h4,h5,h6,blockquote,pre,tr'

export function stripHtml(html: string): string {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  // 블록 요소의 앞뒤 모두에 줄바꿈을 넣습니다.
  // (앞에도 넣어야 <b>목표</b><div>내용</div> 이 "목표내용"으로 붙지 않습니다)
  tmp.querySelectorAll(BLOCK_TAGS).forEach((el) => {
    el.insertAdjacentText('beforebegin', '\n')
    el.insertAdjacentText('afterend', '\n')
  })
  return (tmp.textContent || '')
    .replace(/ /g, ' ') // &nbsp; → 일반 공백
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/** 메모의 표시용 제목 (제목이 없으면 본문 첫 줄 사용) */
export function displayTitle(memo: Memo): string {
  if (memo.title.trim()) return memo.title.trim()
  const text = stripHtml(memo.content)
  const firstLine = text.split('\n')[0].trim()
  return firstLine || '새 메모'
}

/** 목록에 보여줄 미리보기 텍스트 */
export function previewText(memo: Memo): string {
  const lines = stripHtml(memo.content)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  // 제목이 비어 있으면 첫 줄이 제목으로 쓰이므로 미리보기에서 뺍니다.
  return lines.slice(memo.title.trim() ? 0 : 1).join(' ')
}

interface FilterOptions {
  query: string
  tagFilter: string | null
  /** 라벨(업무 상태) 필터. null이면 전체 */
  labelFilter?: LabelKey | null
  favoriteOnly: boolean
  sort: SortType
  /**
   * 프로젝트 필터.
   *  undefined → 전체 보기
   *  null      → 미분류만
   *  문자열    → 해당 프로젝트만
   */
  projectId?: string | null
}

/** 검색어/태그/라벨/즐겨찾기/프로젝트로 거르고 정렬한 메모 목록을 반환 */
export function filterAndSort(memos: Memo[], opts: FilterOptions): Memo[] {
  const q = opts.query.trim().toLowerCase()

  let result = memos.filter((m) => {
    if (opts.projectId !== undefined && m.projectId !== opts.projectId) return false
    if (opts.favoriteOnly && !m.favorite) return false
    if (opts.tagFilter && !m.tags.includes(opts.tagFilter)) return false
    if (opts.labelFilter && m.label !== opts.labelFilter) return false
    if (q) {
      const haystack = (displayTitle(m) + ' ' + stripHtml(m.content) + ' ' + m.tags.join(' ')).toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  // 정렬
  result = [...result].sort((a, b) => {
    switch (opts.sort) {
      case 'created':
        return b.createdAt - a.createdAt
      case 'title':
        return displayTitle(a).localeCompare(displayTitle(b), 'ko')
      case 'updated':
      default:
        return b.updatedAt - a.updatedAt
    }
  })

  // 고정(pinned) 메모를 항상 맨 위로
  const pinned = result.filter((m) => m.pinned)
  const rest = result.filter((m) => !m.pinned)
  return [...pinned, ...rest]
}

/**
 * 체크리스트 진행률을 계산합니다.
 * 본문 HTML에서 체크 항목 수와 완료된 항목 수를 세어 돌려줍니다.
 * 체크 항목이 없으면 null (목록에 진행률을 표시하지 않음).
 */
export function checklistProgress(html: string): { done: number; total: number } | null {
  if (!html.includes('check-item')) return null
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const items = tmp.querySelectorAll('.check-item')
  if (items.length === 0) return null
  let done = 0
  items.forEach((el) => {
    // 저장 시 done 클래스와 checked 속성을 함께 기록하므로 둘 중 하나로 판단
    if (el.classList.contains('done') || el.querySelector('input[checked]')) done++
  })
  return { done, total: items.length }
}

/**
 * 사람이 읽기 좋은 날짜 표기.
 *  오늘  → "오후 3:20"
 *  어제  → "어제"
 *  올해  → "3월 14일"
 *  그 외 → "2025. 3. 14."
 */
export function friendlyDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return '어제'

  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }
  return d.toLocaleDateString('ko-KR')
}

/** 모든 메모에서 사용된 태그 목록(중복 제거) */
export function allTags(memos: Memo[]): string[] {
  const set = new Set<string>()
  memos.forEach((m) => m.tags.forEach((t) => set.add(t)))
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'))
}
