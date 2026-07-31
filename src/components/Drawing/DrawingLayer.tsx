import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

export function DrawingLayer({ memoId, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const drawing = useMemoStore((s) => s.getDrawing(memoId))
  const addStroke = useMemoStore((s) => s.addStroke)
  const removeStrokes = useMemoStore((s) => s.removeStrokes)
  const { tool, color, width, alpha } = useDrawStore()

  // 그리는 중인 획 (아직 저장 전)
  const draftRef = useRef<Stroke | null>(null)
  const [, forceRender] = useState(0)
  const [size, setSize] = useState({ w: 0, h: 0 })
  // '텍스트' 도구로 캔버스를 클릭한 위치. canvas는 획 좌표(캔버스 기준),
  // client는 입력 패널을 화면에 고정 배치하기 위한 뷰포트 기준 좌표입니다.
  const [textAt, setTextAt] = useState<{ canvas: [number, number]; client: [number, number] } | null>(null)

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

  // ---------- 그리기 ----------
  useEffect(() => {
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

    const all = draftRef.current ? [...drawing.strokes, draftRef.current] : drawing.strokes
    all.forEach((s) => paintStroke(ctx, s))
  }, [drawing, size, forceRender])

  // 좌표 얻기 (캔버스 기준)
  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }

  const onDown = (e: React.PointerEvent) => {
    if (!active) return
    const [x, y] = pos(e)

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

  const onUp = () => {
    const d = draftRef.current
    draftRef.current = null
    if (!d) return
    // 점 하나만 찍힌 건 무시 (실수 클릭)
    if (d.points.length < 4 && !isShape(d.tool)) {
      forceRender((n) => n + 1)
      return
    }
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

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-0"
      // 캡처(이미지 내보내기)에는 포함되어야 하므로 data-no-capture를 붙이지 않습니다.
    >
      {/* 이미지 위 주석용 배경 이미지 (필기보다 아래에 깔립니다) */}
      {drawing.backgroundImage && drawing.visible && (
        <img
          src={drawing.backgroundImage}
          alt=""
          className="absolute left-0 top-0 max-w-full select-none"
          draggable={false}
        />
      )}
      <canvas
        ref={canvasRef}
        style={{ width: size.w, height: size.h }}
        className={`absolute left-0 top-0 ${
          active ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
        }`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
      {textAt && (
        <TextStampEditor
          x={textAt.client[0]}
          y={textAt.client[1]}
          onConfirm={(text) => {
            addStroke(memoId, {
              id: createId(),
              tool: 'text',
              color,
              width,
              alpha,
              points: textAt.canvas,
              text,
            })
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
