// ============================================================
// 그리기 도구 상태 (현재 선택된 펜/색/굵기)
//  ※ 그림 '데이터'가 아니라 '도구 설정'만 담습니다.
//     그림 데이터는 useMemoStore의 drawings에 메모별로 저장됩니다.
// ============================================================

import { create } from 'zustand'
import type { ToolType } from '@/types'

/** 도구별 기본 굵기/투명도 */
export const TOOL_PRESETS: Record<ToolType, { width: number; alpha: number }> = {
  pen: { width: 3, alpha: 1 },
  pencil: { width: 2, alpha: 0.75 },
  highlighter: { width: 16, alpha: 0.35 },
  eraser: { width: 16, alpha: 1 },
  line: { width: 3, alpha: 1 },
  arrow: { width: 3, alpha: 1 },
  rect: { width: 3, alpha: 1 },
  circle: { width: 3, alpha: 1 },
  text: { width: 10, alpha: 1 },
}

export const DRAW_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#111827',
]

interface DrawState {
  tool: ToolType
  color: string
  width: number
  alpha: number
  /**
   * '이동' 모드 — 켜져 있으면 새로 그리는 대신, 이미 놓인 텍스트·이모지나
   * 배경 이미지를 드래그로 옮기거나(텍스트는 짧게 클릭하면 다시 편집)
   * 할 수 있습니다. tool과는 별개의 상태입니다(그리기 도구는 그대로 기억됨).
   */
  moveMode: boolean
  setTool: (tool: ToolType) => void
  setColor: (color: string) => void
  setWidth: (width: number) => void
  setMoveMode: (moveMode: boolean) => void
}

export const useDrawStore = create<DrawState>((set) => ({
  tool: 'pen',
  color: '#ef4444',
  width: TOOL_PRESETS.pen.width,
  alpha: TOOL_PRESETS.pen.alpha,
  moveMode: false,

  // 도구를 바꾸면 그 도구에 맞는 굵기/투명도로 자동 설정하고, 이동 모드는 끕니다
  // (그리기로 돌아가려는 것이므로).
  setTool: (tool) =>
    set({ tool, width: TOOL_PRESETS[tool].width, alpha: TOOL_PRESETS[tool].alpha, moveMode: false }),
  setColor: (color) => set({ color }),
  setWidth: (width) => set({ width }),
  setMoveMode: (moveMode) => set({ moveMode }),
}))
