// ============================================================
// 스크래치패드(임시 작업 공간) 상태 관리
//
//  프로젝트를 먼저 고민하지 않고 자유롭게 쓰는 공간입니다. 여러 개를
//  동시에(팝업으로) 열 수 있도록 id별로 관리합니다.
//   - MAIN_SCRATCH_ID : 메인 화면에 항상 떠 있는 고정 슬롯
//   - createDraft()가 만드는 'scratch-<uuid>' : '새 메모' 팝업마다 하나씩
//
//  자동 저장은 되지만, 사용자가 [프로젝트에 저장]/[새 메모로 저장]을
//  누르기 전까지는 메모 목록·프로젝트 개수에 전혀 잡히지 않습니다.
//
//  꾸미기(디자인)·그리기(필기)는 별도 저장소를 새로 만들지 않고
//  useMemoStore의 designs/drawings 딕셔너리를 이 초안의 id로 그대로
//  재사용합니다(그 두 저장소는 애초에 '어떤 id든' 딕셔너리로 다루도록
//  만들어져 있어서, 실제 메모 목록에는 잡히지 않으면서 DesignPanel·
//  DrawingLayer 같은 기존 컴포넌트를 그대로 쓸 수 있습니다).
// ============================================================

import { create } from 'zustand'
import type { LabelKey, Reminder } from '@/types'
import { loadScratchDrafts, saveScratchDrafts, DEFAULT_SCRATCH_DRAFT, STORAGE_KEYS, type ScratchDraft } from '@/lib/storage'
import { createId } from '@/lib/id'
import { electron } from '@/lib/electron'

export type { ScratchDraft }

/** 메인 화면에 항상 떠 있는 스크래치패드의 고정 id */
export const MAIN_SCRATCH_ID = '__scratch__'

interface ScratchPatch {
  title?: string
  content?: string
  label?: LabelKey | null
  tags?: string[]
  reminder?: Reminder
}

interface ScratchState {
  drafts: Record<string, ScratchDraft>
  getDraft: (id: string) => ScratchDraft
  update: (id: string, patch: ScratchPatch) => void
  /** 팝업으로 열 새 초안을 만들고 id를 반환합니다. */
  createDraft: () => string
  /** 저장(프로젝트에 저장/새 메모로 저장) 후 초안을 비웁니다. (메인 화면 슬롯은 계속 남아 있어야 하므로 삭제 대신 리셋) */
  resetDraft: (id: string) => void
  /** 팝업 초안을 완전히 지웁니다 (저장 후 팝업을 닫을 때). 메인 화면 슬롯에는 쓰지 않습니다. */
  removeDraft: (id: string) => void
  /** 다른 창(팝업 등)에서 초안이 바뀌었을 때 저장소에서 다시 읽어 옵니다. */
  reloadFromStorage: () => void
}

const initialDrafts = loadScratchDrafts()

export const useScratchStore = create<ScratchState>((set, get) => ({
  drafts: initialDrafts,

  getDraft: (id) => get().drafts[id] ?? DEFAULT_SCRATCH_DRAFT,

  update: (id, patch) =>
    set((s) => {
      const cur = s.drafts[id] ?? DEFAULT_SCRATCH_DRAFT
      const drafts = { ...s.drafts, [id]: { ...cur, ...patch, updatedAt: Date.now() } }
      saveScratchDrafts(drafts)
      return { drafts }
    }),

  createDraft: () => {
    const id = 'scratch-' + createId()
    set((s) => {
      const drafts = { ...s.drafts, [id]: { ...DEFAULT_SCRATCH_DRAFT, updatedAt: Date.now() } }
      saveScratchDrafts(drafts)
      return { drafts }
    })
    return id
  },

  resetDraft: (id) =>
    set((s) => {
      const drafts = { ...s.drafts, [id]: { ...DEFAULT_SCRATCH_DRAFT, updatedAt: Date.now() } }
      saveScratchDrafts(drafts)
      return { drafts }
    }),

  removeDraft: (id) =>
    set((s) => {
      const drafts = { ...s.drafts }
      delete drafts[id]
      saveScratchDrafts(drafts)
      return { drafts }
    }),

  reloadFromStorage: () => set({ drafts: loadScratchDrafts() }),
}))

// ------------------------------------------------------------
// 창(window) 간 동기화
//  '새 메모' 팝업에서 등록한 알림을 메인 창의 알림 스케줄러가 곧바로
//  볼 수 있어야 하므로, useMemoStore와 동일하게 다른 창의 변경을 받습니다.
// ------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.scratch) {
      useScratchStore.getState().reloadFromStorage()
    }
  })
  electron()?.onDataChanged(() => useScratchStore.getState().reloadFromStorage())
}
