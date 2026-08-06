import { useEffect, useRef, useState } from 'react'
import {
  Pin, Lock, Unlock, X, MoreHorizontal,
  Tag as TagIcon, Settings, ChevronsDownUp,
  ChevronsUpDown, Check, ArrowUpToLine, Folder,
  ArrowLeftToLine, ArrowRightToLine, Bell,
} from 'lucide-react'
import { useMemoStore } from '@/store/useMemoStore'
import { useAlertStore } from '@/store/useAlertStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { EditorToolbar } from '@/components/Editor/EditorToolbar'
import { MemoMenu } from '@/components/Editor/MemoMenu'
import { EditModeBar, type EditMode } from '@/components/Editor/EditModeBar'
import { Popover } from '@/components/common/Popover'
import { ContextMenu, type ContextMenuState } from '@/components/ui/ContextMenu'
import { DrawingLayer } from '@/components/Drawing/DrawingLayer'
import { DrawingToolbar } from '@/components/Drawing/DrawingToolbar'
import { IconButton, MenuItem, MenuDivider, MenuLabel, ICON } from '@/components/ui/Button'
import { LabelPicker } from '@/components/ui/LabelPicker'
import { ProjectPicker } from '@/components/ui/ProjectPicker'
import { memoStyle, resolveColor, resolveFont, getLabel } from '@/lib/constants'
import { electron, isElectron } from '@/lib/electron'
import { checklistProgress } from '@/lib/filter'

// ============================================================
// 팝업(스티커) 메모 창
//
// 【상단 바】 라벨 · 제목 · 항상 위 · 더보기 · 닫기
// 【모드】  내용 편집 / 그리기·주석 / 관리 — 메인 에디터와 똑같은 3모드 구성
//   (4단계: 더 이상 5개 칩을 한 줄에 늘어놓지 않습니다)
// 【더보기】 복사·내보내기·복제·프로젝트 이동·기록 복원·삭제(메모 관리 공통 메뉴)
//   + 항상 위·편집 잠금·작게 보기·투명도·설정(이 창만의 관리 기능)
//
// 【Compact Mode】 제목과 체크리스트만 보여주는 작은 모드.
//   본문을 클릭하면 일반 모드로 자연스럽게 펼쳐집니다.
// ============================================================

export function PopupWindow({ memoId }: { memoId: string }) {
  const memo = useMemoStore((s) => s.memos.find((m) => m.id === memoId))
  const design = useMemoStore((s) => s.getDesign(memoId))
  const { updateMemo, updateDesign, moveMemoToProject } = useMemoStore()
  const projects = useMemoStore((s) => s.projects)
  const isDark = useSettingsStore((s) => s.theme === 'dark')
  // 이 메모에 걸어 둔 알림이 방금 울렸으면(다른 창의 알림 스케줄러가 알려줌)
  // 창을 주황색으로 표시해서 눈에 띄게 합니다. 클릭하면 확인 처리됩니다.
  const myAlert = useAlertStore((s) => s.alerts.find((a) => a.memoId === memoId))
  const dismissAlert = useAlertStore((s) => s.dismiss)
  const editorRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const existedRef = useRef(false)

  const [mode, setMode] = useState<EditMode | null>(null)
  const [compact, setCompact] = useState(false)
  // 사이드바 메모 카드와 동일하게, 팝업에서도 우클릭하면 같은 관리 메뉴(더보기)가 뜹니다.
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null)

  const close = () => (isElectron() ? electron()?.closeWindow() : window.close())

  useEffect(() => {
    document.body.style.background = resolveColor(design.color, isDark)
  }, [design.color, isDark])

  useEffect(() => {
    const t = setTimeout(() => editorRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [memoId])

  // 창을 옮기거나 크기를 바꾸면 위치를 기억합니다.
  useEffect(() => {
    const api = electron()
    if (!api) return
    return api.onBoundsChanged((bounds) => {
      const cur = useMemoStore.getState().memos.find((m) => m.id === memoId)
      if (!cur) return
      updateMemo(memoId, { popup: { ...cur.popup, ...bounds } })
    })
  }, [memoId, updateMemo])

  // 모서리 피크로 접힌 손잡이를 드래그해 세로 위치를 옮기면, 다음에 다시
  // 열었을 때도 그 자리에서 시작하도록 기억해 둡니다.
  useEffect(() => {
    const api = electron()
    if (!api) return
    return api.onPeekYChanged((y) => {
      const cur = useMemoStore.getState().memos.find((m) => m.id === memoId)
      if (!cur) return
      updateMemo(memoId, { popup: { ...cur.popup, peekY: y } })
    })
  }, [memoId, updateMemo])

  // 메모가 (다른 화면에서) 삭제되면 창을 자동으로 닫습니다.
  // (더보기 → 삭제를 이 창에서 눌렀을 때도 동일하게 동작합니다)
  useEffect(() => {
    if (memo) {
      existedRef.current = true
      return
    }
    if (existedRef.current) close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memo])

  if (!memo) {
    return (
      <div className="flex h-screen items-center justify-center text-base text-faint">
        메모를 찾을 수 없습니다
      </div>
    )
  }

  const { popup } = memo
  const fontFamily = resolveFont(design.font)
  const label = getLabel(memo.label)
  const project = projects.find((p) => p.id === memo.projectId)
  const progress = checklistProgress(memo.content)

  const patchPopup = (p: Partial<typeof popup>) => updateMemo(memo.id, { popup: { ...popup, ...p } })

  const toggleAlwaysOnTop = () => {
    const next = !popup.alwaysOnTop
    patchPopup({ alwaysOnTop: next })
    electron()?.setAlwaysOnTop(next)
  }

  /** 모서리 피크: 켜면 화면 밖으로 살짝만 보이게 숨겼다가, 마우스를 올리면 펼쳐집니다. */
  const togglePeek = (edge: 'left' | 'right') => {
    const next = popup.peekEdge === edge ? null : edge
    // 피크는 다른 창에 가려지면 의미가 없어서, 켜는 동시에 항상 위도 함께 켭니다
    // (메인 프로세스에서도 강제로 켜지만, "항상 위" 핀 아이콘 표시도 같이 맞춰 줍니다).
    patchPopup({ peekEdge: next, alwaysOnTop: next ? true : popup.alwaysOnTop })
    if (next) electron()?.enablePeek(next)
    else electron()?.disablePeek()
  }

  const changeOpacity = (v: number) => {
    updateDesign(memo.id, { opacity: v })
    electron()?.setOpacity(v)
  }

  const saveFromDom = () => {
    if (editorRef.current) updateMemo(memo.id, { content: editorRef.current.innerHTML })
  }

  /** Compact Mode에서 보여줄 체크리스트 항목만 뽑아옵니다. */
  const compactChecklist = () => {
    const tmp = document.createElement('div')
    tmp.innerHTML = memo.content
    return Array.from(tmp.querySelectorAll('.check-item')).slice(0, 6).map((el) => ({
      text: el.textContent?.trim() ?? '',
      done: el.classList.contains('done'),
    }))
  }

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden"
      style={memoStyle(design, isDark)}
      // 모서리 피크가 켜져 있을 때만 의미가 있습니다. 접힌 채로는 화면에
      // 살짝 보이는 부분만 마우스가 닿을 수 있으므로, 창 전체에 걸어 둬도
      // 실제로는 그 좁은 영역에서만 mouseenter가 일어납니다.
      onMouseEnter={() => { if (popup.peekEdge) electron()?.peekReveal() }}
      onMouseLeave={() => { if (popup.peekEdge) electron()?.peekCollapse() }}
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
          setCtxMenu({ x: e.clientX, y: e.clientY, targetId: memo.id })
        }}
      >
        {/* 라벨 (눌러서 바로 변경 — 메인 에디터와 동일) */}
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
              value={memo.label}
              onChange={(l) => { updateMemo(memo.id, { label: l }); closeMenu() }}
            />
          )}
        </Popover>

        {/* 프로젝트 (눌러서 바로 다른 프로젝트로 이동) */}
        <Popover
          trigger={() => (
            <IconButton title={project ? `프로젝트: ${project.name}` : '프로젝트로 이동'} size="sm">
              <Folder size={ICON.sm} style={project ? { color: project.color } : undefined} />
            </IconButton>
          )}
        >
          {(closeMenu) => (
            <ProjectPicker
              projects={projects}
              value={memo.projectId}
              onChange={(projectId) => { moveMemoToProject(memo.id, projectId); closeMenu() }}
            />
          )}
        </Popover>

        <div className="mr-auto" />

        {/* 📌 창을 항상 위에 고정 (목록의 '고정'과는 다른, 이 창만의 설정입니다) */}
        <IconButton title="창을 항상 위에 고정" size="sm" className="no-drag" active={popup.alwaysOnTop} onClick={toggleAlwaysOnTop}>
          <Pin size={ICON.md} className={popup.alwaysOnTop ? 'fill-current' : ''} />
        </IconButton>

        {/* ⋯ 더보기 — 메모 관리(공통) + 이 창만의 관리 기능 */}
        <Popover
          align="right"
          trigger={() => (
            <IconButton title="더보기" size="sm">
              <MoreHorizontal size={ICON.md} />
            </IconButton>
          )}
        >
          {(closeMenu) => (
            <>
              {/* 복사·내보내기·복제·프로젝트 이동·기록 복원·삭제 — 사이드바·메인 에디터와 동일한 메뉴 */}
              <MemoMenu memo={memo} surfaceRef={surfaceRef} onDone={closeMenu} />

              <MenuDivider />
              <MenuLabel>이 창</MenuLabel>
              <MenuItem
                icon={<ArrowUpToLine size={ICON.md} />}
                trailing={popup.alwaysOnTop ? <Check size={ICON.sm} className="text-accent" /> : undefined}
                onClick={() => { toggleAlwaysOnTop(); closeMenu() }}
              >
                항상 위
              </MenuItem>
              <MenuItem
                icon={popup.locked ? <Lock size={ICON.md} /> : <Unlock size={ICON.md} />}
                trailing={popup.locked ? <Check size={ICON.sm} className="text-accent" /> : undefined}
                onClick={() => { patchPopup({ locked: !popup.locked }); closeMenu() }}
              >
                편집 잠금
              </MenuItem>
              <MenuItem
                icon={compact ? <ChevronsUpDown size={ICON.md} /> : <ChevronsDownUp size={ICON.md} />}
                onClick={() => { setCompact((v) => !v); closeMenu() }}
              >
                {compact ? '일반 모드' : '작게 보기'}
              </MenuItem>

              {isElectron() && (
                <>
                  <MenuLabel>모서리 피크 — 평소엔 살짝 숨겼다가 마우스를 올리면 펼침</MenuLabel>
                  <MenuItem
                    icon={<ArrowLeftToLine size={ICON.md} />}
                    trailing={popup.peekEdge === 'left' ? <Check size={ICON.sm} className="text-accent" /> : undefined}
                    onClick={() => { togglePeek('left'); closeMenu() }}
                  >
                    왼쪽 가장자리에 숨기기
                  </MenuItem>
                  <MenuItem
                    icon={<ArrowRightToLine size={ICON.md} />}
                    trailing={popup.peekEdge === 'right' ? <Check size={ICON.sm} className="text-accent" /> : undefined}
                    onClick={() => { togglePeek('right'); closeMenu() }}
                  >
                    오른쪽 가장자리에 숨기기
                  </MenuItem>
                </>
              )}

              {isElectron() && (
                <>
                  <MenuLabel>투명도</MenuLabel>
                  <div className="px-2 pb-2">
                    <input
                      type="range"
                      min={0.3}
                      max={1}
                      step={0.05}
                      value={design.opacity}
                      onChange={(e) => changeOpacity(Number(e.target.value))}
                      className="h-1 w-full accent-[var(--accent)]"
                    />
                  </div>
                </>
              )}

              <MenuDivider />
              <MenuItem
                icon={<Settings size={ICON.md} />}
                onClick={() => {
                  // 팝업에는 설정 화면이 없으므로 메인 창을 띄웁니다.
                  if (isElectron()) electron()?.openMain()
                  else window.open(location.pathname, '_blank')
                  closeMenu()
                }}
              >
                설정 열기
              </MenuItem>
            </>
          )}
        </Popover>

        <IconButton title="닫기" size="sm" className="no-drag" onClick={close}>
          <X size={ICON.md} />
        </IconButton>
      </div>

      {/* ── 모드 : 내용 편집 / 그리기·주석 / 관리 (메인 에디터와 동일) ── */}
      {!compact && (
        <div className="no-drag px-3 py-2">
          <EditModeBar memo={memo} mode={mode} onModeChange={setMode} locked={popup.locked} />
        </div>
      )}

      {/* ── 서식 / 그리기 툴바 ── */}
      {mode === 'content' && !popup.locked && !compact && (
        <EditorToolbar
          onAfter={saveFromDom}
          focusEditor={() => editorRef.current?.focus()}
          defaultFontSize={design.fontSize}
        />
      )}
      {mode === 'draw' && !popup.locked && !compact && <DrawingToolbar memoId={memo.id} />}

      {/* ── 본문 ── */}
      {compact ? (
        // Compact Mode: 체크리스트 위주로 요약해서 보여줍니다.
        <button
          onClick={() => setCompact(false)}
          title="클릭하면 일반 모드로 펼쳐집니다"
          className="animate-fade flex-1 overflow-y-auto px-3 pb-2 text-left"
        >
          {progress && (
            <div className="mb-2 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(progress.done / progress.total) * 100}%`,
                    background: progress.done === progress.total ? '#22c55e' : 'var(--accent)',
                  }}
                />
              </div>
              <span className="text-xs tabular-nums text-muted">
                {progress.done}/{progress.total}
              </span>
            </div>
          )}

          {compactChecklist().length > 0 ? (
            <ul className="space-y-1">
              {compactChecklist().map((item, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 text-base ${item.done ? 'text-faint line-through' : 'text-body'}`}
                >
                  <span className="mt-[3px] shrink-0">{item.done ? '☑' : '☐'}</span>
                  <span className="truncate">{item.text || '(빈 항목)'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="line-clamp-3 text-base text-muted">
              {memo.content.replace(/<[^>]+>/g, ' ').trim() || '내용 없음'}
            </p>
          )}

          <p className="mt-3 text-xs text-faint">클릭하면 펼쳐집니다</p>
        </button>
      ) : (
        <div
          ref={surfaceRef}
          className="no-drag relative flex-1 overflow-y-auto px-3 pb-3"
          onContextMenu={(e) => {
            e.preventDefault()
            setCtxMenu({ x: e.clientX, y: e.clientY, targetId: memo.id })
          }}
        >
          <RichTextEditor
            key={memo.id}
            editorRef={editorRef}
            value={memo.content}
            onChange={(html) => updateMemo(memo.id, { content: html })}
            fontFamily={fontFamily}
            fontSize={design.fontSize}
            readOnly={popup.locked}
            placeholder="메모를 입력하세요"
            className="min-h-full"
          />
          <DrawingLayer memoId={memo.id} active={mode === 'draw' && !popup.locked} />
        </div>
      )}

      {/* ── 우클릭 메뉴 : 더보기와 같은 내용(사이드바 메모 카드와 동일한 규칙) ── */}
      <ContextMenu state={ctxMenu} onClose={() => setCtxMenu(null)}>
        {(closeMenu) => <MemoMenu memo={memo} surfaceRef={surfaceRef} onDone={closeMenu} />}
      </ContextMenu>
    </div>
  )
}
