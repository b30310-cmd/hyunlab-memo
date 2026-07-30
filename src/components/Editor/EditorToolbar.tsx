import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Code,
  CheckSquare, AlignLeft, AlignCenter, AlignRight, AlignJustify, Baseline, Highlighter,
  Smile, Star, Superscript, Subscript, Type as TypeIcon, Indent, Outdent, Laugh,
} from 'lucide-react'
import * as rt from '@/lib/richtext'
import { Popover } from '@/components/common/Popover'
import { SpecialCharPicker } from './SpecialCharPicker'
import { EmojiPicker } from './EmojiPicker'
import { KaomojiPicker } from './KaomojiPicker'
import { FontSizeStepper } from './FontSizeStepper'
import { FontPicker } from '@/components/ui/FontPicker'
import { IconButton, MenuItem, ICON } from '@/components/ui/Button'

// ============================================================
// 서식 툴바
//  모든 버튼이 같은 크기(IconButton)와 같은 아이콘 크기(ICON.md)를 씁니다.
//  여기서 바꾸는 서식은 전부 "선택한 글자"에만 적용됩니다(메모 전체 기본값은
//  꾸미기 탭에서 따로 다룹니다 — 서로 다른 기능이니 혼동하지 마세요).
// ============================================================

interface Props {
  onAfter: () => void
  focusEditor: () => void
  /** 글자 크기 입력창에 처음 보여줄 값 (메모의 현재 기본 글자 크기) */
  defaultFontSize?: number
}

const TEXT_COLORS = [
  '#1a1c20', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff',
]

const HILITE_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e9d5ff', 'transparent']

const LINE_HEIGHTS = ['1', '1.15', '1.5', '2']

const PARAGRAPH_SPACINGS = [
  { label: '없음', px: 0 },
  { label: '좁게', px: 4 },
  { label: '보통', px: 8 },
  { label: '넓게', px: 16 },
]

export function EditorToolbar({ onAfter, focusEditor, defaultFontSize = 16 }: Props) {
  // mousedown으로 처리해야 에디터의 선택 영역이 유지됩니다.
  const run = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault()
    fn()
    onAfter()
  }

  return (
    <div className="no-drag flex shrink-0 flex-wrap items-center gap-0.5 border-y border-black/[0.06] px-4 py-1.5 dark:border-white/[0.08]">
      <IconButton title="굵게" size="sm" onMouseDown={run(() => rt.exec('bold'))}>
        <Bold size={ICON.md} />
      </IconButton>
      <IconButton title="기울임" size="sm" onMouseDown={run(() => rt.exec('italic'))}>
        <Italic size={ICON.md} />
      </IconButton>
      <IconButton title="밑줄" size="sm" onMouseDown={run(() => rt.exec('underline'))}>
        <Underline size={ICON.md} />
      </IconButton>
      <IconButton title="취소선" size="sm" onMouseDown={run(() => rt.exec('strikeThrough'))}>
        <Strikethrough size={ICON.md} />
      </IconButton>

      <Divider />

      <IconButton title="위첨자" size="sm" onMouseDown={run(rt.superscript)}>
        <Superscript size={ICON.md} />
      </IconButton>
      <IconButton title="아래첨자" size="sm" onMouseDown={run(rt.subscript)}>
        <Subscript size={ICON.md} />
      </IconButton>

      <Divider />

      <Popover
        preserveSelection
        trigger={() => <IconButton title="선택한 글자의 글꼴" size="sm"><TypeIcon size={ICON.md} /></IconButton>}
      >
        {(close) => (
          <FontPicker
            onPick={(f) => {
              rt.setFontFamily(f.stack)
              onAfter()
              close()
            }}
          />
        )}
      </Popover>

      <Popover preserveSelection trigger={() => <IconButton title="글자색" size="sm"><Baseline size={ICON.md} /></IconButton>}>
        <ColorGrid colors={TEXT_COLORS} onPick={(c) => { rt.setForeColor(c); onAfter() }} allowCustom />
      </Popover>

      <Popover preserveSelection trigger={() => <IconButton title="형광펜" size="sm"><Highlighter size={ICON.md} /></IconButton>}>
        <ColorGrid colors={HILITE_COLORS} onPick={(c) => { rt.setHiliteColor(c); onAfter() }} />
      </Popover>

      <FontSizeStepper value={defaultFontSize} onApply={(px) => { rt.setFontSize(px); onAfter() }} />

      <Divider />

      <IconButton title="왼쪽 정렬" size="sm" onMouseDown={run(() => rt.align('Left'))}>
        <AlignLeft size={ICON.md} />
      </IconButton>
      <IconButton title="가운데 정렬" size="sm" onMouseDown={run(() => rt.align('Center'))}>
        <AlignCenter size={ICON.md} />
      </IconButton>
      <IconButton title="오른쪽 정렬" size="sm" onMouseDown={run(() => rt.align('Right'))}>
        <AlignRight size={ICON.md} />
      </IconButton>
      <IconButton title="양쪽 정렬" size="sm" onMouseDown={run(() => rt.align('Full'))}>
        <AlignJustify size={ICON.md} />
      </IconButton>

      <Divider />

      <IconButton title="내어쓰기" size="sm" onMouseDown={run(rt.outdent)}>
        <Outdent size={ICON.md} />
      </IconButton>
      <IconButton title="들여쓰기" size="sm" onMouseDown={run(rt.indent)}>
        <Indent size={ICON.md} />
      </IconButton>

      <Popover
        trigger={() => (
          <IconButton title="줄간격 — 커서가 있는 문단에 적용" size="sm">
            <span className="text-sm">줄간격</span>
          </IconButton>
        )}
      >
        {(close) => (
          <div className="w-24">
            {LINE_HEIGHTS.map((v) => (
              <MenuItem
                key={v}
                onMouseDown={(e) => {
                  e.preventDefault()
                  rt.setLineHeight(v)
                  onAfter()
                  close()
                }}
              >
                {v}
              </MenuItem>
            ))}
          </div>
        )}
      </Popover>

      <Popover
        trigger={() => (
          <IconButton title="문단 간격 — 커서가 있는 문단에 적용" size="sm">
            <span className="text-sm">문단간격</span>
          </IconButton>
        )}
      >
        {(close) => (
          <div className="w-28">
            {PARAGRAPH_SPACINGS.map((p) => (
              <MenuItem
                key={p.label}
                onMouseDown={(e) => {
                  e.preventDefault()
                  rt.setParagraphSpacing(p.px)
                  onAfter()
                  close()
                }}
              >
                {p.label}
              </MenuItem>
            ))}
          </div>
        )}
      </Popover>

      <Divider />

      <IconButton title="글머리 기호" size="sm" onMouseDown={run(rt.bulletList)}>
        <List size={ICON.md} />
      </IconButton>
      <IconButton title="번호 목록" size="sm" onMouseDown={run(rt.numberList)}>
        <ListOrdered size={ICON.md} />
      </IconButton>
      <IconButton title="체크박스" size="sm" onMouseDown={run(rt.insertCheckbox)}>
        <CheckSquare size={ICON.md} />
      </IconButton>
      <IconButton title="인용" size="sm" onMouseDown={run(rt.blockquote)}>
        <Quote size={ICON.md} />
      </IconButton>
      <IconButton title="코드 블록" size="sm" onMouseDown={run(rt.codeBlock)}>
        <Code size={ICON.md} />
      </IconButton>

      <Divider />

      <Popover align="right" trigger={() => <IconButton title="특수문자" size="sm"><Star size={ICON.md} /></IconButton>}>
        <SpecialCharPicker
          onPick={(ch) => {
            focusEditor()
            rt.insertText(ch)
            onAfter()
          }}
        />
      </Popover>

      <Popover align="right" trigger={() => <IconButton title="이모지" size="sm"><Smile size={ICON.md} /></IconButton>}>
        <EmojiPicker
          onPick={(emoji) => {
            focusEditor()
            rt.insertText(emoji)
            onAfter()
          }}
        />
      </Popover>

      <Popover align="right" trigger={() => <IconButton title="특수 이모티콘" size="sm"><Laugh size={ICON.md} /></IconButton>}>
        <KaomojiPicker
          onPick={(text) => {
            focusEditor()
            rt.insertText(text)
            onAfter()
          }}
        />
      </Popover>
    </div>
  )
}

function Divider() {
  return <div className="mx-1.5 h-4 w-px shrink-0 bg-line" />
}

function ColorGrid({
  colors, onPick, allowCustom,
}: {
  colors: string[]
  onPick: (c: string) => void
  /** 사용자가 원하는 색을 직접 골라 쓸 수 있는 '+' 스와치를 추가합니다. */
  allowCustom?: boolean
}) {
  return (
    <div className="grid w-[124px] grid-cols-4 gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          onMouseDown={(e) => {
            e.preventDefault()
            onPick(c)
          }}
          title={c === 'transparent' ? '없음' : c}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-xs text-faint transition-transform hover:scale-110"
          style={{ background: c === 'transparent' ? undefined : c }}
        >
          {c === 'transparent' ? '✕' : ''}
        </button>
      ))}
      {allowCustom && (
        <label
          title="색 직접 선택"
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-line-strong text-xs text-faint transition-colors hover:border-accent hover:text-accent"
        >
          ＋
          <input
            type="color"
            className="sr-only"
            onChange={(e) => onPick(e.target.value)}
          />
        </label>
      )}
    </div>
  )
}
