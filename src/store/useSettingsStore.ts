// ============================================================
// 설정 상태 관리 (Zustand)
// ============================================================

import { create } from 'zustand'
import type { Settings, MemoDesign } from '@/types'
import { loadSettings, saveSettings } from '@/lib/storage'
import { electron } from '@/lib/electron'

/** #rrggbb를 [r,g,b]로 변환 (실패하면 null) */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return null
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

/** <html>에 다크모드 클래스와 강조색을 반영 */
function applyTheme(theme: 'light' | 'dark', accent: string) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  // 사용자 지정 강조색을 CSS 변수로 노출 (2단계: 사용자 지정 테마)
  root.style.setProperty('--accent', accent)

  // 선택 상태 배경(--accent-soft)·테두리(--accent-border-soft)도 강조색에 맞춰 계산합니다.
  // (버튼 hover는 계속 중립색을 쓰고, '선택됨' 표시만 강조색을 따라가도록.
  //  Tailwind의 border-accent/30 같은 투명도 modifier는 var() 색상엔 적용되지 않아
  //  직접 rgba를 계산해 별도 변수로 둡니다)
  const rgb = hexToRgb(accent)
  if (rgb) {
    const softAlpha = theme === 'dark' ? 0.13 : 0.07
    const borderAlpha = theme === 'dark' ? 0.45 : 0.35
    root.style.setProperty('--accent-soft', `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${softAlpha})`)
    root.style.setProperty('--accent-border-soft', `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${borderAlpha})`)
  }
}

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  /** 새 메모 기본 디자인 일부만 변경 */
  setDefaultDesign: (patch: Partial<MemoDesign>) => void
  replace: (settings: Settings) => void
}

const initial = loadSettings()
applyTheme(initial.theme, initial.custom.accent)

/** store에서 순수 설정값만 뽑아냅니다 (함수 제외) */
function pick(state: SettingsState): Settings {
  const { set: _a, setDefaultDesign: _b, replace: _c, ...rest } = state
  return rest
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,

  set: (key, value) => {
    set({ [key]: value } as Pick<Settings, typeof key>)
    const next = pick(get())
    if (key === 'theme' || key === 'custom') applyTheme(next.theme, next.custom.accent)
    if (key === 'autoStart') electron()?.setAutoStart(value as boolean)
    saveSettings(next)
  },

  setDefaultDesign: (patch) => {
    set((s) => ({ defaultDesign: { ...s.defaultDesign, ...patch } }))
    saveSettings(pick(get()))
  },

  replace: (settings) => {
    set(settings)
    applyTheme(settings.theme, settings.custom.accent)
    saveSettings(settings)
  },
}))
