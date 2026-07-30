import { useEffect, useRef } from 'react'
import { saveSelection } from '@/lib/richtext'

// ============================================================
// 리치 텍스트 편집 영역 (contenteditable)
//  - value(HTML)를 받아 표시하고, 편집되면 onChange로 알려줍니다.
//  - 체크박스 클릭 시 완료(취소선) 상태를 토글합니다.
// ============================================================

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  fontFamily?: string
  fontSize?: number
  readOnly?: boolean
  className?: string
  /** 에디터 DOM에 접근이 필요할 때 (서식 버튼 등) */
  editorRef?: React.RefObject<HTMLDivElement>
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '메모를 입력하세요...',
  fontFamily,
  fontSize,
  readOnly = false,
  className = '',
  editorRef,
}: Props) {
  const innerRef = useRef<HTMLDivElement>(null)
  const ref = editorRef ?? innerRef

  // 외부 value가 바뀌었을 때만 DOM에 반영 (편집 중 커서 튐 방지)
  useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value) {
      el.innerHTML = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // 체크박스 클릭 처리
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
      const item = target.closest('.check-item')
      if (item) {
        // 체크 상태에 따라 done 클래스 토글.
        // checked는 DOM '속성(property)'이라 innerHTML에 저장되지 않으므로,
        // checked '어트리뷰트'도 함께 넣어줘야 다시 열었을 때 체크가 유지됩니다.
        setTimeout(() => {
          if ((target as HTMLInputElement).checked) {
            item.classList.add('done')
            target.setAttribute('checked', '')
          } else {
            item.classList.remove('done')
            target.removeAttribute('checked')
          }
          if (ref.current) onChange(ref.current.innerHTML)
        }, 0)
      }
    }
  }

  // onInput에서는 반드시 currentTarget(에디터 div)을 읽습니다.
  // target을 쓰면 체크박스에서 버블링된 input 이벤트 때 빈 문자열이 저장되어
  // 메모 내용이 통째로 지워집니다.
  return (
    <div
      ref={ref}
      className={`rich-editor ${className}`}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      // 맞춤법 검사를 끕니다.
      // Chromium에는 한국어 사전이 없어서 한글 문장 전체에
      // 빨간 물결 밑줄이 그어져 메모가 지저분해 보입니다.
      spellCheck={false}
      data-placeholder={placeholder}
      onInput={(e) => onChange(e.currentTarget.innerHTML)}
      onClick={handleClick}
      onMouseUp={saveSelection}
      onKeyUp={saveSelection}
      style={{
        fontFamily,
        fontSize: fontSize ? `${fontSize}px` : undefined,
      }}
    />
  )
}
