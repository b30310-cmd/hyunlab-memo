// ============================================================
// 저장소 (Storage)
//
// 【저장 구조】 성격이 다른 데이터를 서로 다른 키에 나누어 저장합니다.
//   hyunlab-memo:memos     → 메모 본문/분류 (가장 중요)
//   hyunlab-memo:designs   → 메모별 꾸미기 정보
//   hyunlab-memo:drawings  → 메모별 필기(그리기) 데이터
//   hyunlab-memo:projects  → 프로젝트(폴더) 목록
//   hyunlab-memo:history   → 메모 기록 복원용 스냅샷
//   hyunlab-memo:settings  → 앱 설정
//   hyunlab-memo:schema    → 데이터 구조 버전
//   hyunlab-memo:scratch   → 스크래치패드(임시 작업 공간) — 저장하기 전까지는
//                            메모 목록/프로젝트 개수에 전혀 잡히지 않습니다
//
// 이렇게 나눈 이유:
//   그리기/꾸미기 기능을 고치다 문제가 생겨도 본문(memos)은 건드리지 않으므로
//   기존 메모가 손상되지 않습니다.
// ============================================================

import {
  SCHEMA_VERSION,
  DEFAULT_DESIGN,
  DEFAULT_DRAWING,
  type Memo,
  type MemoDesign,
  type MemoDrawing,
  type Project,
  type Settings,
  type HistoryEntry,
  type Reminder,
  type LabelKey,
} from '@/types'
import { BRAND_ACCENT } from '@/lib/constants'

const K = {
  memos: 'hyunlab-memo:memos',
  designs: 'hyunlab-memo:designs',
  drawings: 'hyunlab-memo:drawings',
  projects: 'hyunlab-memo:projects',
  history: 'hyunlab-memo:history',
  settings: 'hyunlab-memo:settings',
  schema: 'hyunlab-memo:schema',
  scratch: 'hyunlab-memo:scratch',
} as const

export const STORAGE_KEYS = K

// ============================================================
// 스크래치패드 (임시 작업 공간)
//  여러 개를 동시에 열 수 있도록 id별 딕셔너리로 저장합니다.
//  (메인 화면용은 고정 id '__scratch__', 팝업으로 새로 열 때마다 'scratch-<uuid>')
// ============================================================

export interface ScratchDraft {
  title: string
  content: string
  label: LabelKey | null
  tags: string[]
  reminder: Reminder
  updatedAt: number
}

export const DEFAULT_SCRATCH_DRAFT: ScratchDraft = {
  title: '',
  content: '',
  label: null,
  tags: [],
  reminder: { enabled: false, datetime: '', repeat: 'none' },
  updatedAt: Date.now(),
}

/** JSON을 안전하게 읽습니다. 깨져 있으면 기본값을 돌려주고 앱은 계속 동작합니다. */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (e) {
    console.error(`[storage] ${key} 읽기 실패:`, e)
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // 용량 초과(QuotaExceeded) 등
    console.error(`[storage] ${key} 저장 실패:`, e)
    alert('저장 공간이 부족합니다. 설정 → 백업에서 내보내기 후 오래된 메모를 정리해 주세요.')
  }
}

// ============================================================
// 마이그레이션 — 예전 구조의 데이터를 새 구조로 옮깁니다.
// 【원칙】 절대 지우지 않습니다. 옮기기만 하고, 실패하면 원본을 그대로 둡니다.
// ============================================================

/** v1 메모 구조 (색상/폰트가 메모 안에 섞여 있던 시절) */
interface MemoV1 {
  id: string
  title: string
  content: string
  color?: string
  font?: string
  fontSize?: number
  pinned?: boolean
  favorite?: boolean
  tags?: string[]
  reminder?: Memo['reminder']
  popup?: Partial<Memo['popup']> & { opacity?: number }
  createdAt?: number
  updatedAt?: number
}

/**
 * v1 → v2 변환.
 *  - 메모에 섞여 있던 color/font/fontSize/opacity를 designs로 분리
 *  - projectId 추가 (미분류 = null)
 * 원본 내용(content/title)은 손대지 않습니다.
 */
function migrateV1toV2(): void {
  const rawMemos = localStorage.getItem(K.memos)
  if (!rawMemos) return

  let old: MemoV1[]
  try {
    old = JSON.parse(rawMemos)
  } catch {
    console.error('[migration] 메모를 읽을 수 없어 마이그레이션을 건너뜁니다.')
    return
  }
  if (!Array.isArray(old)) return

  // 혹시 모를 사고에 대비해 원본을 백업해 둡니다.
  localStorage.setItem(K.memos + ':backup-v1', rawMemos)

  const designs: Record<string, MemoDesign> = read(K.designs, {})
  const memos: Memo[] = old.map((m) => {
    // 꾸미기 정보 분리
    designs[m.id] = {
      ...DEFAULT_DESIGN,
      color: m.color ?? DEFAULT_DESIGN.color,
      font: m.font ?? DEFAULT_DESIGN.font,
      fontSize: m.fontSize ?? DEFAULT_DESIGN.fontSize,
      opacity: m.popup?.opacity ?? 1,
    }
    // 본문은 그대로 유지
    return {
      id: m.id,
      projectId: null,
      title: m.title ?? '',
      content: m.content ?? '',
      tags: m.tags ?? [],
      pinned: m.pinned ?? false,
      favorite: m.favorite ?? false,
      reminder: m.reminder ?? { enabled: false, datetime: '', repeat: 'none' },
      popup: {
        x: m.popup?.x ?? 200,
        y: m.popup?.y ?? 200,
        width: m.popup?.width ?? 320,
        height: m.popup?.height ?? 340,
        alwaysOnTop: m.popup?.alwaysOnTop ?? true,
        locked: m.popup?.locked ?? false,
      },
      createdAt: m.createdAt ?? Date.now(),
      updatedAt: m.updatedAt ?? Date.now(),
    }
  })

  write(K.memos, memos)
  write(K.designs, designs)
  console.info(`[migration] v1 → v2 완료: 메모 ${memos.length}개 변환`)
}

/**
 * 필요한 마이그레이션을 순서대로 적용합니다.
 *
 * 이 함수는 아래에서 '모듈이 처음 불러와질 때' 자동 실행됩니다.
 * store들이 모두 이 파일을 import 하므로, 어떤 store가 데이터를 읽기 전에
 * 반드시 먼저 실행되는 것이 보장됩니다.
 * (main.tsx에서 부르면 import 호이스팅 때문에 store가 먼저 읽어버려 늦습니다.)
 */
export function runMigrations(): void {
  const current = read<number>(K.schema, 0)
  if (current >= SCHEMA_VERSION) return

  try {
    // 0 또는 1 → 2
    if (current < 2) migrateV1toV2()
    write(K.schema, SCHEMA_VERSION)
  } catch (e) {
    // 마이그레이션이 실패해도 앱은 떠야 합니다. 원본은 그대로 남아 있습니다.
    console.error('[migration] 실패:', e)
  }
}

// 이 모듈을 처음 불러오는 시점에 마이그레이션을 끝내 둡니다.
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  runMigrations()
}

// ============================================================
// 메모
// ============================================================

export const loadMemos = (): Memo[] => read<Memo[]>(K.memos, [])
export const saveMemos = (memos: Memo[]): void => write(K.memos, memos)

// ============================================================
// 디자인 (메모별)
// ============================================================

export const loadDesigns = (): Record<string, MemoDesign> => read(K.designs, {})
export const saveDesigns = (d: Record<string, MemoDesign>): void => write(K.designs, d)

/** 특정 메모의 디자인 (없으면 기본값) */
export function getDesign(designs: Record<string, MemoDesign>, memoId: string): MemoDesign {
  return { ...DEFAULT_DESIGN, ...(designs[memoId] ?? {}) }
}

// ============================================================
// 필기 (메모별)
// ============================================================

export const loadDrawings = (): Record<string, MemoDrawing> => read(K.drawings, {})
export const saveDrawings = (d: Record<string, MemoDrawing>): void => write(K.drawings, d)

export function getDrawing(
  drawings: Record<string, MemoDrawing>,
  memoId: string,
): MemoDrawing {
  return drawings[memoId] ?? { ...DEFAULT_DRAWING, strokes: [] }
}

/** 여러 개의 스크래치패드 초안을 id별로 읽어옵니다. */
export function loadScratchDrafts(): Record<string, ScratchDraft> {
  const raw = read<Record<string, Partial<ScratchDraft>> | Partial<ScratchDraft>>(K.scratch, {})
  // 이전 버전(초안 하나만 저장하던 시절) 데이터를 그대로 옮겨옵니다.
  if (raw && typeof raw === 'object' && 'content' in raw) {
    return { __scratch__: { ...DEFAULT_SCRATCH_DRAFT, ...(raw as Partial<ScratchDraft>) } }
  }
  const drafts = raw as Record<string, Partial<ScratchDraft>>
  const result: Record<string, ScratchDraft> = {}
  for (const id in drafts) result[id] = { ...DEFAULT_SCRATCH_DRAFT, ...drafts[id] }
  return result
}
export const saveScratchDrafts = (d: Record<string, ScratchDraft>): void => write(K.scratch, d)

// ============================================================
// 프로젝트
// ============================================================

export const loadProjects = (): Project[] => read<Project[]>(K.projects, [])
export const saveProjects = (p: Project[]): void => write(K.projects, p)

// ============================================================
// 메모 기록 (자동 스냅샷)
// ============================================================

export const loadHistory = (): HistoryEntry[] => read<HistoryEntry[]>(K.history, [])
export const saveHistory = (h: HistoryEntry[]): void => write(K.history, h)

// ============================================================
// 설정
// ============================================================

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  defaultDesign: { ...DEFAULT_DESIGN },
  sort: 'updated',
  view: 'list',
  autoStart: false,
  autoBackup: true,
  custom: { accent: BRAND_ACCENT, customColors: [] }, // HYUNLAB 브랜드 강조색
  historyLimit: 20,
  notifySound: true,
}

export function loadSettings(): Settings {
  const saved = read<Partial<Settings>>(K.settings, {})
  // 새 항목이 추가되어도 기본값으로 안전하게 채웁니다.
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    defaultDesign: { ...DEFAULT_DESIGN, ...(saved.defaultDesign ?? {}) },
    custom: { ...DEFAULT_SETTINGS.custom, ...(saved.custom ?? {}) },
  }
}

export const saveSettings = (s: Settings): void => write(K.settings, s)

// ============================================================
// 백업 (JSON 내보내기 / 가져오기)
// ============================================================

export interface BackupFile {
  app: 'HYUNLAB Memo'
  schemaVersion: number
  exportedAt: string
  memos: Memo[]
  designs: Record<string, MemoDesign>
  drawings: Record<string, MemoDrawing>
  projects: Project[]
  settings: Settings
}

/** 모든 데이터를 JSON 파일로 저장 */
export function exportJSON(): void {
  const data: BackupFile = {
    app: 'HYUNLAB Memo',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    memos: loadMemos(),
    designs: loadDesigns(),
    drawings: loadDrawings(),
    projects: loadProjects(),
    settings: loadSettings(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hyunlab-memo-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** JSON 파일 읽기 (실제 반영은 store에서 처리) */
export function importJSON(file: File): Promise<Partial<BackupFile>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        if (!Array.isArray(parsed.memos)) {
          throw new Error('메모 목록이 없는 파일입니다.')
        }
        resolve(parsed)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
