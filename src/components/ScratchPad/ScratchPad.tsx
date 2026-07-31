import { useRef, useState } from 'react'
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
    // RichTextEditor는 value(스토어 값)가 바뀌면 useEffect에서 뒤늦게(다음 렌더 이후)
    // DOM을 비웁니다. 그 틈에 사용자가 곧바로 타이핑을 시작하면, 키 입력이 먼저
    // "아직 안 지워진" 옛 DOM에 들어갔다가 뒤늦게 그 useEffect가 값(빈 문자열)으로
    // 강제로 덮어써 버려서 방금 친 글자가 사라졌습니다 — "바로 치면 안 되고 조금
    // 있다 치면 된다"는 증상과 정확히 일치합니다. 여기서 DOM을 바로 비우고
    // 포커스를 줘서 그 틈 자체를 없앱니다.
    if (editorRef.current) editorRef.current.innerHTML = ''
    editorRef.current?.focus()
    // confirm() 같은 네이티브 다이얼로그가 뜬 뒤에는(Windows에서 특히) 창이 OS
    // 차원의 키보드 초점을 실제로 돌려받기까지 살짝 시간이 걸릴 수 있어서, 위에서
    // 바로 부른 focus()가 씹힐 수 있습니다. 창이 실제로 초점을 되찾는 순간(window의
    // focus 이벤트)에 한 번 더 focus()를 걸어 두 경우 모두 커버합니다.
    const refocus = () => editorRef.current?.focus()
    window.addEventListener('focus', refocus, { once: true })
    setTimeout(() => window.removeEventListener('focus', refocus), 500)
  }

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
          key={MAIN_SCRATCH_ID}
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
