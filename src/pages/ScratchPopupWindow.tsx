import { useEffect, useRef, useState } from 'react'
import {
  Pin, X, MoreHorizontal, Tag as TagIcon, Settings,
  Folder, ArrowUpToLine, Check, ChevronLeft,
  ArrowLeftToLine, ArrowRightToLine, Bell,
} from 'lucide-react'
import type { Memo } from '@/types'
import { DEFAULT_POPUP } from '@/store/useMemoStore'
import { useAlertStore } from '@/store/useAlertStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useScratchStore } from '@/store/useScratchStore'
import { useScratchSave } from '@/hooks/useScratchSave'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { EditorToolbar } from '@/components/Editor/EditorToolbar'
import { EditModeBar, type EditMode } from '@/components/Editor/EditModeBar'
import { Popover } from '@/components/common/Popover'
import { ContextMenu, type ContextMenuState } from '@/components/ui/ContextMenu'
import { DrawingLayer } from '@/components/Drawing/DrawingLayer'
import { DrawingToolbar } from '@/components/Drawing/DrawingToolbar'
import { IconButton, MenuItem, MenuDivider, MenuLabel, ICON } from '@/components/ui/Button'
import { LabelPicker } from '@/components/ui/LabelPicker'
import { SaveToProjectMenu } from '@/components/ScratchPad/SaveToProjectMenu'
import { memoStyle, resolveColor, resolveFont, getLabel } from '@/lib/constants'
import { electron, isElectron } from '@/lib/electron'

// ============================================================
// 스크래치(임시) 팝업 창 — '새 메모' 버튼을 누르면 뜨는, 아직 저장 전인 초안.
//
//  일반 팝업 메모(PopupWindow)와 똑같이 서식·그리기·이미지·특수이모티콘·
//  알림을 전부 쓸 수 있습니다. 여러 개 동시에 띄울 수 있고, 각자 독립적으로
//  자동 저장됩니다. 닫아도 내용은 사라지지 않고, '더보기'에서
//  프로젝트에 저장을 고르면 그때 비로소 진짜 메모가 됩니다
//  (저장하는 순간 이 창은 자동으로 닫힙니다. 프로젝트 없이 저장하는 기능은 없습니다).
// ============================================================

export function ScratchPopupWindow({ draftId }: { draftId: string }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { scratch, design, saveAs } = useScratchSave(draftId, editorRef)
  const updateScratch = useScratchStore((s) => s.update)
  const removeDraft = useScratchStore((s) => s.removeDraft)
  const isDark = useSettingsStore((s) => s.theme === 'dark')
  // 이 초안에 걸어 둔 알림이 방금 울렸으면(다른 창의 알림 스케줄러가 알려줌)
  // 창을 주황색으로 표시해서 눈에 띄게 합니다. 클릭하면 확인 처리됩니다.
  const myAlert = useAlertStore((s) => s.alerts.find((a) => a.memoId === draftId))
  const dismissAlert = useAlertStore((s) => s.dismiss)

  const [mode, setMode] = useState<EditMode | null>(null)
  const [alwaysOnTop, setAlwaysOnTop] = useState(true)
  // 저장 전 초안 창이라 alwaysOnTop처럼 이 창의 수명 동안만 유지되면 되고,
  // 메모 자체에 저장할 필요는 없습니다.
  const [peekEdge, setPeekEdge] = useState<'left' | 'right' | null>(null)
  // 사이드바 메모 카드와 동일하게, 팝업에서도 우클릭하면 같은 관리 메뉴(더보기)가 뜹니다.
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null)

  const close = () => (isElectron() ? electron()?.closeWindow() : window.close())

  useEffect(() => {
    document.body.style.background = resolveColor(design.color, isDark)
  }, [design.color, isDark])

  useEffect(() => {
    const t = setTimeout(() => editorRef.current?.focus(), 50)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fontFamily = resolveFont(design.font)
  const label = getLabel(scratch.label)

  const toggleAlwaysOnTop = () => {
    const next = !alwaysOnTop
    setAlwaysOnTop(next)
    electron()?.setAlwaysOnTop(next)
  }

  /** 모서리 피크: 켜면 화면 밖으로 살짝만 보이게 숨겼다가, 마우스를 올리면 펼쳐집니다. */
  const togglePeek = (edge: 'left' | 'right') => {
    const next = peekEdge === edge ? null : edge
    setPeekEdge(next)
    // 피크는 다른 창에 가려지면 의미가 없어서, 켜는 동시에 항상 위도 함께 켭니다.
    if (next) setAlwaysOnTop(true)
    if (next) electron()?.enablePeek(next)
    else electron()?.disablePeek()
  }

  const saveFromDom = () => {
    if (editorRef.current) updateScratch(draftId, { content: editorRef.current.innerHTML })
  }

  /** 저장하면 이 팝업의 역할은 끝나므로 창을 닫습니다. */
  const saveAndClose = (projectId: string) => {
    saveAs(projectId, false)
    close()
  }

  // EditModeBar·DrawingLayer가 기대하는 Memo 모양으로 맞춰줍니다.
  const pseudoMemo: Memo = {
    id: draftId,
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
    <div
      className="relative flex h-screen flex-col overflow-hidden"
      style={memoStyle(design, isDark)}
      onMouseEnter={() => { if (peekEdge) electron()?.peekReveal() }}
      onMouseLeave={() => { if (peekEdge) electron()?.peekCollapse() }}
    >
      {/* 알림이 방금 울렸으면 창 전체를 주황색으로 표시. 클릭하면 확인 처리됩니다. */}
      {myAlert && (
        <button
          onClick={() => dismissAlert(myAlert.id)}
          title="알림 시각이 되었습니다 — 클릭하면 확인 처리됩니다"
          className="animate-pulse absolute inset-0 z-50 flex items-center justify-center gap-2 bg-[#ff8a5c] text-white"
        >
          <Bell size={ICON.lg} />
          <span className="text-sm font-semibold">알림 — 클릭해서 확인</span>
        </button>
      )}

      {/* ── 상단 바 : 라벨 · 제목 · 항상 위 · 더보기 · 닫기 ── */}
      <div
        className="drag-region flex h-9 shrink-0 items-center gap-0.5 px-1.5"
        onContextMenu={(e) => {
          e.preventDefault()
          setCtxMenu({ x: e.clientX, y: e.clientY, targetId: draftId })
        }}
      >
        <Popover
          trigger={() => (
            <IconButton title={label ? `라벨: ${label.name}` : '라벨 지정'} size="sm">
              {label ? (
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: label.color }} />
              ) : (
                <TagIcon size={ICON.sm} />
              )}
            </IconButton>
          )}
        >
          {(closeMenu) => (
            <LabelPicker
              value={scratch.label}
              onChange={(l) => { updateScratch(draftId, { label: l }); closeMenu() }}
            />
          )}
        </Popover>

        <div className="mr-auto" />

        <IconButton title="창을 항상 위에 고정" size="sm" className="no-drag" active={alwaysOnTop} onClick={toggleAlwaysOnTop}>
          <Pin size={ICON.md} className={alwaysOnTop ? 'fill-current' : ''} />
        </IconButton>

        <Popover
          align="right"
          trigger={() => (
            <IconButton title="더보기" size="sm">
              <MoreHorizontal size={ICON.md} />
            </IconButton>
          )}
        >
          {(closeMenu) => (
            <ScratchMoreMenu
              onSaveProject={(id) => { saveAndClose(id); closeMenu() }}
              onDiscard={() => { removeDraft(draftId); close() }}
              alwaysOnTop={alwaysOnTop}
              onToggleAlwaysOnTop={() => { toggleAlwaysOnTop(); closeMenu() }}
              peekEdge={peekEdge}
              onTogglePeek={(edge) => { togglePeek(edge); closeMenu() }}
              onOpenSettings={() => {
                if (isElectron()) electron()?.openMain()
                else window.open(location.pathname, '_blank')
                closeMenu()
              }}
            />
          )}
        </Popover>

        <IconButton title="닫기 — 내용은 자동 저장되어 있어요" size="sm" className="no-drag" onClick={close}>
          <X size={ICON.md} />
        </IconButton>
      </div>

      {/* ── 모드 : 내용 편집 / 그리기·주석 / 관리 ── */}
      <div className="no-drag px-3 py-2">
        <EditModeBar
          memo={pseudoMemo}
          mode={mode}
          onModeChange={setMode}
          onMemoUpdate={(patch) => updateScratch(draftId, patch)}
        />
      </div>

      {mode === 'content' && (
        <EditorToolbar
          onAfter={saveFromDom}
          focusEditor={() => editorRef.current?.focus()}
          defaultFontSize={design.fontSize}
        />
      )}
      {mode === 'draw' && <DrawingToolbar memoId={draftId} />}

      {/* ── 본문 ── */}
      <div ref={surfaceRef} className="no-drag relative flex-1 overflow-y-auto px-3 pb-3">
        <RichTextEditor
          key={draftId}
          editorRef={editorRef}
          value={scratch.content}
          onChange={(html) => updateScratch(draftId, { content: html })}
          fontFamily={fontFamily}
          fontSize={design.fontSize}
          placeholder="메모를 입력하세요"
          className="min-h-full"
        />
        <DrawingLayer memoId={draftId} active={mode === 'draw'} />
      </div>

      {/* ── 하단 상태 ── */}
      <div className="flex h-6 shrink-0 items-center justify-center px-3 text-[11px] text-faint">
        임시 저장됨 — 닫아도 사라지지 않아요. 저장하려면 ⋯ 더보기를 눌러보세요.
      </div>

      {/* ── 우클릭 메뉴 : 더보기와 같은 내용(사이드바 메모 카드와 동일한 규칙) ── */}
      <ContextMenu state={ctxMenu} onClose={() => setCtxMenu(null)}>
        {(closeMenu) => (
          <ScratchMoreMenu
            onSaveProject={(id) => { saveAndClose(id); closeMenu() }}
            onDiscard={() => { removeDraft(draftId); close() }}
            alwaysOnTop={alwaysOnTop}
            onToggleAlwaysOnTop={() => { toggleAlwaysOnTop(); closeMenu() }}
            peekEdge={peekEdge}
            onTogglePeek={(edge) => { togglePeek(edge); closeMenu() }}
            onOpenSettings={() => {
              if (isElectron()) electron()?.openMain()
              else window.open(location.pathname, '_blank')
              closeMenu()
            }}
          />
        )}
      </ContextMenu>
    </div>
  )
}

function ScratchMoreMenu({
  onSaveProject, onDiscard, alwaysOnTop, onToggleAlwaysOnTop, peekEdge, onTogglePeek, onOpenSettings,
}: {
  onSaveProject: (id: string) => void
  onDiscard: () => void
  alwaysOnTop: boolean
  onToggleAlwaysOnTop: () => void
  peekEdge: 'left' | 'right' | null
  onTogglePeek: (edge: 'left' | 'right') => void
  onOpenSettings: () => void
}) {
  const [view, setView] = useState<'menu' | 'project'>('menu')

  if (view === 'project') {
    return (
      <div>
        <button
          onClick={() => setView('menu')}
          className="mb-1 flex h-[var(--h-md)] w-full items-center gap-1.5 border-b border-line px-2 text-base font-medium text-body"
        >
          <ChevronLeft size={ICON.md} className="text-muted" />
          프로젝트에 저장
        </button>
        <SaveToProjectMenu onSave={onSaveProject} />
      </div>
    )
  }

  return (
    <div className="w-52">
      <MenuLabel>저장</MenuLabel>
      <MenuItem icon={<Folder size={ICON.md} />} trailing="›" onClick={() => setView('project')}>
        프로젝트에 저장
      </MenuItem>

      <MenuDivider />
      <MenuLabel>이 창</MenuLabel>
      <MenuItem
        icon={<ArrowUpToLine size={ICON.md} />}
        trailing={alwaysOnTop ? <Check size={ICON.sm} className="text-accent" /> : undefined}
        onClick={onToggleAlwaysOnTop}
      >
        항상 위
      </MenuItem>
      {isElectron() && (
        <>
          <MenuLabel>모서리 피크 — 평소엔 살짝 숨겼다가 마우스를 올리면 펼침</MenuLabel>
          <MenuItem
            icon={<ArrowLeftToLine size={ICON.md} />}
            trailing={peekEdge === 'left' ? <Check size={ICON.sm} className="text-accent" /> : undefined}
            onClick={() => onTogglePeek('left')}
          >
            왼쪽 가장자리에 숨기기
          </MenuItem>
          <MenuItem
            icon={<ArrowRightToLine size={ICON.md} />}
            trailing={peekEdge === 'right' ? <Check size={ICON.sm} className="text-accent" /> : undefined}
            onClick={() => onTogglePeek('right')}
          >
            오른쪽 가장자리에 숨기기
          </MenuItem>
        </>
      )}
      <MenuItem icon={<Settings size={ICON.md} />} onClick={onOpenSettings}>
        설정 열기
      </MenuItem>

      <MenuDivider />
      <MenuItem icon={<X size={ICON.md} />} danger onClick={onDiscard}>
        저장하지 않고 버리기
      </MenuItem>
    </div>
  )
}
