import { useRef, useState } from 'react'
import { Folder, Tag as TagIcon } from 'lucide-react'
import type { Memo } from '@/types'
import { useScratchStore, MAIN_SCRATCH_ID } from '@/store/useScratchStore'
import { DEFAULT_POPUP } from '@/store/useMemoStore'
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
  const isDark = useSettingsStore((s) => s.theme === 'dark')

  const [mode, setMode] = useState<EditMode | null>(null)

  const fontFamily = resolveFont(design.font)
  const titleFontFamily = resolveFont(design.titleFont ?? design.font)
  const label = getLabel(scratch.label)

  const saveFromDom = () => {
    if (editorRef.current) updateScratch(MAIN_SCRATCH_ID, { content: editorRef.current.innerHTML })
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
