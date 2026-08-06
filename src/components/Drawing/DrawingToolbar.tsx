import { useRef, useState } from 'react'
import {
  Pen, Pencil, Highlighter, Eraser, Minus, MoveUpRight, Square, Circle,
  Undo2, Redo2, Trash2, XCircle, Eye, EyeOff, ImagePlus, Type, Move,
} from 'lucide-react'
import type { Stroke, ToolType } from '@/types'
import { useMemoStore } from '@/store/useMemoStore'
import { useDrawStore, DRAW_COLORS } from '@/store/useDrawStore'
import { IconButton, ICON } from '@/components/ui/Button'

// ============================================================
// 그리기 도구 막대
//  펜 / 연필 / 형광펜 / 지우개 / 선 / 화살표 / 사각형 / 원
//  + 실행 취소·다시 실행, 전체 지우기, 숨기기, 이미지 주석
// ============================================================

const TOOLS: { key: ToolType; name: string; icon: React.ReactNode }[] = [
  { key: 'pen', name: '펜', icon: <Pen size={ICON.md} /> },
  { key: 'pencil', name: '연필', icon: <Pencil size={ICON.md} /> },
  { key: 'highlighter', name: '형광펜', icon: <Highlighter size={ICON.md} /> },
  { key: 'eraser', name: '지우개', icon: <Eraser size={ICON.md} /> },
  { key: 'line', name: '직선', icon: <Minus size={ICON.md} /> },
  { key: 'arrow', name: '화살표', icon: <MoveUpRight size={ICON.md} /> },
  { key: 'rect', name: '사각형', icon: <Square size={ICON.md} /> },
  { key: 'circle', name: '동그라미', icon: <Circle size={ICON.md} /> },
  { key: 'text', name: '텍스트·이모지', icon: <Type size={ICON.md} /> },
]

export function DrawingToolbar({ memoId }: { memoId: string }) {
  const drawing = useMemoStore((s) => s.getDrawing(memoId))
  const setStrokes = useMemoStore((s) => s.setStrokes)
  const setVisible = useMemoStore((s) => s.setDrawingVisible)
  const setBackground = useMemoStore((s) => s.setDrawingBackground)
  const { tool, color, width, moveMode, setTool, setColor, setWidth, setMoveMode } = useDrawStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [redoStack, setRedoStack] = useState<{ memoId: string; strokes: Stroke[] }>({
    memoId,
    strokes: [],
  })

  const undo = () => {
    if (drawing.strokes.length === 0) return
    const last = drawing.strokes[drawing.strokes.length - 1]
    setStrokes(memoId, drawing.strokes.slice(0, -1))
    setRedoStack((r) => ({ memoId, strokes: r.memoId === memoId ? [...r.strokes, last] : [last] }))
  }

  const redo = () => {
    if (redoStack.memoId !== memoId || redoStack.strokes.length === 0) return
    const last = redoStack.strokes[redoStack.strokes.length - 1]
    setStrokes(memoId, [...drawing.strokes, last])
    setRedoStack((r) => ({ memoId, strokes: r.strokes.slice(0, -1) }))
  }

  /** 이미지 위 주석: 배경 이미지를 깔고 그 위에 그립니다. */
  const pickImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        // 용량 절약을 위해 폭 1200px로 줄여 저장합니다.
        const scale = Math.min(1, 1200 / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        setBackground(memoId, canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="no-drag flex shrink-0 flex-wrap items-center gap-0.5 border-y border-black/[0.06] px-4 py-1.5 dark:border-white/[0.08]">
      {TOOLS.map((t) => (
        <IconButton key={t.key} title={t.name} size="sm" active={tool === t.key} onClick={() => setTool(t.key)}>
          {t.icon}
        </IconButton>
      ))}

      <IconButton
        title="이동 — 찍어 넣은 텍스트·이모지나 배경 이미지를 드래그로 옮기고, 텍스트는 클릭하면 다시 편집"
        size="sm"
        active={moveMode}
        onClick={() => setMoveMode(!moveMode)}
      >
        <Move size={ICON.md} />
      </IconButton>

      <Divider />

      <div className="flex items-center gap-1">
        {DRAW_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            title={c}
            className={`h-4 w-4 rounded-full transition-transform hover:scale-125 ${
              color === c ? 'ring-2 ring-body ring-offset-1 ring-offset-[var(--surface)]' : ''
            }`}
            style={{ background: c }}
          />
        ))}
      </div>

      <Divider />

      <input
        type="range"
        min={1}
        max={30}
        value={width}
        onChange={(e) => setWidth(Number(e.target.value))}
        title={tool === 'text' ? `글자 크기 ${Math.max(14, width * 2)}px` : `굵기 ${width}px`}
        className="w-20 accent-[var(--accent)]"
      />

      <Divider />

      <IconButton title="실행 취소" size="sm" onClick={undo} disabled={drawing.strokes.length === 0}>
        <Undo2 size={ICON.md} />
      </IconButton>
      <IconButton
        title="다시 실행"
        size="sm"
        onClick={redo}
        disabled={redoStack.memoId !== memoId || redoStack.strokes.length === 0}
      >
        <Redo2 size={ICON.md} />
      </IconButton>
      <IconButton
        title="필기 전체 지우기"
        size="sm"
        disabled={drawing.strokes.length === 0}
        onClick={() => {
          if (confirm('이 메모의 필기를 모두 지울까요?\n(글 내용은 그대로 남습니다)')) {
            setStrokes(memoId, [])
          }
        }}
      >
        <Trash2 size={ICON.md} />
      </IconButton>
      <IconButton
        title="그림 전체 삭제 (필기 + 배경 이미지 모두)"
        size="sm"
        disabled={drawing.strokes.length === 0 && !drawing.backgroundImage}
        onClick={() => {
          if (confirm('이 메모의 그림을 모두 지울까요?\n(필기 + 배경 이미지 모두 지워집니다. 글 내용은 그대로 남습니다)')) {
            setStrokes(memoId, [])
            setBackground(memoId, undefined)
          }
        }}
      >
        <XCircle size={ICON.md} />
      </IconButton>
      <IconButton
        title={drawing.visible ? '필기 숨기기' : '필기 보이기'}
        size="sm"
        onClick={() => setVisible(memoId, !drawing.visible)}
      >
        {drawing.visible ? <Eye size={ICON.md} /> : <EyeOff size={ICON.md} />}
      </IconButton>

      <Divider />

      <IconButton title="이미지 넣고 주석 달기" size="sm" onClick={() => fileRef.current?.click()}>
        <ImagePlus size={ICON.md} />
      </IconButton>
      {drawing.backgroundImage && (
        <button
          onClick={() => setBackground(memoId, undefined)}
          className="text-xs text-faint transition-colors hover:text-red-500"
        >
          이미지 제거
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) pickImage(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

function Divider() {
  return <div className="mx-1.5 h-4 w-px shrink-0 bg-line" />
}
