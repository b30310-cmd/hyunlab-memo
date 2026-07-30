import { useEffect, useRef, useState } from 'react'
import {
  Pin, Star, ExternalLink, MoreHorizontal, Tag as TagIcon, Folder,
} from 'lucide-react'
import type { Memo } from '@/types'
import { useMemoStore } from '@/store/useMemoStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { EditorToolbar } from './EditorToolbar'
import { Popover } from '@/components/common/Popover'
import { IconButton, ICON } from '@/components/ui/Button'
import { LabelPicker } from '@/components/ui/LabelPicker'
import { ProjectPicker } from '@/components/ui/ProjectPicker'
import { memoStyle, resolveFont, getLabel } from '@/lib/constants'
import { openPopupMemo } from '@/lib/electron'
import { MemoMenu } from './MemoMenu'
import { EditModeBar, type EditMode } from './EditModeBar'
import { DrawingLayer } from '@/components/Drawing/DrawingLayer'
import { DrawingToolbar } from '@/components/Drawing/DrawingToolbar'

// ============================================================
// 메모 편집 영역
//
// 【화면 구성】
//   1. 헤더   — 라벨 · 고정 · 즐겨찾기 · 팝업 · 더보기
//   2. 제목   — 크고 굵게. 본문과 확실히 구분됩니다.
//   3. 모드   — 내용 편집 / 그리기·주석 / 관리 (4단계: 3모드로 재구성)
//   4. 본문   — 넉넉한 여백
// ============================================================

export function Editor({ memo }: { memo: Memo }) {
  const { updateMemo, togglePin, toggleFavorite, snapshot, moveMemoToProject } = useMemoStore()
  const design = useMemoStore((s) => s.getDesign(memo.id))
  const projects = useMemoStore((s) => s.projects)
  const isDark = useSettingsStore((s) => s.theme === 'dark')
  const editorRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)

  const [mode, setMode] = useState<EditMode | null>(null)

  const fontFamily = resolveFont(design.font)
  const titleFontFamily = resolveFont(design.titleFont ?? design.font)
  const label = getLabel(memo.label)
  const project = projects.find((p) => p.id === memo.projectId)

  // 다른 메모로 옮기면 항상 단순한 화면으로 되돌립니다.
  useEffect(() => {
    setMode(null)
  }, [memo.id])

  // 메모를 열면 바로 쓸 수 있게 본문에 포커스
  useEffect(() => {
    const t = setTimeout(() => editorRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [memo.id])

  // 2초간 입력이 멈추면 되돌리기용 기록을 남깁니다.
  useEffect(() => {
    const t = setTimeout(() => snapshot(memo.id), 2000)
    return () => clearTimeout(t)
  }, [memo.content, memo.id, snapshot])

  const saveFromDom = () => {
    if (editorRef.current) updateMemo(memo.id, { content: editorRef.current.innerHTML })
  }

  return (
    <div className="flex h-full flex-col" style={memoStyle(design, isDark)}>
      {/* ── 1. 헤더 ── */}
      <div className="flex h-12 shrink-0 items-center gap-1 px-5">
        {/* 컬러 라벨 */}
        <Popover
          trigger={() => (
            <IconButton title={label ? `라벨: ${label.name}` : '라벨 지정'}>
              {label ? (
                <span className="h-3 w-3 rounded-full" style={{ background: label.color }} />
              ) : (
                <TagIcon size={ICON.lg} />
              )}
            </IconButton>
          )}
        >
          {(close) => (
            <LabelPicker
              value={memo.label}
              onChange={(l) => {
                updateMemo(memo.id, { label: l })
                close()
              }}
            />
          )}
        </Popover>

        {label && <span className="text-sm font-medium text-muted">{label.name}</span>}

        {/* 프로젝트 (눌러서 바로 다른 프로젝트로 이동) */}
        <Popover
          trigger={() => (
            <IconButton title={project ? `프로젝트: ${project.name}` : '프로젝트로 이동'}>
              <Folder size={ICON.lg} style={project ? { color: project.color } : undefined} />
            </IconButton>
          )}
        >
          {(close) => (
            <ProjectPicker
              projects={projects}
              value={memo.projectId}
              onChange={(projectId) => {
                moveMemoToProject(memo.id, projectId)
                close()
              }}
            />
          )}
        </Popover>
        {project && (
          <span className="truncate text-sm font-medium" style={{ color: project.color }}>
            {project.name}
          </span>
        )}

        <div className="flex-1" />

        <IconButton
          title={memo.pinned ? '고정 해제 — 지금은 이 프로젝트 목록 맨 위에 있어요' : '고정 — 이 프로젝트 목록 맨 위에 표시'}
          active={memo.pinned}
          onClick={() => togglePin(memo.id)}
        >
          <Pin size={ICON.lg} className={memo.pinned ? 'fill-current' : ''} />
        </IconButton>
        <IconButton
          title={memo.favorite ? '즐겨찾기 해제 — 지금은 즐겨찾기 모아보기에 있어요' : '즐겨찾기 — 전체 즐겨찾기 모아보기에 추가'}
          active={memo.favorite}
          onClick={() => toggleFavorite(memo.id)}
        >
          <Star size={ICON.lg} className={memo.favorite ? 'fill-current text-amber-400' : ''} />
        </IconButton>
        <IconButton title="팝업으로 열기" onClick={() => openPopupMemo(memo.id, memo.popup)}>
          <ExternalLink size={ICON.lg} />
        </IconButton>
        <Popover
          align="right"
          trigger={() => (
            <IconButton title="더보기">
              <MoreHorizontal size={ICON.lg} />
            </IconButton>
          )}
        >
          {(close) => <MemoMenu memo={memo} surfaceRef={surfaceRef} onDone={close} />}
        </Popover>
      </div>

      {/* ── 2. 제목 ── 크고 굵게, 본문과 여백으로 분리 */}
      <div className="shrink-0 px-5 pb-1">
        <input
          value={memo.title}
          onChange={(e) => updateMemo(memo.id, { title: e.target.value })}
          placeholder="제목 없음"
          className="w-full bg-transparent text-[22px] font-bold leading-snug tracking-tight text-body outline-none placeholder:font-semibold placeholder:text-faint"
          style={{ fontFamily: titleFontFamily }}
        />
      </div>

      {/* ── 3. 모드 : 내용 편집 / 그리기·주석 / 관리 ── */}
      <div className="shrink-0 px-5 py-2">
        <EditModeBar memo={memo} mode={mode} onModeChange={setMode} />
      </div>

      {/* ── 서식 / 그리기 툴바 (해당 모드일 때만) ── */}
      {mode === 'content' && (
        <EditorToolbar
          onAfter={saveFromDom}
          focusEditor={() => editorRef.current?.focus()}
          defaultFontSize={design.fontSize}
        />
      )}
      {mode === 'draw' && <DrawingToolbar memoId={memo.id} />}

      {/* ── 4. 본문 ── */}
      <div ref={surfaceRef} className="relative flex-1 overflow-y-auto px-5 pb-6 pt-2">
        <RichTextEditor
          key={memo.id}
          editorRef={editorRef}
          value={memo.content}
          onChange={(html) => updateMemo(memo.id, { content: html })}
          fontFamily={fontFamily}
          fontSize={design.fontSize}
          className="min-h-full"
        />
        <DrawingLayer memoId={memo.id} active={mode === 'draw'} />
      </div>

      {/* ── 하단 상태 ── */}
      <div className="flex h-8 shrink-0 items-center justify-between px-5 text-xs text-faint">
        <span>{new Date(memo.updatedAt).toLocaleString('ko-KR')} 저장됨</span>
        <span>{design.fontSize}px</span>
      </div>
    </div>
  )
}
