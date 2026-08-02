// ============================================================
// 메모 상태 관리 (Zustand)
//
// 메모 본문 / 디자인 / 필기를 각각 따로 들고 있으며,
// 바뀔 때마다 해당 저장소에만 저장합니다.
// (그리기를 고쳐도 본문 저장에는 영향이 없습니다)
// ============================================================

import { create } from 'zustand'
import type { Memo, MemoDesign, MemoDrawing, Project, Stroke, HistoryEntry } from '@/types'
import { DEFAULT_DESIGN, DEFAULT_DRAWING } from '@/types'
import { createId } from '@/lib/id'
import { BRAND_ACCENT } from '@/lib/constants'
import * as db from '@/lib/storage'
import { electron } from '@/lib/electron'

/** 팝업 기본 상태 */
export const DEFAULT_POPUP: Memo['popup'] = {
  x: 200,
  y: 200,
  width: 340,
  height: 380,
  alwaysOnTop: true,
  locked: false,
  peekEdge: null,
}

/** 새 메모 객체 생성 */
export function newMemo(projectId: string | null = null): Memo {
  const now = Date.now()
  return {
    id: createId(),
    projectId,
    title: '',
    content: '',
    tags: [],
    pinned: false,
    favorite: false,
    reminder: { enabled: false, datetime: '', repeat: 'none' },
    popup: { ...DEFAULT_POPUP },
    createdAt: now,
    updatedAt: now,
  }
}

interface MemoState {
  memos: Memo[]
  designs: Record<string, MemoDesign>
  drawings: Record<string, MemoDrawing>
  projects: Project[]
  history: HistoryEntry[]
  selectedId: string | null

  // --- 메모 ---
  addMemo: (projectId?: string | null, design?: Partial<MemoDesign>) => Memo
  updateMemo: (id: string, patch: Partial<Memo>) => void
  deleteMemo: (id: string) => void
  duplicateMemo: (id: string) => Memo | undefined
  togglePin: (id: string) => void
  toggleFavorite: (id: string) => void
  select: (id: string | null) => void
  getById: (id: string) => Memo | undefined

  // --- 디자인 ---
  getDesign: (memoId: string) => MemoDesign
  updateDesign: (memoId: string, patch: Partial<MemoDesign>) => void

  // --- 필기 ---
  getDrawing: (memoId: string) => MemoDrawing
  addStroke: (memoId: string, stroke: Stroke) => void
  removeStrokes: (memoId: string, strokeIds: string[]) => void
  setStrokes: (memoId: string, strokes: Stroke[]) => void
  setDrawingVisible: (memoId: string, visible: boolean) => void
  setDrawingBackground: (memoId: string, dataUrl: string | undefined) => void

  // --- 프로젝트 ---
  addProject: (name: string, color?: string) => Project
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => void
  moveMemoToProject: (memoId: string, projectId: string | null) => void

  // --- 기록 복원 ---
  snapshot: (memoId: string) => void
  restoreHistory: (entry: HistoryEntry) => void

  // --- 백업 ---
  importAll: (data: Partial<db.BackupFile>, mode: 'replace' | 'merge') => number
  reloadFromStorage: () => void
}

export const useMemoStore = create<MemoState>((set, get) => ({
  memos: db.loadMemos(),
  designs: db.loadDesigns(),
  drawings: db.loadDrawings(),
  projects: db.loadProjects(),
  history: db.loadHistory(),
  selectedId: null,

  // ---------------- 메모 ----------------
  addMemo: (projectId = null, design) => {
    const memo = newMemo(projectId)
    set((s) => {
      const memos = [memo, ...s.memos]
      const designs = { ...s.designs, [memo.id]: { ...DEFAULT_DESIGN, ...design } }
      db.saveMemos(memos)
      db.saveDesigns(designs)
      return { memos, designs, selectedId: memo.id }
    })
    return memo
  },

  updateMemo: (id, patch) => {
    set((s) => {
      const memos = s.memos.map((m) =>
        m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m,
      )
      db.saveMemos(memos)
      return { memos }
    })
  },

  deleteMemo: (id) => {
    set((s) => {
      const memos = s.memos.filter((m) => m.id !== id)
      // 딸린 디자인/필기도 함께 정리 (용량 절약)
      const designs = { ...s.designs }
      const drawings = { ...s.drawings }
      delete designs[id]
      delete drawings[id]
      db.saveMemos(memos)
      db.saveDesigns(designs)
      db.saveDrawings(drawings)
      return {
        memos,
        designs,
        drawings,
        selectedId: s.selectedId === id ? (memos[0]?.id ?? null) : s.selectedId,
      }
    })
  },

  duplicateMemo: (id) => {
    const s = get()
    const target = s.memos.find((m) => m.id === id)
    if (!target) return undefined
    const copy: Memo = {
      ...target,
      id: createId(),
      title: target.title ? `${target.title} (복사본)` : '',
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    // 디자인과 필기까지 함께 복제
    const designs = { ...s.designs, [copy.id]: { ...s.getDesign(id) } }
    const srcDrawing = s.drawings[id]
    const drawings = srcDrawing
      ? { ...s.drawings, [copy.id]: { ...srcDrawing, strokes: [...srcDrawing.strokes] } }
      : s.drawings
    const memos = [copy, ...s.memos]
    db.saveMemos(memos)
    db.saveDesigns(designs)
    db.saveDrawings(drawings)
    set({ memos, designs, drawings, selectedId: copy.id })
    return copy
  },

  togglePin: (id) =>
    set((s) => {
      const memos = s.memos.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m))
      db.saveMemos(memos)
      return { memos }
    }),

  toggleFavorite: (id) =>
    set((s) => {
      const memos = s.memos.map((m) => (m.id === id ? { ...m, favorite: !m.favorite } : m))
      db.saveMemos(memos)
      return { memos }
    }),

  select: (id) => set({ selectedId: id }),

  getById: (id) => get().memos.find((m) => m.id === id),

  // ---------------- 디자인 ----------------
  getDesign: (memoId) => db.getDesign(get().designs, memoId),

  updateDesign: (memoId, patch) =>
    set((s) => {
      const designs = {
        ...s.designs,
        [memoId]: { ...db.getDesign(s.designs, memoId), ...patch },
      }
      db.saveDesigns(designs)
      return { designs }
    }),

  // ---------------- 필기 ----------------
  getDrawing: (memoId) => db.getDrawing(get().drawings, memoId),

  addStroke: (memoId, stroke) =>
    set((s) => {
      const cur = db.getDrawing(s.drawings, memoId)
      const drawings = {
        ...s.drawings,
        [memoId]: { ...cur, strokes: [...cur.strokes, stroke] },
      }
      db.saveDrawings(drawings)
      return { drawings }
    }),

  removeStrokes: (memoId, strokeIds) =>
    set((s) => {
      const cur = db.getDrawing(s.drawings, memoId)
      const drawings = {
        ...s.drawings,
        [memoId]: { ...cur, strokes: cur.strokes.filter((st) => !strokeIds.includes(st.id)) },
      }
      db.saveDrawings(drawings)
      return { drawings }
    }),

  setStrokes: (memoId, strokes) =>
    set((s) => {
      const cur = db.getDrawing(s.drawings, memoId)
      const drawings = { ...s.drawings, [memoId]: { ...cur, strokes } }
      db.saveDrawings(drawings)
      return { drawings }
    }),

  setDrawingVisible: (memoId, visible) =>
    set((s) => {
      const cur = db.getDrawing(s.drawings, memoId)
      const drawings = { ...s.drawings, [memoId]: { ...cur, visible } }
      db.saveDrawings(drawings)
      return { drawings }
    }),

  setDrawingBackground: (memoId, dataUrl) =>
    set((s) => {
      const cur = db.getDrawing(s.drawings, memoId)
      const drawings = { ...s.drawings, [memoId]: { ...cur, backgroundImage: dataUrl } }
      db.saveDrawings(drawings)
      return { drawings }
    }),

  // ---------------- 프로젝트 ----------------
  addProject: (name, color = BRAND_ACCENT) => {
    const project: Project = { id: createId(), name, color, createdAt: Date.now() }
    set((s) => {
      const projects = [...s.projects, project]
      db.saveProjects(projects)
      return { projects }
    })
    return project
  },

  renameProject: (id, name) =>
    set((s) => {
      const projects = s.projects.map((p) => (p.id === id ? { ...p, name } : p))
      db.saveProjects(projects)
      return { projects }
    }),

  /** 프로젝트만 삭제하고, 안에 있던 메모는 '미분류'로 옮깁니다 (메모는 절대 지우지 않음) */
  deleteProject: (id) =>
    set((s) => {
      const projects = s.projects.filter((p) => p.id !== id)
      const memos = s.memos.map((m) => (m.projectId === id ? { ...m, projectId: null } : m))
      db.saveProjects(projects)
      db.saveMemos(memos)
      return { projects, memos }
    }),

  moveMemoToProject: (memoId, projectId) =>
    set((s) => {
      const memos = s.memos.map((m) =>
        m.id === memoId ? { ...m, projectId, updatedAt: Date.now() } : m,
      )
      db.saveMemos(memos)
      return { memos }
    }),

  // ---------------- 기록 복원 ----------------
  /** 현재 내용을 기록에 남깁니다 (같은 메모는 최근 N개만 보관) */
  snapshot: (memoId) =>
    set((s) => {
      const memo = s.memos.find((m) => m.id === memoId)
      if (!memo || !memo.content.trim()) return s
      const last = s.history.find((h) => h.memoId === memoId)
      // 내용이 같으면 중복 저장하지 않습니다.
      if (last && last.content === memo.content) return s

      const limit = 20
      const entry: HistoryEntry = {
        memoId,
        content: memo.content,
        title: memo.title,
        savedAt: Date.now(),
      }
      const mine = [entry, ...s.history.filter((h) => h.memoId === memoId)].slice(0, limit)
      const others = s.history.filter((h) => h.memoId !== memoId)
      const history = [...mine, ...others]
      db.saveHistory(history)
      return { history }
    }),

  restoreHistory: (entry) => {
    get().updateMemo(entry.memoId, { content: entry.content, title: entry.title })
  },

  // ---------------- 백업 ----------------
  /**
   * 가져오기.
   *  - replace: 전체 교체
   *  - merge:  기존 메모는 유지하고 새 id만 추가 (기존 메모 손상 없음)
   * 반환값: 실제로 반영된 메모 수
   */
  importAll: (data, mode) => {
    const s = get()
    const incoming = (data.memos ?? []).filter((m) => m && m.id)
    let memos: Memo[]
    let designs: Record<string, MemoDesign>
    let drawings: Record<string, MemoDrawing>
    let projects: Project[]

    if (mode === 'replace') {
      memos = incoming
      designs = data.designs ?? {}
      drawings = data.drawings ?? {}
      projects = data.projects ?? []
    } else {
      const existing = new Set(s.memos.map((m) => m.id))
      const added = incoming.filter((m) => !existing.has(m.id))
      memos = [...added, ...s.memos]
      designs = { ...(data.designs ?? {}), ...s.designs }
      drawings = { ...(data.drawings ?? {}), ...s.drawings }
      const existingProjects = new Set(s.projects.map((p) => p.id))
      projects = [...s.projects, ...(data.projects ?? []).filter((p) => !existingProjects.has(p.id))]
    }

    db.saveMemos(memos)
    db.saveDesigns(designs)
    db.saveDrawings(drawings)
    db.saveProjects(projects)
    set({ memos, designs, drawings, projects, selectedId: memos[0]?.id ?? null })
    return mode === 'replace' ? memos.length : memos.length - s.memos.length
  },

  /** 다른 창이 저장소를 바꿨을 때 다시 읽어옵니다 */
  reloadFromStorage: () =>
    set({
      memos: db.loadMemos(),
      designs: db.loadDesigns(),
      drawings: db.loadDrawings(),
      projects: db.loadProjects(),
    }),
}))

// ------------------------------------------------------------
// 창(window) 간 동기화
//  팝업 창에서 수정하면 메인 창에도 즉시 반영됩니다.
//  (웹은 브라우저의 storage 이벤트로, Windows 앱은 Electron IPC로 — 창마다
//   별도 프로세스인 Electron에서는 file:// 환경의 storage 이벤트를 믿을 수
//   없어서 팝업에서 등록한 알림을 메인 창의 알림 스케줄러가 못 보는 문제가
//   있었습니다. lib/storage.ts의 write()가 저장할 때마다 IPC로도 알립니다)
// ------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('hyunlab-memo:')) {
      useMemoStore.getState().reloadFromStorage()
    }
  })
  electron()?.onDataChanged(() => useMemoStore.getState().reloadFromStorage())
}
