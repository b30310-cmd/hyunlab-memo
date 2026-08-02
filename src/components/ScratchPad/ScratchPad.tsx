import { useEffect, useRef, useState } from 'react'
import { Folder, Plus, Tag as TagIcon } from 'lucide-react'
import type { Memo } from '@/types'
import { useScratchStore, MAIN_SCRATCH_ID } from '@/store/useScratchStore'
import { DEFAULT_POPUP, useMemoStore } from '@/store/useMemoStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useScratchSave } from '@/hooks/useScratchSave'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { EditorToolbar } from '@/components/Editor/EditorToolbar'
import { EditModeBar, type EditMode } from '@/components/Editor/EditModeBar'
import { DrawingLayer } from '@/components/Drawing/DrawingLayer'
import { DrawingToolbar } from '@/components/Drawing/DrawingToolbar'
import { Popover } from '@/components/common/Popover'
import { Button, IconButton, ICON } from '@/components/ui/Button'
import { LabelPicker } from '@/components/ui/LabelPicker'
import { SaveToProjectMenu } from './SaveToProjectMenu'
import { memoStyle, resolveFont, getLabel } from '@/lib/constants'
import { stripHtml } from '@/lib/filter'
import { refocusWindow } from '@/lib/electron'

// ============================================================
// 스크래치패드 — 프로젝트를 먼저 고민하지 않고 자유롭게 쓰는 임시 작업 공간.
//  메인 화면에 항상 떠 있는 고정 슬롯(MAIN_SCRATCH_ID)입니다.
//  '새 메모' 버튼으로 여는 것은 이것과 별개로, 독립된 팝업 창(ScratchPopupWindow)입니다.
//
//  자동 저장은 되지만 메모 목록/프로젝트 개수에는 잡히지 않습니다.
//  반드시 프로젝트를 골라야 저장되며(미분류 저장 없음), 그 순간 비로소 진짜 메모가 됩니다.
// ============================================================

export function ScratchPad() {
  const editorRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { scratch, design, saveAs } = useScratchSave(MAIN_SCRATCH_ID, editorRef)
  const updateScratch = useScratchStore((s) => s.update)
  const resetDraft = useScratchStore((s) => s.resetDraft)
  const drawing = useMemoStore((s) => s.getDrawing(MAIN_SCRATCH_ID))
  const setStrokes = useMemoStore((s) => s.setStrokes)
  const setDrawingBackground = useMemoStore((s) => s.setDrawingBackground)
  const isDark = useSettingsStore((s) => s.theme === 'dark')

  const [mode, setMode] = useState<EditMode | null>(null)
  // "새 메모"를 누를 때마다 RichTextEditor를 통째로 새로 만들기(remount) 위한 키.
  // 값을 지웠다가 채워 넣는 방식(innerHTML 직접 조작)은 그래도 "지웠다"는 신호가
  // 다음 렌더에 뒤늦게 반영되는 순간이 남아 있어서, 그 짧은 틈에 바로 타이핑하면
  // 입력이 사라지는 문제가 재발했습니다(특히 한글 IME 조합 중에는 이 틈이 더 잘
  // 벌어지는 것으로 보입니다). 아예 새 DOM 노드로 통째로 바꿔치기하면 "지우기
  // 전/후"라는 중간 상태 자체가 없어져 이 문제가 원천적으로 사라집니다.
  const [resetSeq, setResetSeq] = useState(0)

  const fontFamily = resolveFont(design.font)
  const titleFontFamily = resolveFont(design.titleFont ?? design.font)
  const label = getLabel(scratch.label)

  const saveFromDom = () => {
    if (editorRef.current) updateScratch(MAIN_SCRATCH_ID, { content: editorRef.current.innerHTML })
  }

  // 쓰다가 틀려서 다 지우기보다, 지금 내용은 버리고 완전히 빈 상태로
  // 새로 시작할 수 있는 버튼. 잃을 내용이 있을 때만 한 번 확인합니다.
  const hasContent = Boolean(
    scratch.title.trim() || stripHtml(scratch.content).trim() || drawing.strokes.length || drawing.backgroundImage,
  )
  const startNewMemo = () => {
    if (hasContent && !confirm('지금 쓰고 있는 내용을 지우고 새 메모를 시작할까요?\n(저장하지 않은 내용은 사라집니다)')) return
    resetDraft(MAIN_SCRATCH_ID)
    if (drawing.strokes.length) setStrokes(MAIN_SCRATCH_ID, [])
    if (drawing.backgroundImage) setDrawingBackground(MAIN_SCRATCH_ID, undefined)
    // 아래 RichTextEditor를 통째로 새 DOM 노드로 바꿔치기합니다(key 변경).
    // 실제 포커스는 그 노드가 마운트된 뒤(아래 useEffect)에 줍니다.
    setResetSeq((n) => n + 1)
  }

  // resetSeq가 바뀌어 RichTextEditor가 새 DOM 노드로 마운트된 다음(=이 effect가
  // 실행되는 시점) 포커스를 줍니다.
  //
  // element.focus()만으로는 안 되는 경우가 실제로 있었습니다: document.
  // activeElement는 새 입력창을 정확히 가리키는데도 실제 키보드 입력이
  // 안 들어오고, 다른 창(팝업)을 열었다 닫거나 이 창을 최소화했다 복원해야
  // 그제서야 입력이 되는 증상이었습니다 — Windows에서 진짜 창 포커스
  // 전환이 한 번 일어나야 Chromium의 키보드 라우팅 상태가 다시 맞춰지는
  // 것으로 보입니다. refocusWindow()가 창을 blur() 했다가 곧바로 focus()
  // 해서 그 "진짜 포커스 전환"을 강제로 한 번 일으켜, 다른 창을 열었다
  // 닫는 것과 같은 효과를 냅니다.
  useEffect(() => {
    if (resetSeq === 0) return
    editorRef.current?.focus()
    refocusWindow()
    const refocus = () => editorRef.current?.focus()
    window.addEventListener('focus', refocus, { once: true })
    const t = setTimeout(() => window.removeEventListener('focus', refocus), 500)
    return () => {
      clearTimeout(t)
      window.removeEventListener('focus', refocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSeq])

  // EditModeBar·DrawingLayer 등 기존 컴포넌트가 기대하는 Memo 모양으로 맞춰줍니다.
  // (실제 메모 목록에는 존재하지 않는, 화면 표시용 임시 객체입니다)
  const pseudoMemo: Memo = {
    id: MAIN_SCRATCH_ID,
    projectId: null,
    title: scratch.title,
    content: scratch.content,
    label: scratch.label,
    tags: scratch.tags,
    pinned: false,
    favorite: false,
    reminder: scratch.reminder,
    popup: DEFAULT_POPUP,
    createdAt: scratch.updatedAt,
    updatedAt: scratch.updatedAt,
  }

  return (
    <div className="flex h-full flex-col" style={memoStyle(design, isDark)}>
      {/* ── 헤더 — 라벨 + 저장 버튼 (고정·즐겨찾기·더보기는 저장 전이라 아직 의미가 없어 뺐습니다) ── */}
      <div className="flex h-12 shrink-0 items-center gap-1 px-5">
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
              value={scratch.label}
              onChange={(l) => {
                updateScratch(MAIN_SCRATCH_ID, { label: l })
                close()
              }}
            />
          )}
        </Popover>

        {label && <span className="text-sm font-medium text-muted">{label.name}</span>}

        <div className="flex-1" />

        <Button
          variant="secondary"
          size="sm"
          onClick={startNewMemo}
          title="지금 내용을 지우고 완전히 빈 메모로 새로 시작합니다"
        >
          <Plus size={ICON.sm} /> 새 메모
        </Button>

        <Popover
          align="right"
          trigger={() => (
            <Button variant="primary" size="sm">
              <Folder size={ICON.sm} /> 프로젝트에 저장
            </Button>
          )}
        >
          {(close) => (
            <SaveToProjectMenu
              onSave={(projectId) => {
                saveAs(projectId, true)
                close()
              }}
            />
          )}
        </Popover>
      </div>

      {/* ── 제목 ── */}
      <div className="shrink-0 px-5 pb-1">
        <input
          value={scratch.title}
          onChange={(e) => updateScratch(MAIN_SCRATCH_ID, { title: e.target.value })}
          placeholder="제목 없음 — 생각나는 대로 자유롭게 써보세요"
          className="w-full bg-transparent text-[22px] font-bold leading-snug tracking-tight text-body outline-none placeholder:font-semibold placeholder:text-faint"
          style={{ fontFamily: titleFontFamily }}
        />
      </div>

      {/* ── 모드 : 내용 편집 / 그리기·주석 / 관리 ── */}
      <div className="shrink-0 px-5 py-2">
        <EditModeBar
          memo={pseudoMemo}
          mode={mode}
          onModeChange={setMode}
          onMemoUpdate={(patch) => updateScratch(MAIN_SCRATCH_ID, patch)}
        />
      </div>

      {mode === 'content' && (
        <EditorToolbar
          onAfter={saveFromDom}
          focusEditor={() => editorRef.current?.focus()}
          defaultFontSize={design.fontSize}
        />
      )}
      {mode === 'draw' && <DrawingToolbar memoId={MAIN_SCRATCH_ID} />}

      {/* ── 본문 ── */}
      <div ref={surfaceRef} className="relative flex-1 overflow-y-auto px-5 pb-6 pt-2">
        <RichTextEditor
          key={`${MAIN_SCRATCH_ID}-${resetSeq}`}
          editorRef={editorRef}
          value={scratch.content}
          onChange={(html) => updateScratch(MAIN_SCRATCH_ID, { content: html })}
          fontFamily={fontFamily}
          fontSize={design.fontSize}
          placeholder="메모를 입력하세요"
          className="min-h-full"
        />
        <DrawingLayer memoId={MAIN_SCRATCH_ID} active={mode === 'draw'} />
      </div>

      {/* ── 하단 상태 ── */}
      <div className="flex h-8 shrink-0 items-center justify-between px-5 text-xs text-faint">
        <span>임시 작업 공간 — 자동 저장됨 (아직 프로젝트에는 등록되지 않았습니다)</span>
        <span>{design.fontSize}px</span>
      </div>
    </div>
  )
}
