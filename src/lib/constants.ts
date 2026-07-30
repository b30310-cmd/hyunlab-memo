// ============================================================
// 앱에서 사용하는 상수 모음
//  (색상, 폰트, 특수문자, 이모지, 스킨/테두리/그림자)
//  - 새 값을 추가하고 싶으면 이 파일만 수정하면 됩니다.
// ============================================================

import type { SkinType, BorderType, ShadowType, LabelKey } from '@/types'

/**
 * 브랜드 강조색 (밝고 부드러운 주황 계열).
 * 사용자 테스트 피드백을 반영해 기존 코랄(#F5765C)보다 밝게 조정했습니다.
 * 기본 강조색·프로젝트 기본 색상·"기본값으로" 버튼 등 앱 전체에서 이 상수 하나만 씁니다.
 */
export const BRAND_ACCENT = '#FF8A5C'

/** 배경색 팔레트 (라이트 / 다크 각각의 값) */
export interface ColorOption {
  key: string
  name: string
  light: string // 라이트 모드 배경색
  dark: string // 다크 모드 배경색
}

export const BACKGROUND_COLORS: ColorOption[] = [
  { key: 'white', name: '화이트', light: '#ffffff', dark: '#1e1e22' },
  { key: 'cream', name: '크림', light: '#fffafa', dark: '#2b2820' },
  { key: 'yellow', name: '연노랑', light: '#fff9c4', dark: '#2e2c17' },
  { key: 'pink', name: '연핑크', light: '#ffe4ec', dark: '#2e2027' },
  { key: 'mint', name: '민트', light: '#d7f5e9', dark: '#172a24' },
  { key: 'lavender', name: '라벤더', light: '#eae4ff', dark: '#242030' },
  { key: 'sky', name: '하늘색', light: '#dcefff', dark: '#182430' },
  { key: 'gray', name: '연회색', light: '#f1f3f5', dark: '#26262a' },
]

/** color 키 또는 hex 값을 실제 CSS 색상으로 변환 */
export function resolveColor(colorKey: string, isDark: boolean): string {
  // 사용자가 추가한 커스텀 색상(#으로 시작)은 그대로 사용
  if (colorKey.startsWith('#')) return colorKey
  const found = BACKGROUND_COLORS.find((c) => c.key === colorKey)
  if (!found) return isDark ? '#1e1e22' : '#ffffff'
  return isDark ? found.dark : found.light
}

/** 폰트 분류 */
export type FontCategory = 'sans' | 'serif' | 'handwriting' | 'title' | 'system'

/** 폰트 목록 */
export interface FontOption {
  key: string
  name: string
  /** CSS font-family 값 */
  stack: string
  category: FontCategory
}

/**
 * 폰트 분류 탭 (꾸미기 글꼴 선택창에서 사용).
 * 실제로 파일/CDN이 연결되어 렌더링되는 글꼴만 등록되어 있습니다.
 * (이름만 있고 실제로 로드되지 않는 폰트는 "되는 척"하지 않기 위해 넣지 않았습니다 —
 *  요청하신 글꼴 중 아직 못 넣은 것들은 README/응답 메시지에 별도로 안내합니다)
 */
export const FONT_CATEGORIES: { key: FontCategory; name: string; icon: string }[] = [
  { key: 'sans', name: '업무용', icon: '📄' },
  { key: 'serif', name: '바탕체', icon: '📖' },
  { key: 'handwriting', name: '손글씨', icon: '✍️' },
  { key: 'title', name: '제목용', icon: '🎨' },
]

export const FONTS: FontOption[] = [
  // 📄 업무용 (Sans Serif)
  { key: 'pretendard', name: 'Pretendard', stack: "'Pretendard', sans-serif", category: 'sans' },
  { key: 'suit', name: 'SUIT', stack: "'SUIT Variable', 'Pretendard', sans-serif", category: 'sans' },
  { key: 'noto', name: 'Noto Sans KR', stack: "'Noto Sans KR', sans-serif", category: 'sans' },
  { key: 'nanumgothic', name: '나눔고딕', stack: "'Nanum Gothic', sans-serif", category: 'sans' },

  // 📖 업무용 바탕체 (Serif)
  { key: 'ridi', name: 'RIDIBatang', stack: "'RIDIBatang', serif", category: 'serif' },
  { key: 'marubuli', name: '마루부리', stack: "'MaruBuri', serif", category: 'serif' },
  { key: 'nanummyeongjo', name: '나눔명조', stack: "'Nanum Myeongjo', serif", category: 'serif' },
  { key: 'notoserif', name: '본명조 (Noto Serif KR)', stack: "'Noto Serif KR', serif", category: 'serif' },

  // ✍️ 손글씨
  { key: 'cafe24gowoonbam', name: '카페24 고운밤', stack: "'Cafe24Gowoonbam', 'Pretendard', sans-serif", category: 'handwriting' },
  { key: 'ongleip', name: '온글잎 의연체', stack: "'OngleipEoyeonce', 'Pretendard', sans-serif", category: 'handwriting' },
  { key: 'nanumbrush', name: '나눔손글씨(붓)', stack: "'Nanum Brush Script', 'Pretendard', sans-serif", category: 'handwriting' },
  { key: 'kyobohand', name: '교보손글씨 2019', stack: "'KyoboHandwriting2019', 'Pretendard', sans-serif", category: 'handwriting' },
  { key: 'aebihyeon', name: '어비 현정체', stack: "'AebiHyeon', 'Pretendard', sans-serif", category: 'handwriting' },
  { key: 'schoolsafe', name: '학교안심 우주', stack: "'SchoolSafeUniverse', 'Pretendard', sans-serif", category: 'handwriting' },

  // 🎨 제목용
  { key: 'gmarket', name: 'G마켓 산스', stack: "'Gmarket Sans', 'Pretendard', sans-serif", category: 'title' },
  { key: 'paperlogy', name: 'Paperlogy', stack: "'Paperlogy', 'Pretendard', sans-serif", category: 'title' },
  { key: 'cafe24', name: '카페24 써라운드', stack: "'Cafe24Ssurround', 'Pretendard', sans-serif", category: 'title' },
  { key: 'jalnan', name: '여기어때 잘난체', stack: "'Jalnan', 'Pretendard', sans-serif", category: 'title' },

  { key: 'system', name: '시스템 기본', stack: 'system-ui, sans-serif', category: 'system' },
]

export function resolveFont(fontKey: string): string {
  const found = FONTS.find((f) => f.key === fontKey)
  return found ? found.stack : FONTS[0].stack
}

/** 글자 크기 프리셋 */
export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32]

/** 특수문자 (카테고리별) */
export interface SpecialCharCategory {
  name: string
  chars: string[]
}

export const SPECIAL_CHARS: SpecialCharCategory[] = [
  {
    name: '하트/별',
    chars: ['♡', '♥', '☆', '★', '✦', '✧', '✩', '✪', '✫', '❤', '💛', '💚'],
  },
  {
    name: '꽃/장식',
    chars: ['✿', '❀', '❁', '❃', '❋', '✾', '♣', '♠', '♦', '♧', '❖', '◆'],
  },
  {
    name: '화살표',
    chars: ['➜', '→', '←', '↑', '↓', '↔', '⇒', '⇐', '»', '«', '▶', '◀'],
  },
  {
    name: '체크/기호',
    chars: ['✓', '✔', '✗', '✘', '●', '○', '◎', '■', '□', '▪', '▫', '•'],
  },
  {
    name: '날씨/표정',
    chars: ['☀', '☁', '☂', '☃', '☺', '☻', '☹', '♨', '✈', '☎', '✉', '✂'],
  },
  {
    name: '문장부호',
    chars: ['…', '·', '※', '§', '¶', '†', '‡', '“', '”', '‘', '’', '—'],
  },
]

/** 이모지 (카테고리별 - Emoji Picker용) */
export interface EmojiCategory {
  name: string
  icon: string
  emojis: string[]
}

export const EMOJIS: EmojiCategory[] = [
  {
    name: '표정',
    icon: '😀',
    emojis: [
      '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😜', '🤔', '😎', '🥳', '😭',
      '😅', '😉', '🙂', '🙃', '😴', '😇', '🤩', '😋', '😌', '😏', '🥺', '😤',
    ],
  },
  {
    name: '동물',
    icon: '🐶',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐷', '🐸', '🐵', '🐔', '🦄'],
  },
  {
    name: '음식',
    icon: '🍔',
    emojis: ['🍎', '🍕', '🍔', '🍟', '🌭', '🍿', '🍩', '🍪', '🎂', '🍰', '☕', '🍺', '🍜', '🍣', '🍱', '🍑'],
  },
  {
    name: '활동',
    icon: '⚽',
    emojis: ['⚽', '🏀', '🎾', '🏐', '🎮', '🎯', '🎨', '🎬', '🎵', '🎸', '📚', '✏️', '💻', '📱', '⏰', '🎁'],
  },
  {
    name: '기호',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '⭐', '🔥', '✨', '💡', '✅', '❌', '⚠️', '🔔', '📌', '🚀'],
  },
]

/** 특수 이모티콘(카오모지) 기본 목록. 사용자가 직접 추가한 것과 즐겨찾기는 각 피커에서 따로 저장합니다. */
export const KAOMOJIS: string[] = [
  '(_ _)', '^^', ':)', ':(', '(^_^)', '(•‿•)', 'ㅠㅠ', 'ㅎㅎ', '＼(^o^)／',
  '(๑˃̵ᴗ˂̵)', '(*^▽^*)', '(¬_¬)', '(o_o)', '(>_<)', '(T_T)', '(-_-)', '(^-^)v',
  'ㅜㅜ', 'ㅋㅋ', '(._.)', '(⊙_⊙)', '(´･_･｀)', '(￣▽￣)', 'orz', '(๑•̀ㅂ•́)و',
]

// 태그는 검색용 키워드입니다 (제품명·장비명·업무 주제 등).
// '업무'/'개인'은 라벨(업무 상태)과 뜻이 겹쳐서 추천 목록에서 뺐습니다.
export const SUGGESTED_TAGS = ['회사', '일정', '아이디어']

// ============================================================
// 컬러 라벨 — 메모를 한눈에 구분하는 색 점
// ============================================================

// 라벨은 '업무 상태'만 나타냅니다 (긴급/오늘/진행 중/완료).
// 주제·분야 구분(업무/개인 등)은 태그의 역할이라 라벨에서는 뺐습니다.
// (예전 데이터에 남아있는 'work'/'personal' 라벨은 지우지 않고, 목록에만 노출하지 않습니다)
export const LABELS: { key: LabelKey; name: string; color: string }[] = [
  { key: 'urgent', name: '긴급', color: '#ef4444' },
  { key: 'today', name: '오늘', color: '#f97316' },
  { key: 'doing', name: '진행 중', color: '#eab308' },
  { key: 'done', name: '완료', color: '#22c55e' },
]

export function getLabel(key: LabelKey | null | undefined) {
  if (!key) return undefined
  return LABELS.find((l) => l.key === key)
}

// ============================================================
// 2단계: 꾸미기 — 스킨 / 테두리 / 그림자
// ============================================================

/** 스킨 = 메모지 배경 무늬. CSS background로 그립니다(이미지 파일 불필요). */
export const SKINS: { key: SkinType; name: string }[] = [
  { key: 'plain', name: '기본' },
  { key: 'lined', name: '줄노트' },
  { key: 'grid', name: '모눈' },
  { key: 'dot', name: '점선' },
  { key: 'sticky', name: '포스트잇' },
  { key: 'paper', name: '종이결' },
]

/**
 * 스킨을 실제 CSS 스타일로 변환합니다.
 * 선 색은 배경 위에 옅게 얹어 어떤 배경색에서도 자연스럽게 보이도록 했습니다.
 */
export function skinStyle(skin: SkinType, isDark: boolean): React.CSSProperties {
  const line = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'
  switch (skin) {
    case 'lined':
      return {
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 27px, ${line} 27px 28px)`,
      }
    case 'grid':
      return {
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 23px, ${line} 23px 24px), repeating-linear-gradient(to right, transparent 0 23px, ${line} 23px 24px)`,
      }
    case 'dot':
      return {
        backgroundImage: `radial-gradient(${line} 1.5px, transparent 1.5px)`,
        backgroundSize: '18px 18px',
      }
    case 'sticky':
      // 포스트잇 느낌: 위쪽에 살짝 접착면 그림자
      return {
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.06), transparent 40px)`,
      }
    case 'paper':
      return {
        backgroundImage: `repeating-linear-gradient(115deg, ${line} 0 1px, transparent 1px 9px)`,
      }
    default:
      return {}
  }
}

export const BORDERS: { key: BorderType; name: string }[] = [
  { key: 'none', name: '없음' },
  { key: 'solid', name: '실선' },
  { key: 'dashed', name: '점선' },
  { key: 'double', name: '이중선' },
  { key: 'accent', name: '강조' },
]

export function borderStyle(border: BorderType, isDark: boolean): React.CSSProperties {
  const c = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)'
  switch (border) {
    case 'solid':
      return { border: `1px solid ${c}` }
    case 'dashed':
      return { border: `1.5px dashed ${c}` }
    case 'double':
      return { border: `3px double ${c}` }
    case 'accent':
      return { border: '2px solid var(--accent)' }
    default:
      return { border: '1px solid transparent' }
  }
}

export const SHADOWS: { key: ShadowType; name: string }[] = [
  { key: 'none', name: '없음' },
  { key: 'soft', name: '약하게' },
  { key: 'medium', name: '보통' },
  { key: 'strong', name: '강하게' },
]

export function shadowStyle(shadow: ShadowType): React.CSSProperties {
  switch (shadow) {
    case 'soft':
      return { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
    case 'medium':
      return { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }
    case 'strong':
      return { boxShadow: '0 12px 32px rgba(0,0,0,0.22)' }
    default:
      return { boxShadow: 'none' }
  }
}

/** 메모 하나의 디자인을 하나의 CSS 스타일 객체로 합칩니다. */
export function memoStyle(
  design: { color: string; skin: SkinType; border: BorderType; shadow: ShadowType },
  isDark: boolean,
): React.CSSProperties {
  return {
    backgroundColor: resolveColor(design.color, isDark),
    ...skinStyle(design.skin, isDark),
    ...borderStyle(design.border, isDark),
    ...shadowStyle(design.shadow),
  }
}
