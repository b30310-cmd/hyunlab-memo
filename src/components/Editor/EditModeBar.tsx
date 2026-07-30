import { Type as TypeIcon, Pencil, Settings2, Palette, Bell, Hash } from 'lucide-react'
import type { Memo } from '@/types'
import { Popover } from '@/components/common/Popover'
import { Chip } from '@/components/ui/Chip'
import { TagEditor } from '@/components/ui/TagEditor'
import { ICON } from '@/components/ui/Button'
import { DesignPanel } from './DesignPanel'
import { ReminderEditor } from './ReminderEditor'

// ============================================================
// 4단계: 편집 기능 3모드 재구성
//  이전에는 서식·꾸미기·그리기·알림·태그 5개 칩이 한 줄에 나란히 있었습니다.
//  지금은 '지금 뭘 하려는지'를 기준으로 3모드로 묶었습니다.
//
//   내용 편집   — 서식(굵게/색/정렬 등) 툴바
//   그리기·주석 — 펜/도형 툴바 + 캔버스 활성화
//   관리       — 꾸미기·알림·태그 (본문 편집과 무관한 설정들)
//
//  메인 에디터·팝업 메모 둘 다 이 컴포넌트를 그대로 씁니다.
// ============================================================

export type EditMode = 'content' | 'draw' | 'manage'

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
    <div className="flex flex-col gap-2">
      <div className="inline-flex w-fit gap-0.5 rounded-md bg-surface-2 p-0.5">
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
        <ModeTab active={mode === 'manage'} onClick={() => toggle('manage')}>
          <Settings2 size={ICON.sm} /> 관리
        </ModeTab>
      </div>

      {mode === 'manage' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Popover trigger={() => <Chip active={false}><Palette size={ICON.sm} /> 꾸미기</Chip>}>
            <DesignPanel memoId={memo.id} />
          </Popover>

          <Popover
            trigger={() => (
              <Chip active={memo.reminder.enabled}>
                <Bell size={ICON.sm} /> {memo.reminder.enabled ? '알림 켜짐' : '알림'}
              </Chip>
            )}
          >
            <ReminderEditor memo={memo} onUpdate={onMemoUpdate} />
          </Popover>

          <Popover
            trigger={() => (
              <Chip active={false}>
                <Hash size={ICON.sm} /> 태그{memo.tags.length ? ` ${memo.tags.length}` : ''}
              </Chip>
            )}
          >
            <TagEditor memo={memo} onUpdate={onMemoUpdate} />
          </Popover>
        </div>
      )}
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
      className={`flex h-7 items-center gap-1.5 rounded-sm px-3 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-surface text-body shadow-sm' : 'text-muted hover:text-body'
      }`}
    >
      {children}
    </button>
  )
}
