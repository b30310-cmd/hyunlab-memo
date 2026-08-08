import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Stroke } from '@/types'
import { useMemoStore } from '@/store/useMemoStore'
import { useDrawStore } from '@/store/useDrawStore'
import { createId } from '@/lib/id'
import { TextStampEditor } from './TextStampEditor'

// ============================================================
// 4단계: 필기(그리기) 레이어
//
//  본문 위에 겹쳐지는 투명한 canvas입니다.
//   - active=false : 그림만 보여주고 마우스 이벤트는 통과시킵니다(글 작성 방해 X)
//   - active=true  : 그리기 모드. 마우스로 획을 그립니다.
//
//  【데이터 분리】 그린 획은 memo.content가 아니라
//  drawings 저장소에 별도로 저장되므로 본문이 절대 오염되지 않습니다.
// ============================================================

interface Props {
  memoId: string
  active: boolean
}

/** '이동' 모드에서 드래그 중인 대상의 임시(미저장) 위치/크기 상태 */
type DragState =
  | { type: 'text'; id: string; dx: number; dy: number; x: number; y: number }
  | { type: 'bg'; dx: number; dy: number; x: number; y: number }
  | { type: 'shape-move'; id: string; startX: number; startY: number; origPoints: number[]; dx: number; dy: number }
  | { type: 'shape-resize'; id: string; handle: 0 | 1; x: number; y: number }
  | null

export function DrawingLayer({ memoId, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const drawing = useMemoStore((s) => s.getDrawing(memoId))
  const addStroke = useMemoStore((s) => s.addStroke)
  const removeStrokes = useMemoStore((s) => s.removeStrokes)
  const setStrokes = useMemoStore((s) => s.setStrokes)
  const setDrawingBackgroundPos = useMemoStore((s) => s.setDrawingBackgroundPos)
  const { tool, color, width, alpha, moveMode } = useDrawStore()

  // 펜·연필·형광펜을 고르고 색을 클릭하면, 드래그를 시작하기도 전에
  // 커서 자체가 그 색과 굵기를 미리 보여줘서 "지금부터 이 색으로 그려진다"는
  // 걸 바로 알 수 있게 합니다(그리는 도중 실시간으로 안 보이는 것처럼
  // 느껴졌던 문제를 보완하는 시각적 피드백).
  const cursor = useMemo(() => cursorFor(tool, color, width, alpha), [tool, color, width, alpha])

  // 그리는 중인 획 (아직 저장 전)
  const draftRef = useRef<Stroke | null>(null)
  // '이동' 모드에서 지금 드래그 중인 대상 — 저장 전 화면에만 반영되는 임시
  // 위치/크기입니다.
  //  text/bg : x,y는 그 대상의 왼쪽위 기준 좌표
  //  shape-move   : 도형 전체를 옮김 (dx,dy는 시작점 대비 이동량)
  //  shape-resize : 도형의 손잡이(시작점 0 / 끝점 1) 하나만 옮겨 크기·모양을 바꿈
  const dragRef = useRef<DragState>(null)
  // 이동 모드에서 지금 선택된 도형(선/화살표/사각형/원) — 선택하면 양 끝에
  // 손잡이가 보이고, 손잡이를 드래그하면 크기를 바꿀 수 있습니다.
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  // 이동 모드에서 클릭(드래그 없이 떼기)인지 구분하기 위한 시작 좌표
  const downPosRef = useRef<{ x: number; y: number } | null>(null)
  // 드래그 중 캔버스를 다시 그리라고 알리는 카운터. 값 자체를 아래
  // useLayoutEffect의 의존성 배열에 넣어야 매번 다시 실행됩니다 — 예전에는
  // 값은 버리고 상태 변경 함수(setter)만 deps에 넣어서, setter는 리렌더와
  // 무관하게 항상 같은 참조라 두 번째 획부터는(drawings[memoId]가 store에
  // 이미 안정적으로 저장돼 있어 drawing도 참조가 안 바뀌는 상태) 드래그
  // 중에는 캔버스가 전혀 다시 그려지지 않고 마우스를 놓아야만(그 때는
  // drawing 참조 자체가 바뀌므로) 보이는 버그가 있었습니다.
  const [renderTick, forceRender] = useState(0)
  const [size, setSize] = useState({ w: 0, h: 0 })
  // '텍스트' 도구로 캔버스를 클릭한 위치. canvas는 획 좌표(캔버스 기준),
  // client는 입력 패널을 화면에 고정 배치하기 위한 뷰포트 기준 좌표입니다.
  // editId·initialText가 있으면 새로 찍는 게 아니라 '이동' 모드에서 기존
  // 텍스트를 짧게 클릭해 다시 편집하는 것입니다.
  const [textAt, setTextAt] = useState<{
    canvas: [number, number]
    client: [number, number]
    editId?: string
    initialText?: string
  } | null>(null)

  // 부모 크기에 맞춰 캔버스 크기 조정
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.scrollHeight || el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 그리기 모드를 벗어나면(다른 모드로 전환) 확인/취소를 누르지 않고 열어
  // 둔 텍스트·이모지 입력 패널도 함께 닫습니다. 이 패널은 fixed로 화면에
  // 떠 있는데 active와 무관하게 textAt 상태만으로 렌더되다 보니, 안 닫고
  // 모드를 바꾸면 본문 위에 그대로 남아 클릭을 가로채 "내용 편집으로
  // 돌아가도 편집이 안 되는" 것처럼 보였습니다.
  useEffect(() => {
    if (!active) setTextAt(null)
  }, [active])

  // '이동' 모드를 끄거나 그리기 모드 자체를 벗어나면, 진행 중이던 드래그도
  // 함께 취소합니다(다른 모드로 넘어간 채 허공에 매달린 드래그가 남지 않도록).
  useEffect(() => {
    if (!active || !moveMode) {
      dragRef.current = null
      downPosRef.current = null
      setSelectedShapeId(null)
    }
  }, [active, moveMode])

  // ---------- 그리기 ----------
  // useLayoutEffect: 마우스를 누른 채 움직이는(드래그) 동안 매번 이 효과가
  // 다시 실행되는데, useEffect를 쓰면 브라우저가 화면을 이미 한 번 그린
  // '다음'에 캔버스가 업데이트되어(비동기) 한 프레임씩 늦게 보였습니다.
  // 놓는 순간까지는 아예 안 그려지는 것처럼 느껴졌던 원인이라, 화면에
  // 그리기 전에 동기적으로 실행되는 useLayoutEffect로 바꿨습니다.
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 화면 선명도를 위해 devicePixelRatio 반영
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, size.w, size.h)
    if (!drawing.visible) return

    // 이동 모드로 텍스트·도형을 드래그하는 중이면, 저장된 위치 대신 지금
    // 끌고 있는 임시 위치/크기로 그려서 실시간으로 따라오는 것처럼 보이게 합니다.
    const strokes = withDragOverride(drawing.strokes, dragRef.current)
    const all = draftRef.current ? [...strokes, draftRef.current] : strokes
    all.forEach((s) => paintStroke(ctx, s))
  }, [drawing, size, renderTick])

  // 좌표 얻기 (캔버스 기준)
  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }

  const onDown = (e: React.PointerEvent) => {
    if (!active) return
    const [x, y] = pos(e)

    if (moveMode) {
      e.currentTarget.setPointerCapture(e.pointerId)
      downPosRef.current = { x, y }

      // 0) 이미 선택된 도형의 손잡이(끝점)를 눌렀으면 크기·모양 조절 시작
      const selected = selectedShapeId ? drawing.strokes.find((s) => s.id === selectedShapeId) : undefined
      const handle = selected ? hitHandle(selected.points, x, y) : null
      if (selected && handle !== null) {
        dragRef.current = {
          type: 'shape-resize',
          id: selected.id,
          handle,
          x: selected.points[handle === 0 ? 0 : 2],
          y: selected.points[handle === 0 ? 1 : 3],
        }
        forceRender((n) => n + 1)
        return
      }

      // 1) 텍스트·이모지 획
      const ctx = canvasRef.current?.getContext('2d')
      const textHit = ctx ? hitTextAt(ctx, drawing.strokes, x, y) : null
      if (textHit) {
        setSelectedShapeId(null)
        dragRef.current = { type: 'text', id: textHit.id, dx: x - textHit.points[0], dy: y - textHit.points[1], x: textHit.points[0], y: textHit.points[1] }
        forceRender((n) => n + 1)
        return
      }

      // 2) 도형(선·화살표·사각형·원) — 선택하고 통째로 옮기기 시작
      const shapeHit = hitShapeAt(drawing.strokes, x, y)
      if (shapeHit) {
        setSelectedShapeId(shapeHit.id)
        dragRef.current = {
          type: 'shape-move',
          id: shapeHit.id,
          startX: x,
          startY: y,
          origPoints: [shapeHit.points[0], shapeHit.points[1], shapeHit.points[2], shapeHit.points[3]],
          dx: 0,
          dy: 0,
        }
        forceRender((n) => n + 1)
        return
      }

      // 3) 배경 이미지
      if (drawing.backgroundImage) {
        setSelectedShapeId(null)
        const bg = drawing.backgroundImagePos ?? { x: 0, y: 0 }
        dragRef.current = { type: 'bg', dx: x - bg.x, dy: y - bg.y, x: bg.x, y: bg.y }
        forceRender((n) => n + 1)
        return
      }

      // 빈 곳을 클릭 — 선택 해제
      setSelectedShapeId(null)
      dragRef.current = null
      forceRender((n) => n + 1)
      return
    }

    if (tool === 'text') {
      if (!textAt) setTextAt({ canvas: [x, y], client: [e.clientX, e.clientY] })
      return
    }

    e.currentTarget.setPointerCapture(e.pointerId)

    if (tool === 'eraser') {
      eraseAt(x, y)
      return
    }
    draftRef.current = {
      id: createId(),
      tool,
      color,
      width,
      alpha,
      points: [x, y],
    }
    forceRender((n) => n + 1)
  }

  const onMove = (e: React.PointerEvent) => {
    if (!active) return
    const [x, y] = pos(e)

    if (moveMode) {
      const drag = dragRef.current
      if (!drag) return
      if (drag.type === 'shape-resize') {
        drag.x = x
        drag.y = y
      } else if (drag.type === 'shape-move') {
        drag.dx = x - drag.startX
        drag.dy = y - drag.startY
      } else {
        drag.x = x - drag.dx
        drag.y = y - drag.dy
      }
      forceRender((n) => n + 1)
      return
    }

    if (tool === 'eraser' && e.buttons === 1) {
      eraseAt(x, y)
      return
    }
    const d = draftRef.current
    if (!d) return

    if (isShape(d.tool)) {
      // 도형은 시작점 + 현재점 두 개만 유지
      d.points = [d.points[0], d.points[1], x, y]
    } else {
      d.points.push(x, y)
    }
    forceRender((n) => n + 1)
  }

  const onUp = (e: React.PointerEvent) => {
    if (moveMode) {
      const drag = dragRef.current
      dragRef.current = null
      const down = downPosRef.current
      downPosRef.current = null
      if (!drag) return

      const [ux, uy] = pos(e)
      const moved = down ? Math.hypot(ux - down.x, uy - down.y) > 4 : true

      if (drag.type === 'bg') {
        setDrawingBackgroundPos(memoId, { x: drag.x, y: drag.y })
      } else if (drag.type === 'shape-move') {
        const [ox0, oy0, ox1, oy1] = drag.origPoints
        const newPoints = [ox0 + drag.dx, oy0 + drag.dy, ox1 + drag.dx, oy1 + drag.dy]
        setStrokes(memoId, drawing.strokes.map((s) => (s.id === drag.id ? { ...s, points: newPoints } : s)))
      } else if (drag.type === 'shape-resize') {
        setStrokes(
          memoId,
          drawing.strokes.map((s) => {
            if (s.id !== drag.id) return s
            const pts = [...s.points]
            if (drag.handle === 0) {
              pts[0] = drag.x
              pts[1] = drag.y
            } else {
              pts[2] = drag.x
              pts[3] = drag.y
            }
            return { ...s, points: pts }
          }),
        )
      } else {
        const target = drawing.strokes.find((s) => s.id === drag.id)
        setStrokes(memoId, drawing.strokes.map((s) => (s.id === drag.id ? { ...s, points: [drag.x, drag.y] } : s)))
        // 드래그하지 않고 짧게 클릭만 했다면 옮긴 게 아니라 고쳐 쓰려는 것으로 보고 편집창을 엽니다.
        if (!moved && target) {
          setTextAt({ canvas: [drag.x, drag.y], client: [e.clientX, e.clientY], editId: drag.id, initialText: target.text })
        }
      }
      forceRender((n) => n + 1)
      return
    }

    const d = draftRef.current
    draftRef.current = null
    if (!d) return
    // 점 하나만 찍혀도(짧게 톡 찍는 동작) 그대로 저장합니다. 예전에는 이런
    // 경우를 실수 클릭으로 보고 버렸는데, 그러면 누르는 동안엔 점이
    // 잠깐 보였다가 떼는 순간 사라져 버려서(특히 형광펜은 이 순간에만
    // 잠깐 보이다 없어지므로 "투명도가 안 보인다"처럼 느껴졌습니다).
    addStroke(memoId, d)
  }

  /** 지우개: 클릭 지점 근처를 지나는 획을 통째로 지웁니다. */
  const eraseAt = (x: number, y: number) => {
    const hit = drawing.strokes.filter((s) => {
      for (let i = 0; i < s.points.length; i += 2) {
        const dx = s.points[i] - x
        const dy = s.points[i + 1] - y
        if (dx * dx + dy * dy < 14 * 14) return true
      }
      return false
    })
    if (hit.length) removeStrokes(memoId, hit.map((s) => s.id))
  }

  // 지금 선택된 도형(있으면) — 드래그 중이면 임시(실시간) 위치/크기를 반영합니다.
  const selectedShape = selectedShapeId
    ? withDragOverride(drawing.strokes, dragRef.current).find((s) => s.id === selectedShapeId)
    : undefined

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-0"
      // 캡처(이미지 내보내기)에는 포함되어야 하므로 data-no-capture를 붙이지 않습니다.
    >
      {/* 이미지 위 주석용 배경 이미지 (필기보다 아래에 깔립니다). '이동' 모드로
          드래그하는 중이면 저장된 위치 대신 지금 끌고 있는 자리를 보여줍니다. */}
      {drawing.backgroundImage && drawing.visible && (
        <img
          src={drawing.backgroundImage}
          alt=""
          className="absolute max-w-full select-none"
          style={{
            left: dragRef.current?.type === 'bg' ? dragRef.current.x : (drawing.backgroundImagePos?.x ?? 0),
            top: dragRef.current?.type === 'bg' ? dragRef.current.y : (drawing.backgroundImagePos?.y ?? 0),
          }}
          draggable={false}
        />
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: size.w,
          height: size.h,
          cursor: active ? (moveMode ? (dragRef.current ? 'grabbing' : 'grab') : cursor) : undefined,
        }}
        className={`absolute left-0 top-0 ${active ? 'pointer-events-auto' : 'pointer-events-none'}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
      {/* 선택된 도형의 크기 조절 손잡이 — 실제 드래그 판정은 캔버스 쪽 좌표
          계산(hitHandle)이 담당하므로, 여기서는 순수 시각 표시만 합니다. */}
      {moveMode && selectedShape && (
        <>
          <div
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-white shadow-sm"
            style={{ left: selectedShape.points[0], top: selectedShape.points[1] }}
          />
          <div
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-white shadow-sm"
            style={{ left: selectedShape.points[2], top: selectedShape.points[3] }}
          />
        </>
      )}
      {textAt && (
        <TextStampEditor
          x={textAt.client[0]}
          y={textAt.client[1]}
          initialValue={textAt.initialText}
          onConfirm={(text) => {
            if (textAt.editId) {
              setStrokes(memoId, drawing.strokes.map((s) => (s.id === textAt.editId ? { ...s, text } : s)))
            } else {
              addStroke(memoId, {
                id: createId(),
                tool: 'text',
                color,
                width,
                alpha,
                points: textAt.canvas,
                text,
              })
            }
            setTextAt(null)
          }}
          onCancel={() => setTextAt(null)}
        />
      )}
    </div>
  )
}

/** 도형 계열인지 (시작점·끝점만 쓰는 도구) */
function isShape(tool: Stroke['tool']): boolean {
  return tool === 'line' || tool === 'arrow' || tool === 'rect' || tool === 'circle'
}

/** 텍스트 획 하나가 화면에서 차지하는 대략적인 사각 영역 (paintStroke와 같은 글꼴 설정 사용) */
function textBounds(ctx: CanvasRenderingContext2D, s: Stroke): [number, number, number, number] {
  const fontSize = Math.max(14, s.width * 2)
  if (!s.text) return [s.points[0], s.points[1], s.points[0], s.points[1] + fontSize]
  ctx.save()
  ctx.font = `${fontSize}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`
  const w = ctx.measureText(s.text).width
  ctx.restore()
  return [s.points[0], s.points[1], s.points[0] + w, s.points[1] + fontSize * 1.2]
}

/** '이동' 모드에서 클릭·드래그 시작 지점에 놓인 텍스트 획을 찾습니다(맨 위에 그려진 것부터). */
function hitTextAt(ctx: CanvasRenderingContext2D, strokes: Stroke[], x: number, y: number): Stroke | null {
  const PAD = 4
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i]
    if (s.tool !== 'text' || !s.text) continue
    const [x0, y0, x1, y1] = textBounds(ctx, s)
    if (x >= x0 - PAD && x <= x1 + PAD && y >= y0 - PAD && y <= y1 + PAD) return s
  }
  return null
}

/** 점 (px,py)에서 선분 (x0,y0)-(x1,y1)까지의 최단 거리 */
function distToSegment(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0
  const dy = y1 - y0
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - x0, py - y0)
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lenSq))
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy))
}

/** '이동' 모드에서 클릭·드래그 시작 지점에 놓인 도형(선·화살표·사각형·원)을 찾습니다. */
function hitShapeAt(strokes: Stroke[], x: number, y: number): Stroke | null {
  const PAD = 8
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i]
    if (!isShape(s.tool)) continue
    const [x0, y0, x1, y1] = s.points
    if (s.tool === 'line' || s.tool === 'arrow') {
      if (distToSegment(x, y, x0, y0, x1, y1) <= PAD + s.width / 2) return s
    } else {
      // 사각형·원은 경계 상자 안(여유 포함)이면 클릭한 것으로 봅니다.
      const minX = Math.min(x0, x1) - PAD
      const maxX = Math.max(x0, x1) + PAD
      const minY = Math.min(y0, y1) - PAD
      const maxY = Math.max(y0, y1) + PAD
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) return s
    }
  }
  return null
}

/** 선택된 도형의 양 끝 손잡이(0: 시작점, 1: 끝점) 중 클릭 지점에 놓인 것을 찾습니다. */
function hitHandle(points: number[], x: number, y: number): 0 | 1 | null {
  const R = 10
  if (Math.hypot(x - points[0], y - points[1]) <= R) return 0
  if (Math.hypot(x - points[2], y - points[3]) <= R) return 1
  return null
}

/**
 * '이동' 모드에서 드래그 중인 대상이 있으면, 실제 저장된 값 대신 지금
 * 화면에 보여야 할 임시 위치/크기로 바꿔서 돌려줍니다(아직 저장 전).
 */
function withDragOverride(strokes: Stroke[], drag: DragState): Stroke[] {
  if (!drag) return strokes
  if (drag.type === 'text') {
    return strokes.map((s) => (s.id === drag.id ? { ...s, points: [drag.x, drag.y] } : s))
  }
  if (drag.type === 'shape-move') {
    const [ox0, oy0, ox1, oy1] = drag.origPoints
    return strokes.map((s) =>
      s.id === drag.id ? { ...s, points: [ox0 + drag.dx, oy0 + drag.dy, ox1 + drag.dx, oy1 + drag.dy] } : s,
    )
  }
  if (drag.type === 'shape-resize') {
    return strokes.map((s) => {
      if (s.id !== drag.id) return s
      const pts = [...s.points]
      if (drag.handle === 0) {
        pts[0] = drag.x
        pts[1] = drag.y
      } else {
        pts[2] = drag.x
        pts[3] = drag.y
      }
      return { ...s, points: pts }
    })
  }
  return strokes // 'bg'는 strokes가 아니라 배경 이미지 자체의 위치라 여기서는 영향 없음
}

/** 펜·연필·형광펜을 고르면 커서 자체를 선택된 색·굵기의 작은 원으로 바꿔서,
 *  드래그를 시작하기 전부터 어떤 색·굵기로 그려질지 미리 보여줍니다. */
function cursorFor(tool: Stroke['tool'], color: string, width: number, alpha: number): string {
  if (tool !== 'pen' && tool !== 'pencil' && tool !== 'highlighter') return 'crosshair'
  const size = Math.min(Math.max(width + 8, 14), 40)
  const c = size / 2
  const r = c - 1.5
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<circle cx='${c}' cy='${c}' r='${r}' fill='${color}' fill-opacity='${Math.max(alpha, 0.35)}' stroke='rgba(0,0,0,0.45)' stroke-width='1'/>` +
    `</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${c} ${c}, crosshair`
}

/** 획 하나를 캔버스에 그립니다. */
function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  const p = s.points
  if (p.length < 2) return

  if (s.tool === 'text') {
    if (!s.text) return
    ctx.save()
    ctx.globalAlpha = s.alpha
    ctx.fillStyle = s.color
    ctx.font = `${Math.max(14, s.width * 2)}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(s.text, p[0], p[1])
    ctx.restore()
    return
  }

  // 자유곡선 도구(펜·연필·형광펜)를 막 찍은 순간(점 하나뿐일 때)에도
  // 즉시 색이 보이도록 원으로 채웁니다. 형광펜은 선 끝을 butt로 그리는데,
  // butt는 길이가 0인 선을 아예 그리지 않아 그 순간엔 투명도가 안 보이는
  // 것처럼 보였습니다(획을 다 그은 뒤에야 비로소 보임).
  if (!isShape(s.tool) && p.length === 2) {
    ctx.save()
    ctx.globalAlpha = s.alpha
    ctx.fillStyle = s.color
    ctx.beginPath()
    ctx.arc(p[0], p[1], s.width / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }

  ctx.save()
  ctx.globalAlpha = s.alpha
  ctx.strokeStyle = s.color
  ctx.lineWidth = s.width
  ctx.lineCap = s.tool === 'highlighter' ? 'butt' : 'round'
  ctx.lineJoin = 'round'

  // 연필은 살짝 거친 느낌을 주기 위해 점선 패턴을 사용
  if (s.tool === 'pencil') ctx.setLineDash([s.width * 0.9, s.width * 0.6])

  const [x0, y0] = [p[0], p[1]]
  const [x1, y1] = [p[p.length - 2], p[p.length - 1]]

  ctx.beginPath()
  switch (s.tool) {
    case 'rect':
      ctx.rect(x0, y0, x1 - x0, y1 - y0)
      break
    case 'circle': {
      // 두 점을 지름으로 하는 타원
      const cx = (x0 + x1) / 2
      const cy = (y0 + y1) / 2
      ctx.ellipse(cx, cy, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, Math.PI * 2)
      break
    }
    case 'line':
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      break
    case 'arrow': {
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      // 화살촉
      const angle = Math.atan2(y1 - y0, x1 - x0)
      const head = Math.max(10, s.width * 3.5)
      ctx.moveTo(x1, y1)
      ctx.lineTo(x1 - head * Math.cos(angle - Math.PI / 6), y1 - head * Math.sin(angle - Math.PI / 6))
      ctx.moveTo(x1, y1)
      ctx.lineTo(x1 - head * Math.cos(angle + Math.PI / 6), y1 - head * Math.sin(angle + Math.PI / 6))
      break
    }
    default: {
      // 자유곡선: 중간점을 이어 부드럽게
      ctx.moveTo(p[0], p[1])
      for (let i = 2; i < p.length - 2; i += 2) {
        const mx = (p[i] + p[i + 2]) / 2
        const my = (p[i + 1] + p[i + 3]) / 2
        ctx.quadraticCurveTo(p[i], p[i + 1], mx, my)
      }
      ctx.lineTo(p[p.length - 2], p[p.length - 1])
    }
  }
  ctx.stroke()
  ctx.restore()
}
