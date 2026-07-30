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
  setTool: (tool: ToolType) => void
  setColor: (color: string) => void
  setWidth: (width: number) => void
}

export const useDrawStore = create<DrawState>((set) => ({
  tool: 'pen',
  color: '#ef4444',
  width: TOOL_PRESETS.pen.width,
  alpha: TOOL_PRESETS.pen.alpha,

  // 도구를 바꾸면 그 도구에 맞는 굵기/투명도로 자동 설정
  setTool: (tool) =>
    set({ tool, width: TOOL_PRESETS[tool].width, alpha: TOOL_PRESETS[tool].alpha }),
  setColor: (color) => set({ color }),
  setWidth: (width) => set({ width }),
}))
