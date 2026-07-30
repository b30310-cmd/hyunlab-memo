import { Pin, Star, Bell, Pencil } from 'lucide-react'
import type { Memo } from '@/types'
import { displayTitle, previewText, checklistProgress, friendlyDate } from '@/lib/filter'
import { resolveColor, getLabel } from '@/lib/constants'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useMemoStore } from '@/store/useMemoStore'
import { ICON } from '@/components/ui/Button'

// ============================================================
// 메모 목록 카드
//
// 한눈에 들어와야 하는 정보:
//   컬러 라벨 · 제목 · 미리보기 · 날짜 · 태그
//   알림 / 즐겨찾기 / 고정 / 필기 / 체크리스트 진행률
//
// 배경은 메모 색을 아주 옅게만 깔고(왼쪽 색 띠로 강조),
// 글자 대비를 확보해 오래 봐도 피로하지 않게 했습니다.
// ============================================================

interface Props {
  memo: Memo
  selected: boolean
  grid: boolean
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export function MemoListItem({ memo, selected, grid, onClick, onContextMenu }: Props) {
  const isDark = useSettingsStore((s) => s.theme === 'dark')
  const design = useMemoStore((s) => s.getDesign(memo.id))
  const hasDrawing = useMemoStore((s) => (s.drawings[memo.id]?.strokes.length ?? 0) > 0)
  const project = useMemoStore((s) => s.projects.find((p) => p.id === memo.projectId))

  const label = getLabel(memo.label)
  const progress = checklistProgress(memo.content)
  const memoColor = resolveColor(design.color, isDark)

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      // 드래그해서 프로젝트로 옮길 수 있습니다 (사이드바의 프로젝트 위에 놓으면 이동).
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-hyunlab-memo-id', memo.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      // 선택된 카드의 테두리 색은 인라인 스타일로 직접 지정합니다.
      // (Tailwind의 border-accent/30 같은 투명도 modifier는 var() 기반 커스텀 색상에는
      //  적용되지 않고, 클래스만으로는 다른 스타일 규칙에 가려질 수 있어 확실하게 이겨야 합니다)
      style={selected ? { borderColor: 'var(--accent-border-soft)' } : undefined}
      className={`group relative w-full cursor-grab overflow-hidden rounded-lg border p-3 text-left transition-all duration-150 active:cursor-grabbing ${
        selected
          ? 'bg-accent-soft shadow-sm'
          : 'border-line bg-surface hover:border-line-strong hover:shadow-sm'
      } ${grid ? 'h-[132px]' : ''}`}
    >
      {/* 메모 색을 왼쪽 세로 띠로 표시 (배경을 칠하지 않아 글자가 또렷합니다) */}
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: memoColor }}
        aria-hidden
      />

      {/* 1줄: 라벨 + 제목 + 상태 아이콘 */}
      <div className="mb-1 flex items-center gap-2 pl-1">
        {label && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: label.color }}
            title={label.name}
          />
        )}
        <h3 className="min-w-0 flex-1 truncate text-md font-semibold text-body">
          {displayTitle(memo)}
        </h3>
        <span className="flex shrink-0 items-center gap-1 text-faint">
          {memo.pinned && (
            <span title="고정됨 — 이 프로젝트 목록 맨 위에 표시 중">
              <Pin size={ICON.xs} className="fill-current" />
            </span>
          )}
          {memo.favorite && (
            <span title="즐겨찾기됨 — 전체 즐겨찾기 모아보기에 있음">
              <Star size={ICON.xs} className="fill-current text-amber-400" />
            </span>
          )}
          {memo.reminder.enabled && <Bell size={ICON.xs} className="text-accent" />}
          {hasDrawing && <Pencil size={ICON.xs} />}
        </span>
      </div>

      {/* 2줄: 내용 미리보기 */}
      <p className={`pl-1 text-sm text-muted ${grid ? 'line-clamp-2' : 'line-clamp-2'}`}>
        {previewText(memo) || '내용 없음'}
      </p>

      {/* 3줄: 체크리스트 진행률 */}
      {progress && (
        <div className="mt-2 flex items-center gap-2 pl-1">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(progress.done / progress.total) * 100}%`,
                background: progress.done === progress.total ? '#22c55e' : 'var(--accent)',
              }}
            />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-faint">
            {progress.done}/{progress.total}
          </span>
        </div>
      )}

      {/* 4줄: 날짜 + 프로젝트 + 태그 */}
      <div className="mt-2 flex items-center gap-1 pl-1">
        <span className="shrink-0 text-xs text-faint">{friendlyDate(memo.updatedAt)}</span>

        {project && (
          <>
            <Dot />
            <span className="shrink-0 truncate text-xs" style={{ color: project.color }}>
              {project.name}
            </span>
          </>
        )}

        {memo.tags.length > 0 && (
          <>
            <Dot />
            <span className="truncate text-xs text-faint">
              {memo.tags.slice(0, 2).map((t) => `#${t}`).join(' ')}
              {memo.tags.length > 2 && ` +${memo.tags.length - 2}`}
            </span>
          </>
        )}
      </div>
    </button>
  )
}

/** 정보 사이를 나누는 아주 작은 점 */
function Dot() {
  return <span className="shrink-0 text-xs text-faint">·</span>
}
