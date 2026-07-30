// ============================================================
// 리치 텍스트 편집 헬퍼
//  - 브라우저/Electron 모두에서 동작하는 document.execCommand 기반입니다.
//  - execCommand는 오래된 API지만 여전히 모든 환경에서 잘 동작하고,
//    별도 라이브러리 없이 서식(굵게/기울임 등)을 구현할 수 있어 초보자가 이해하기 쉽습니다.
// ============================================================

/** 서식 명령 실행 (예: 'bold', 'italic', 'underline', 'strikeThrough') */
export function exec(command: string, value?: string): void {
  document.execCommand(command, false, value)
}

// ------------------------------------------------------------
// 선택 범위 기억/복원
//  글자 크기 입력창처럼 서식 도구 자체가 진짜 키보드 포커스를 받아야 하는
//  경우(숫자를 직접 타이핑), 포커스가 입력창으로 넘어가면서 에디터의 선택
//  영역이 사라집니다. 에디터에서 손을 뗄 때(mouseup/keyup)마다 선택 범위를
//  기억해 두었다가, 서식을 적용하는 순간 그 범위로 되돌려 놓습니다.
// ------------------------------------------------------------
let savedRange: Range | null = null

/** 지금 선택 범위를 기억해 둡니다. (에디터의 onMouseUp/onKeyUp에서 호출) */
export function saveSelection(): void {
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange()
}

/** 기억해 둔 선택 범위를 다시 현재 선택으로 되돌립니다. */
function restoreSelection(): void {
  if (!savedRange) return
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(savedRange)
}

/** 글자색 */
export function setForeColor(color: string): void {
  exec('foreColor', color)
}

/** 형광펜(배경색) */
export function setHiliteColor(color: string): void {
  // 브라우저에 따라 hiliteColor 또는 backColor
  if (!document.execCommand('hiliteColor', false, color)) {
    exec('backColor', color)
  }
}

/** 정렬 (Full = 양쪽 정렬) */
export function align(dir: 'Left' | 'Center' | 'Right' | 'Full'): void {
  exec('justify' + dir)
}

/** 위첨자 */
export function superscript(): void {
  exec('superscript')
}

/** 아래첨자 */
export function subscript(): void {
  exec('subscript')
}

/** 글머리 기호 목록 */
export function bulletList(): void {
  exec('insertUnorderedList')
}

/** 번호 목록 */
export function numberList(): void {
  exec('insertOrderedList')
}

/** 인용 */
export function blockquote(): void {
  exec('formatBlock', 'blockquote')
}

/** 코드 블록 */
export function codeBlock(): void {
  exec('formatBlock', 'pre')
}

/** 현재 커서 위치에 텍스트(특수문자/이모지) 삽입 */
export function insertText(text: string): void {
  exec('insertText', text)
}

/**
 * 체크박스 항목 삽입.
 * - execCommand로는 커스텀 체크박스를 넣기 어려워 직접 HTML을 삽입합니다.
 */
export function insertCheckbox(): void {
  // 뒤의 &nbsp;는 체크박스 옆에 바로 글자를 입력할 수 있게 하는 자리입니다.
  const html = '<div class="check-item"><input type="checkbox" contenteditable="false" />&nbsp;</div>'
  exec('insertHTML', html)
}

/**
 * 선택 영역을 style이 있는 span으로 감쌉니다(글자 크기·글꼴처럼 execCommand로
 * 표현할 수 없는 임의의 값을 적용할 때 공통으로 씁니다).
 *
 *  - 선택한 글자가 있으면: 그 글자만 span으로 감쌉니다.
 *  - 선택한 글자가 없으면(커서만 있음): 폭 없는 문자(zero-width space)를 심은 span을
 *    커서 자리에 넣고 그 안으로 커서를 옮깁니다. 이후 입력하는 글자는 이 span 안에
 *    이어지므로 자연스럽게 새 서식으로 써집니다(Word/엑셀과 동일한 방식).
 */
function wrapSelectionWithStyle(apply: (style: CSSStyleDeclaration) => void): void {
  restoreSelection()
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)

  if (sel.isCollapsed) {
    const span = document.createElement('span')
    apply(span.style)
    const marker = document.createTextNode('​')
    span.appendChild(marker)
    range.insertNode(span)

    const newRange = document.createRange()
    newRange.setStart(marker, 1)
    newRange.setEnd(marker, 1)
    sel.removeAllRanges()
    sel.addRange(newRange)
    return
  }

  const span = document.createElement('span')
  apply(span.style)
  try {
    range.surroundContents(span)
    // 선택 영역 유지
    sel.removeAllRanges()
    const newRange = document.createRange()
    newRange.selectNodeContents(span)
    sel.addRange(newRange)
  } catch {
    // 여러 블록에 걸친 선택은 surroundContents가 실패할 수 있어 무시
  }
}

/** 글자 크기 지정 (px, 1~100). execCommand fontSize는 1~7단계뿐이라 span으로 직접 감쌉니다. */
export function setFontSize(px: number): void {
  wrapSelectionWithStyle((style) => { style.fontSize = px + 'px' })
}

/** 선택한 글자의 글꼴만 바꿉니다 (메모 전체 기본 글꼴은 '꾸미기'에서 따로 다룹니다). */
export function setFontFamily(stack: string): void {
  wrapSelectionWithStyle((style) => { style.fontFamily = stack })
}

// ------------------------------------------------------------
// 문단 서식 — 줄간격 · 문단 간격 · 들여쓰기/내어쓰기
//  글자 크기·색 같은 "글자" 서식과 달리, 문단 서식은 커서가 있는
//  문단(들여쓰기 등은 여러 줄이면 여러 문단) 전체에 적용됩니다.
//  (Word에서 줄간격을 바꿀 때 커서가 있는 문단 전체가 바뀌는 것과 같습니다)
// ------------------------------------------------------------

const BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'BLOCKQUOTE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'])

/** 지금 선택 영역이 걸쳐 있는 문단(블록) 엘리먼트를 찾습니다. */
function getSelectedParagraphs(): HTMLElement[] {
  const editorRoot = document.querySelector<HTMLElement>('.rich-editor')
  if (!editorRoot) return []

  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return []
  const range = sel.getRangeAt(0)

  // 편집 영역의 '바로 아래' 블록 자식들 (Enter를 치면 보통 이 레벨에 div가 생깁니다)
  const blockChildren = Array.from(editorRoot.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && BLOCK_TAGS.has(el.tagName),
  )

  // 아직 줄바꿈이 없어 블록 자식이 없다면 편집 영역 자체가 하나의 문단입니다.
  if (blockChildren.length === 0) return [editorRoot]

  const touched = blockChildren.filter((el) => range.intersectsNode(el))
  return touched.length > 0 ? touched : [editorRoot]
}

/** 줄간격 (예: '1', '1.15', '1.5', '2') */
export function setLineHeight(value: string): void {
  restoreSelection()
  getSelectedParagraphs().forEach((el) => {
    el.style.lineHeight = value
  })
}

/** 문단(단락) 사이 간격 (px) */
export function setParagraphSpacing(px: number): void {
  restoreSelection()
  getSelectedParagraphs().forEach((el) => {
    el.style.marginBottom = px + 'px'
  })
}

/** 들여쓰기 */
export function indent(): void {
  exec('indent')
}

/** 내어쓰기 */
export function outdent(): void {
  exec('outdent')
}
