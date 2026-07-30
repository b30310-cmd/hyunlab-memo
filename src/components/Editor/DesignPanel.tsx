import { useState } from 'react'
import { useMemoStore } from '@/store/useMemoStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { BACKGROUND_COLORS, FONT_SIZES, SKINS, BORDERS, SHADOWS, BRAND_ACCENT } from '@/lib/constants'
import { FontPicker } from '@/components/ui/FontPicker'

// ============================================================
// 꾸미기 패널 — 배경 / 글꼴 / 테두리
//  여기서 바뀌는 값은 design 저장소에만 기록됩니다. (본문은 그대로)
// ============================================================

const TABS = ['배경', '글꼴', '테두리'] as const
type Tab = (typeof TABS)[number]

export function DesignPanel({ memoId }: { memoId: string }) {
  const design = useMemoStore((s) => s.getDesign(memoId))
  const updateDesign = useMemoStore((s) => s.updateDesign)
  const isDark = useSettingsStore((s) => s.theme === 'dark')
  const custom = useSettingsStore((s) => s.custom)
  const setSetting = useSettingsStore((s) => s.set)
  const [tab, setTab] = useState<Tab>('배경')
  const [fontTarget, setFontTarget] = useState<'title' | 'body'>('body')

  const addCustomColor = (hex: string) => {
    if (custom.customColors.includes(hex)) return
    setSetting('custom', { ...custom, customColors: [...custom.customColors, hex] })
  }

  return (
    <div className="w-[248px]">
      {/* 탭 */}
      <div className="mb-1 flex gap-0.5 rounded-md bg-surface-2 p-0.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-6 flex-1 rounded-sm text-sm transition-all ${
              tab === t ? 'bg-surface text-body shadow-sm' : 'text-muted hover:text-body'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === '배경' && (
        <>
          <Label>배경색</Label>
          <div className="flex flex-wrap gap-1.5">
            {BACKGROUND_COLORS.map((c) => (
              <Swatch
                key={c.key}
                color={isDark ? c.dark : c.light}
                title={c.name}
                selected={design.color === c.key}
                onClick={() => updateDesign(memoId, { color: c.key })}
              />
            ))}
            {custom.customColors.map((hex) => (
              <Swatch
                key={hex}
                color={hex}
                title={hex}
                selected={design.color === hex}
                onClick={() => updateDesign(memoId, { color: hex })}
              />
            ))}
            <label
              title="색 직접 추가"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-line-strong text-xs text-faint transition-colors hover:border-accent hover:text-accent"
            >
              ＋
              <input
                type="color"
                className="sr-only"
                onChange={(e) => {
                  addCustomColor(e.target.value)
                  updateDesign(memoId, { color: e.target.value })
                }}
              />
            </label>
          </div>

          <Label>스킨</Label>
          <Grid cols={3}>
            {SKINS.map((s) => (
              <Chip key={s.key} selected={design.skin === s.key} onClick={() => updateDesign(memoId, { skin: s.key })}>
                {s.name}
              </Chip>
            ))}
          </Grid>
        </>
      )}

      {tab === '글꼴' && (
        <>
          <Label>글꼴 — 제목과 본문을 따로 지정할 수 있습니다</Label>
          <div className="mb-1.5 flex gap-0.5 rounded-md bg-surface-2 p-0.5">
            <button
              onClick={() => setFontTarget('title')}
              className={`h-6 flex-1 rounded-sm text-sm transition-all ${
                fontTarget === 'title' ? 'bg-surface text-body shadow-sm' : 'text-muted hover:text-body'
              }`}
            >
              제목
            </button>
            <button
              onClick={() => setFontTarget('body')}
              className={`h-6 flex-1 rounded-sm text-sm transition-all ${
                fontTarget === 'body' ? 'bg-surface text-body shadow-sm' : 'text-muted hover:text-body'
              }`}
            >
              본문
            </button>
          </div>
          <FontPicker
            value={fontTarget === 'title' ? (design.titleFont ?? design.font) : design.font}
            onPick={(f) =>
              updateDesign(memoId, fontTarget === 'title' ? { titleFont: f.key } : { font: f.key })
            }
          />

          <Label>글자 크기</Label>
          <Grid cols={4}>
            {FONT_SIZES.map((size) => (
              <Chip
                key={size}
                selected={design.fontSize === size}
                onClick={() => updateDesign(memoId, { fontSize: size })}
              >
                {size}
              </Chip>
            ))}
          </Grid>
        </>
      )}

      {tab === '테두리' && (
        <>
          <Label>테두리</Label>
          <Grid cols={3}>
            {BORDERS.map((b) => (
              <Chip key={b.key} selected={design.border === b.key} onClick={() => updateDesign(memoId, { border: b.key })}>
                {b.name}
              </Chip>
            ))}
          </Grid>

          <Label>그림자</Label>
          <Grid cols={4}>
            {SHADOWS.map((s) => (
              <Chip key={s.key} selected={design.shadow === s.key} onClick={() => updateDesign(memoId, { shadow: s.key })}>
                {s.name}
              </Chip>
            ))}
          </Grid>

          <Label>앱 강조색</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={custom.accent}
              onChange={(e) => setSetting('custom', { ...custom, accent: e.target.value })}
              className="h-7 w-12 cursor-pointer rounded-sm border border-line bg-transparent"
            />
            <button
              onClick={() => setSetting('custom', { ...custom, accent: BRAND_ACCENT })}
              className="text-xs text-faint transition-colors hover:text-body"
            >
              기본값으로
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="px-1 pb-1.5 pt-3 text-xs font-medium text-faint">{children}</div>
}

function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {children}
    </div>
  )
}

function Swatch({
  color, title, selected, onClick,
}: {
  color: string
  title: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 ${
        selected ? 'border-2 border-accent' : 'border-line-strong'
      }`}
      style={{ background: color }}
    />
  )
}

function Chip({
  children, selected, onClick,
}: {
  children: React.ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-[var(--h-sm)] items-center justify-center rounded-sm text-sm transition-colors ${
        selected ? 'bg-accent text-white' : 'bg-surface-2 text-muted hover:text-body'
      }`}
    >
      {children}
    </button>
  )
}
