// ============================================================
// UI 상태 관리 (검색어, 태그 필터, 즐겨찾기 필터, 설정창 열림 등)
//  - 저장할 필요 없는 일시적 화면 상태만 담습니다.
// ============================================================

import { create } from 'zustand'
import type { LabelKey } from '@/types'

interface UiState {
  /** 검색어 */
  query: string
  /** 선택된 태그 필터 (null이면 전체) */
  tagFilter: string | null
  /** 선택된 라벨(업무 상태) 필터 (null이면 전체) */
  labelFilter: LabelKey | null
  /** 즐겨찾기만 보기 */
  favoriteOnly: boolean
  /**
   * 프로젝트 필터
   *  undefined → 전체 메모
   *  null      → 미분류
   *  문자열    → 특정 프로젝트
   */
  projectFilter: string | null | undefined
  /** 설정 모달 열림 여부 */
  settingsOpen: boolean
  /** 템플릿 고르기 창 열림 여부 */
  templateOpen: boolean

  setQuery: (q: string) => void
  setTagFilter: (t: string | null) => void
  setLabelFilter: (l: LabelKey | null) => void
  toggleFavoriteOnly: () => void
  setProjectFilter: (p: string | null | undefined) => void
  setSettingsOpen: (open: boolean) => void
  setTemplateOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  query: '',
  tagFilter: null,
  labelFilter: null,
  favoriteOnly: false,
  projectFilter: undefined,
  settingsOpen: false,
  templateOpen: false,

  setQuery: (query) => set({ query }),
  setTagFilter: (tagFilter) => set({ tagFilter }),
  setLabelFilter: (labelFilter) => set({ labelFilter }),
  toggleFavoriteOnly: () => set((s) => ({ favoriteOnly: !s.favoriteOnly })),
  setProjectFilter: (projectFilter) => set({ projectFilter }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setTemplateOpen: (templateOpen) => set({ templateOpen }),
}))
