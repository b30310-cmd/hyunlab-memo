// ============================================================
// 앱 전역 타입 정의
//
// 【중요 설계 원칙】
//  메모는 성격이 다른 3가지 데이터로 나누어 저장합니다.
//
//   1) Memo    — 글 내용과 분류 정보 (가장 중요, 절대 잃으면 안 됨)
//   2) Design  — 색상/폰트/스킨 등 꾸미기 정보 (없어도 글은 멀쩡함)
//   3) Drawing — 펜/형광펜 등 필기 레이어 (없어도 글은 멀쩡함)
//
//  이렇게 나누면 꾸미기나 그리기 기능을 나중에 고쳐도
//  글 내용이 손상될 위험이 없습니다.
// ============================================================

/** 현재 데이터 구조 버전. 구조가 바뀌면 올리고 마이그레이션을 추가합니다. */
export const SCHEMA_VERSION = 2

// ------------------------------------------------------------
// 1) 메모 본체 — 내용과 분류
// ------------------------------------------------------------

export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Reminder {
  enabled: boolean
  /** 알림 시각 (datetime-local 형식: YYYY-MM-DDTHH:mm) */
  datetime: string
  repeat: RepeatType
}

/** 팝업 창의 위치/크기/상태 */
export interface PopupState {
  x: number
  y: number
  width: number
  height: number
  alwaysOnTop: boolean
  locked: boolean
}

/**
 * 컬러 라벨 — 메모를 한눈에 구분하는 작은 색 점.
 * 값이 없으면(undefined) 라벨 없음입니다.
 * ※ 나중에 추가된 항목이라 '선택'으로 두어, 예전 메모도 그대로 열립니다.
 */
export type LabelKey = 'urgent' | 'today' | 'doing' | 'done' | 'work' | 'personal'

export interface Memo {
  id: string
  /** 소속 프로젝트 id (null이면 미분류) */
  projectId: string | null
  title: string
  /** 본문 HTML */
  content: string
  /** 컬러 라벨 (선택) */
  label?: LabelKey | null
  tags: string[]
  pinned: boolean
  favorite: boolean
  reminder: Reminder
  popup: PopupState
  createdAt: number
  updatedAt: number
}

// ------------------------------------------------------------
// 2) 디자인 — 꾸미기 정보 (메모와 분리 저장)
// ------------------------------------------------------------

/** 스킨: 메모지 질감/모양 프리셋 */
export type SkinType = 'plain' | 'lined' | 'grid' | 'dot' | 'sticky' | 'paper'

/** 테두리 스타일 */
export type BorderType = 'none' | 'solid' | 'dashed' | 'double' | 'accent'

/** 그림자 세기 */
export type ShadowType = 'none' | 'soft' | 'medium' | 'strong'

export interface MemoDesign {
  /** 배경색 키 또는 #hex */
  color: string
  /** 폰트 키 (본문) */
  font: string
  /**
   * 제목 글꼴 키. 없으면(undefined) 본문과 같은 글꼴을 씁니다.
   * 예전 메모는 이 값이 없어도 그대로 열리도록 선택 항목으로 둡니다.
   */
  titleFont?: string
  /** 글자 크기 (px) */
  fontSize: number
  skin: SkinType
  border: BorderType
  shadow: ShadowType
  /** 팝업 창 투명도 (0.3 ~ 1) */
  opacity: number
}

/** 디자인 기본값 (메모에 디자인 정보가 없을 때 사용) */
export const DEFAULT_DESIGN: MemoDesign = {
  color: 'cream',
  font: 'pretendard',
  fontSize: 16,
  skin: 'plain',
  border: 'none',
  shadow: 'soft',
  opacity: 1,
}

// ------------------------------------------------------------
// 3) 필기 레이어 — 그리기 데이터 (메모와 분리 저장)
// ------------------------------------------------------------

/** 그리기 도구 종류 */
export type ToolType =
  | 'pen'
  | 'pencil'
  | 'highlighter'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'text'

/** 획(stroke) 하나 */
export interface Stroke {
  id: string
  tool: ToolType
  color: string
  /** 선 굵기. text 도구에서는 글자 크기(px)로 씁니다. */
  width: number
  /** 불투명도 (형광펜은 낮음) */
  alpha: number
  /**
   * 좌표 목록 [x0,y0, x1,y1, ...] — 평평한 배열로 저장해 용량을 줄입니다.
   * 도형(line/arrow/rect/circle)은 시작점과 끝점 2개만, text는 놓을 위치
   * [x,y] 하나만 씁니다.
   */
  points: number[]
  /** text 도구 전용: 찍어 넣은 글자·이모지·특수문자 내용 */
  text?: string
}

export interface MemoDrawing {
  /** 필기 레이어 표시 여부 */
  visible: boolean
  strokes: Stroke[]
  /** 배경 이미지 (이미지 위 주석용, data URL) */
  backgroundImage?: string
}

export const DEFAULT_DRAWING: MemoDrawing = {
  visible: true,
  strokes: [],
}

// ------------------------------------------------------------
// 프로젝트 (메모 분류 폴더)
// ------------------------------------------------------------

export interface Project {
  id: string
  name: string
  /** 폴더 색상 (#hex) */
  color: string
  createdAt: number
}

// ------------------------------------------------------------
// 설정
// ------------------------------------------------------------

export type SortType = 'updated' | 'created' | 'title'
export type ViewType = 'list' | 'grid'

/** 사용자 지정 테마 (2단계) */
export interface CustomTheme {
  /** 강조색 */
  accent: string
  /** 사용자가 직접 추가한 배경색 목록 (#hex) */
  customColors: string[]
}

export interface Settings {
  theme: 'light' | 'dark'
  /** 새 메모에 적용할 기본 디자인 */
  defaultDesign: MemoDesign
  sort: SortType
  view: ViewType
  autoStart: boolean
  autoBackup: boolean
  /** 사용자 지정 테마 */
  custom: CustomTheme
  /** 메모 기록(자동 스냅샷) 보관 개수 */
  historyLimit: number
  /** 알림이 울릴 때 소리를 낼지 여부 */
  notifySound: boolean
}

// ------------------------------------------------------------
// 메모 기록 복원 (5단계)
// ------------------------------------------------------------

/** 특정 시점의 메모 내용 스냅샷 */
export interface HistoryEntry {
  memoId: string
  content: string
  title: string
  savedAt: number
}
