// ============================================================
// 5단계: 템플릿
//  자주 쓰는 메모 형식을 미리 만들어 둔 것입니다.
//  새 메모를 만들 때 골라 쓰면 바로 채워집니다.
// ============================================================

import type { MemoDesign } from '@/types'

export interface Template {
  key: string
  name: string
  icon: string
  /** 미리 채워질 제목 */
  title: string
  /** 미리 채워질 본문 (HTML) */
  content: string
  /** 함께 적용할 디자인 (선택) */
  design?: Partial<MemoDesign>
  tags?: string[]
}

/** 체크박스 한 줄을 만드는 헬퍼 */
const check = (text: string) =>
  `<div class="check-item"><input type="checkbox" contenteditable="false">&nbsp;${text}</div>`

/** 오늘 날짜 문자열 */
export const today = () =>
  new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

export const TEMPLATES: Template[] = [
  {
    key: 'blank',
    name: '빈 메모',
    icon: '📝',
    title: '',
    content: '',
  },
  {
    key: 'todo',
    name: '할 일 목록',
    icon: '✅',
    title: '할 일',
    content: check('') + check('') + check(''),
    design: { color: 'mint' },
    tags: ['일정'],
  },
  {
    key: 'meeting',
    name: '회의록',
    icon: '💼',
    title: `회의록 (${'{date}'})`,
    content:
      '<b>참석자</b><div><br></div><b>안건</b>' +
      '<ul><li></li></ul>' +
      '<b>결정 사항</b>' +
      '<ul><li></li></ul>' +
      '<b>다음 할 일</b>' +
      check('') +
      check(''),
    design: { color: 'sky', skin: 'lined' },
    tags: ['업무'],
  },
  {
    key: 'daily',
    name: '오늘의 기록',
    icon: '📅',
    title: `${'{date}'}`,
    content:
      '<b>오늘 한 일</b><ul><li></li></ul><b>느낀 점</b><div><br></div><b>내일 할 일</b>' +
      check(''),
    design: { color: 'cream', skin: 'lined' },
    tags: ['개인'],
  },
  {
    key: 'idea',
    name: '아이디어',
    icon: '💡',
    title: '아이디어',
    content: '<b>한 줄 요약</b><div><br></div><b>왜 필요한가</b><div><br></div><b>어떻게</b><ul><li></li></ul>',
    design: { color: 'lavender' },
    tags: ['아이디어'],
  },
  {
    key: 'shopping',
    name: '장보기',
    icon: '🛒',
    title: '장보기 목록',
    content: check('') + check('') + check('') + check(''),
    design: { color: 'yellow', skin: 'dot' },
  },
]

/** 템플릿의 {date} 자리를 오늘 날짜로 바꿉니다. */
export function applyTemplate(t: Template): { title: string; content: string } {
  return {
    title: t.title.replace('{date}', today()),
    content: t.content.replace('{date}', today()),
  }
}
