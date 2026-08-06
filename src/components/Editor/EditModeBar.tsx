import { Type as TypeIcon, Pencil, Palette, Bell, Hash } from 'lucide-react'
import type { Memo } from '@/types'
import { Popover } from '@/components/common/Popover'
import { TagEditor } from '@/components/ui/TagEditor'
import { IconButton, ICON } from '@/components/ui/Button'
import { DesignPanel } from './DesignPanel'
import { ReminderEditor } from './ReminderEditor'

// ============================================================
// 편집 기능 모음
//  내용 편집·그리기·주석은 모드 전환(눌러야 그 툴바가 나타남)이고,
//  꾸미기·알림·태그는 지금 상태를 항상 한눈에 볼 수 있어야 해서
//  아이콘 버튼으로 같은 줄에 항상 노출합니다 (모드 전환 없이 바로 클릭).
//
//  좁은 팝업 창에서도 줄바꿈으로 글자가 깨지지 않도록 각 버튼은
//  whitespace-nowrap이며, 그래도 안 들어가면 가로 스크롤됩니다.
//
//  메인 에디터·팝업 메모 둘 다 이 컴포넌트를 그대로 씁니다.
// ============================================================

export type EditMode = 'content' | 'draw'

interface Props {
  memo: Memo
  mode: EditMode | null
  onModeChange: (mode: EditMode | null) => void
  /** 팝업의 '편집 잠금' 상태 — 잠겨 있으면 내용 편집·그리기는 막습니다 */
  locked?: boolean
  /** 알림·태그를 메모 저장소가 아닌 다른 곳에 저장해야 할 때(스크래치패드) 재정의합니다. */
  onMemoUpdate?: (patch: Partial<Memo>) => void
}

export function EditModeBar({ memo, mode, onModeChange, locked, onMemoUpdate }: Props) {
  const toggle = (m: EditMode) => onModeChange(mode === m ? null : m)

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto">
      <div className="inline-flex shrink-0 gap-0.5 rounded-md bg-surface-2 p-0.5">
        <ModeTab
          active={mode === 'content'}
          disabled={locked}
          title={locked ? '편집 잠금 중에는 서식을 바꿀 수 없어요' : undefined}
          onClick={() => toggle('content')}
        >
          <TypeIcon size={ICON.sm} /> 내용 편집
        </ModeTab>
        <ModeTab
          active={mode === 'draw'}
          disabled={locked}
          title={locked ? '편집 잠금 중에는 그릴 수 없어요' : undefined}
          onClick={() => toggle('draw')}
        >
          <Pencil size={ICON.sm} /> 그리기·주석
        </ModeTab>
      </div>

      <div className="h-4 w-px shrink-0 bg-line" />

      <div className="flex shrink-0 items-center gap-0.5">
        <Popover trigger={() => (
          <IconButton title="꾸미기" size="sm">
            <Palette size={ICON.sm} />
          </IconButton>
        )}>
          <DesignPanel memoId={memo.id} />
        </Popover>

        <Popover
          trigger={() => (
            <IconButton title={memo.reminder.enabled ? '알림 켜짐' : '알림'} active={memo.reminder.enabled} size="sm">
              <Bell size={ICON.sm} />
            </IconButton>
          )}
        >
          <ReminderEditor memo={memo} onUpdate={onMemoUpdate} />
        </Popover>

        <Popover
          trigger={() => (
            <IconButton title={memo.tags.length ? `태그 ${memo.tags.length}개` : '태그'} active={memo.tags.length > 0} size="sm">
              <Hash size={ICON.sm} />
            </IconButton>
          )}
        >
          <TagEditor memo={memo} onUpdate={onMemoUpdate} />
        </Popover>
      </div>
    </div>
  )
}

function ModeTab({
  children, active, disabled, title, onClick,
}: {
  children: React.ReactNode
  active: boolean
  disabled?: boolean
  title?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-sm px-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-surface text-body shadow-sm' : 'text-muted hover:text-body'
      }`}
    >
      {children}
    </button>
  )
}
