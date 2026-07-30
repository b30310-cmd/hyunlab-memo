import { useMemo, useState, useCallback } from 'react'
import {
  Star, Hash, Plus, Folder, FolderOpen, Inbox, MoreVertical,
  Pin, ExternalLink, Check,
} from 'lucide-react'
import { useMemoStore } from '@/store/useMemoStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useUiStore } from '@/store/useUiStore'
import { filterAndSort, allTags } from '@/lib/filter'
import { MemoListItem } from './MemoListItem'
import { Popover } from '@/components/common/Popover'
import { IconButton, MenuItem, MenuDivider, MenuLabel, ICON } from '@/components/ui/Button'
import { ContextMenu, type ContextMenuState } from '@/components/ui/ContextMenu'
import { LabelPicker } from '@/components/ui/LabelPicker'
import { MemoMenu } from '@/components/Editor/MemoMenu'
import { LABELS, BRAND_ACCENT } from '@/lib/constants'
import { openPopupMemo } from '@/lib/electron'

// ============================================================
// 좌측 사이드바
//  프로젝트 → 필터 → 메모 목록
//  메모를 우클릭하면 그 메모에 필요한 동작만 담긴 메뉴가 뜹니다.
// ============================================================

// 첫 번째는 HYUNLAB 브랜드 강조색, 나머지는 프로젝트를 구분하기 위한 팔레트입니다.
const PROJECT_COLORS = [BRAND_ACCENT, '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

export function Sidebar() {
  const memos = useMemoStore((s) => s.memos)
  const projects = useMemoStore((s) => s.projects)
  const selectedId = useMemoStore((s) => s.selectedId)
  const {
    select, addProject, renameProject, deleteProject,
    togglePin, toggleFavorite, updateMemo, moveMemoToProject,
  } = useMemoStore()

  const sort = useSettingsStore((s) => s.sort)
  const view = useSettingsStore((s) => s.view)
  const {
    query, tagFilter, labelFilter, favoriteOnly, projectFilter,
    setTagFilter, setLabelFilter, toggleFavoriteOnly, setProjectFilter,
  } = useUiStore()

  const [creating, setCreating] = useState(false)
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])

  // 왼쪽 목록에는 프로젝트에 등록된 메모만 보여줍니다.
  // (스크래치패드는 애초에 이 memos 배열에 들어있지 않고, 프로젝트 미지정
  //  메모는 아직 "정식으로 분류되지 않은" 상태라 목록과 임시 작업 공간을
  //  혼동하지 않도록 여기서는 뺍니다 — 데이터 자체는 지워지지 않습니다)
  const projectMemos = useMemo(() => memos.filter((m) => m.projectId !== null), [memos])

  const tags = useMemo(() => allTags(projectMemos), [projectMemos])

  const visible = useMemo(
    () =>
      filterAndSort(projectMemos, {
        query, tagFilter, labelFilter, favoriteOnly, sort,
        projectId: projectFilter,
      }),
    [projectMemos, query, tagFilter, labelFilter, favoriteOnly, sort, projectFilter],
  )

  const countOf = (projectId: string | null | undefined) =>
    projectId === undefined ? projectMemos.length : projectMemos.filter((m) => m.projectId === projectId).length

  const menuMemo = menu ? memos.find((m) => m.id === menu.targetId) : undefined

  return (
    <aside className="flex w-[264px] shrink-0 flex-col border-r border-line bg-surface">
      {/* ── 프로젝트 ── */}
      <div className="px-3 pt-3">
        <div className="mb-1 flex h-6 items-center justify-between pl-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-faint">프로젝트</span>
          <IconButton title="새 프로젝트" size="sm" onClick={() => setCreating(true)}>
            <Plus size={ICON.sm} />
          </IconButton>
        </div>

        <div className="space-y-0.5">
          <ProjectRow
            icon={<Inbox size={ICON.md} />}
            label="전체 메모"
            count={countOf(undefined)}
            active={projectFilter === undefined}
            onClick={() => setProjectFilter(undefined)}
          />

          {projects.map((p) => (
            <ProjectRow
              key={p.id}
              icon={
                projectFilter === p.id ? (
                  <FolderOpen size={ICON.md} style={{ color: p.color }} />
                ) : (
                  <Folder size={ICON.md} style={{ color: p.color }} />
                )
              }
              label={p.name}
              count={countOf(p.id)}
              active={projectFilter === p.id}
              onClick={() => setProjectFilter(p.id)}
              onDropMemo={(memoId) => moveMemoToProject(memoId, p.id)}
              menu={
                <Popover
                  align="right"
                  trigger={() => (
                    <IconButton title="프로젝트 메뉴" size="sm">
                      <MoreVertical size={ICON.sm} />
                    </IconButton>
                  )}
                >
                  {(close) => (
                    <div className="w-40">
                      <MenuItem
                        onClick={() => {
                          const name = prompt('프로젝트 이름', p.name)
                          if (name?.trim()) renameProject(p.id, name.trim())
                          close()
                        }}
                      >
                        이름 바꾸기
                      </MenuItem>
                      <MenuItem
                        danger
                        onClick={() => {
                          if (confirm(`'${p.name}' 프로젝트를 삭제할까요?\n안에 있던 메모는 삭제되지 않고 '미분류'로 이동합니다.`)) {
                            deleteProject(p.id)
                            if (projectFilter === p.id) setProjectFilter(undefined)
                          }
                          close()
                        }}
                      >
                        삭제
                      </MenuItem>
                    </div>
                  )}
                </Popover>
              }
            />
          ))}
        </div>

        {creating && (
          <input
            autoFocus
            placeholder="프로젝트 이름"
            onBlur={() => setCreating(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const name = (e.target as HTMLInputElement).value.trim()
                if (name) setProjectFilter(addProject(name, PROJECT_COLORS[projects.length % PROJECT_COLORS.length]).id)
                setCreating(false)
              }
              if (e.key === 'Escape') setCreating(false)
            }}
            className="ui-input mt-1 !h-[var(--h-sm)] !text-sm"
          />
        )}
      </div>

      {/* ── 필터 ── */}
      <div className="flex flex-wrap gap-1 px-3 py-3">
        <FilterChip
          active={favoriteOnly}
          onClick={toggleFavoriteOnly}
          title="즐겨찾기 — 프로젝트와 상관없이 전체 즐겨찾기만 모아보기"
        >
          <Star size={ICON.xs} className={favoriteOnly ? 'fill-current' : ''} />
          즐겨찾기
        </FilterChip>
        {LABELS.map((l) => (
          <FilterChip
            key={l.key}
            active={labelFilter === l.key}
            onClick={() => setLabelFilter(labelFilter === l.key ? null : l.key)}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.color }} />
            {l.name}
          </FilterChip>
        ))}
        {tags.map((t) => (
          <FilterChip
            key={t}
            active={tagFilter === t}
            onClick={() => setTagFilter(tagFilter === t ? null : t)}
          >
            <Hash size={ICON.xs} />
            {t}
          </FilterChip>
        ))}
      </div>

      {/* ── 메모 목록 ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {visible.length === 0 ? (
          <div className="mt-20 whitespace-pre-line px-4 text-center text-base leading-relaxed text-faint">
            {query ? '검색 결과가 없습니다' : '아직 메모가 없습니다\n＋ 새 메모로 시작해 보세요'}
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
            {visible.map((memo) => (
              <MemoListItem
                key={memo.id}
                memo={memo}
                grid={view === 'grid'}
                selected={memo.id === selectedId}
                onClick={() => select(memo.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  select(memo.id)
                  setMenu({ x: e.clientX, y: e.clientY, targetId: memo.id })
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 하단 개수 ── */}
      <div className="flex h-9 shrink-0 items-center border-t border-line px-4 text-xs text-faint">
        메모 {projectMemos.length}개{visible.length !== projectMemos.length && ` · ${visible.length}개 표시 중`}
      </div>

      {/* ── 우클릭 메뉴 ── */}
      <ContextMenu state={menu} onClose={closeMenu}>
        {(close) =>
          menuMemo && (
            <>
              <MenuLabel>라벨</MenuLabel>
              <LabelPicker
                compact
                value={menuMemo.label}
                onChange={(label) => {
                  updateMemo(menuMemo.id, { label })
                  close()
                }}
              />
              <MenuDivider />
              <MenuItem
                icon={<Pin size={ICON.md} />}
                onClick={() => { togglePin(menuMemo.id); close() }}
                trailing={menuMemo.pinned ? <Check size={ICON.sm} className="text-accent" /> : undefined}
                title="고정 — 이 프로젝트 목록 맨 위에 표시"
              >
                고정
              </MenuItem>
              <MenuItem
                icon={<Star size={ICON.md} />}
                onClick={() => { toggleFavorite(menuMemo.id); close() }}
                trailing={menuMemo.favorite ? <Check size={ICON.sm} className="text-accent" /> : undefined}
                title="즐겨찾기 — 전체 즐겨찾기 모아보기에 추가"
              >
                즐겨찾기
              </MenuItem>
              <MenuItem
                icon={<ExternalLink size={ICON.md} />}
                onClick={() => { openPopupMemo(menuMemo.id, menuMemo.popup); close() }}
              >
                팝업으로 열기
              </MenuItem>

              <MenuDivider />
              {/* 복사·내보내기·복제·프로젝트 이동·기록 복원·삭제 — 메인 에디터·팝업 메모와 동일한 메뉴 */}
              <MemoMenu memo={menuMemo} onDone={close} />
            </>
          )
        }
      </ContextMenu>
    </aside>
  )
}

function ProjectRow({
  icon, label, count, active, onClick, menu, onDropMemo,
}: {
  icon: React.ReactNode
  label: string
  count: number
  active: boolean
  onClick: () => void
  menu?: React.ReactNode
  /** 메모 카드를 드래그해서 이 프로젝트 위에 놓았을 때 (없으면 드롭을 받지 않습니다) */
  onDropMemo?: (memoId: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      className={`group flex h-[var(--h-md)] items-center rounded-md pr-1 transition-colors ${
        active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-[var(--hover)]'
      } ${dragOver ? 'ring-2 ring-inset ring-accent' : ''}`}
      onDragOver={(e) => {
        if (!onDropMemo) return
        if (!e.dataTransfer.types.includes('application/x-hyunlab-memo-id')) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!onDropMemo) return
        e.preventDefault()
        setDragOver(false)
        const memoId = e.dataTransfer.getData('application/x-hyunlab-memo-id')
        if (memoId) onDropMemo(memoId)
      }}
    >
      <button onClick={onClick} className="flex h-full min-w-0 flex-1 items-center gap-2 px-2 text-left">
        <span className="shrink-0">{icon}</span>
        <span className={`min-w-0 flex-1 truncate text-base ${active ? 'font-medium' : ''}`}>{label}</span>
        <span className="shrink-0 text-xs tabular-nums text-faint">{count}</span>
      </button>
      {menu && <span className="opacity-0 transition-opacity group-hover:opacity-100">{menu}</span>}
    </div>
  )
}

function FilterChip({
  children, active, onClick, title,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex h-[var(--h-sm)] items-center gap-1 rounded-full px-2.5 text-sm transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'bg-surface-2 text-muted hover:text-body'
      }`}
    >
      {children}
    </button>
  )
}
