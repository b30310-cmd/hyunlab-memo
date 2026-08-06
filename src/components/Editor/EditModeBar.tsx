import { Type as TypeIcon, Pencil, Palette, Bell, Hash } from 'lucide-react'
import type { Memo } from '@/types'
import { Popover } from '@/components/common/Popover'
import { TagEditor } from '@/components/ui/TagEditor'
import { ICON } from '@/components/ui/Button'
import { DesignPanel } from './DesignPanel'
import { ReminderEditor } from './ReminderEditor'

// ============================================================
// 편집 기능 모음
//  내용 편집·그리기·주석(모드 전환)과 꾸미기·알림·태그(눌러서 바로 여는
//  패널)를 하나의 통일된 탭 줄로 보여줍니다 — 다섯 개 모두 같은 모양의
//  버튼(아이콘 + 글자)이며, 별도 구분선이나 "관리" 서브메뉴 없이 한눈에
//  보입니다.
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
    <div className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-md bg-surface-2 p-0.5">
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

      <Popover trigger={() => (
        <ModeTab as="div" active={false} title="꾸미기">
          <Palette size={ICON.sm} /> 꾸미기
        </ModeTab>
      )}>
        <DesignPanel memoId={memo.id} />
      </Popover>

      <Popover
        trigger={() => (
          <ModeTab as="div" active={memo.reminder.enabled} title={memo.reminder.enabled ? '알림 켜짐' : '알림'}>
            <Bell size={ICON.sm} /> 알림
          </ModeTab>
        )}
      >
        <ReminderEditor memo={memo} onUpdate={onMemoUpdate} />
      </Popover>

      <Popover
        trigger={() => (
          <ModeTab as="div" active={memo.tags.length > 0} title={memo.tags.length ? `태그 ${memo.tags.length}개` : '태그'}>
            <Hash size={ICON.sm} /> 태그{memo.tags.length ? ` ${memo.tags.length}` : ''}
          </ModeTab>
        )}
      >
        <TagEditor memo={memo} onUpdate={onMemoUpdate} />
      </Popover>
    </div>
  )
}

function ModeTab({
  children, active, disabled, title, onClick, as = 'button',
}: {
  children: React.ReactNode
  active: boolean
  disabled?: boolean
  title?: string
  onClick?: () => void
  /** 'div'면 클릭 처리를 하지 않습니다 — Popover의 트리거로 쓸 때, 클릭은 Popover의 바깥 래퍼가 이미 담당합니다. */
  as?: 'button' | 'div'
}) {
  const className = `flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-sm px-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
    active ? 'bg-surface text-body shadow-sm' : 'text-muted hover:text-body'
  }`

  if (as === 'div') {
    return (
      <div title={title} className={className}>
        {children}
      </div>
    )
  }

  return (
    <button onClick={onClick} disabled={disabled} title={title} className={className}>
      {children}
    </button>
  )
}
