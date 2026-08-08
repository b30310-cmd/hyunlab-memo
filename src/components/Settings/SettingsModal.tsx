import { useEffect, useRef } from 'react'
import { X, Download, Upload } from 'lucide-react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useUiStore } from '@/store/useUiStore'
import { useMemoStore } from '@/store/useMemoStore'
import { BACKGROUND_COLORS, FONTS, BRAND_ACCENT } from '@/lib/constants'
import { exportJSON, importJSON } from '@/lib/storage'
import { isElectron } from '@/lib/electron'
import { Button, IconButton, ICON } from '@/components/ui/Button'

// ============================================================
// 설정 모달
// ============================================================

export function SettingsModal() {
  const settings = useSettingsStore()
  const { settingsOpen, setSettingsOpen } = useUiStore()
  const importAll = useMemoStore((s) => s.importAll)
  const memoCount = useMemoStore((s) => s.memos.length)
  const fileRef = useRef<HTMLInputElement>(null)

  // ESC로 닫기
  useEffect(() => {
    if (!settingsOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSettingsOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [settingsOpen, setSettingsOpen])

  if (!settingsOpen) return null

  const handleImport = async (file: File) => {
    try {
      const data = await importJSON(file)
      const count = data.memos?.length ?? 0
      // 기본은 '합치기' — 실수로 기존 메모가 사라지지 않게 합니다.
      const replace = confirm(
        `백업 파일에 메모 ${count}개가 있습니다.\n\n` +
          '[확인] 기존 메모를 모두 지우고 교체\n' +
          '[취소] 기존 메모는 그대로 두고 새 메모만 추가 (권장)',
      )
      const added = importAll(data, replace ? 'replace' : 'merge')
      if (data.settings) settings.replace(data.settings)
      alert(replace ? `${added}개로 교체했습니다.` : `${added}개를 추가했습니다.`)
    } catch (e) {
      alert('가져오기 실패: ' + (e as Error).message)
    }
  }

  return (
    <div
      className="animate-fade fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        className="animate-pop max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-xl border border-line bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex h-14 items-center justify-between border-b border-line px-5">
          <h2 className="text-lg font-semibold">설정</h2>
          <IconButton title="닫기" onClick={() => setSettingsOpen(false)}>
            <X size={ICON.lg} />
          </IconButton>
        </div>

        <div className="px-5 py-4">
          <Section>일반</Section>

          <Row label="테마">
            <Segmented
              options={[
                { value: 'light', label: '라이트' },
                { value: 'dark', label: '다크' },
              ]}
              value={settings.theme}
              onChange={(v) => settings.set('theme', v as 'light' | 'dark')}
            />
          </Row>

          <Row label="강조색">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.custom.accent}
                onChange={(e) => settings.set('custom', { ...settings.custom, accent: e.target.value })}
                className="h-7 w-12 cursor-pointer rounded-sm border border-line bg-transparent"
              />
              <button
                onClick={() => settings.set('custom', { ...settings.custom, accent: BRAND_ACCENT })}
                className="text-xs text-faint transition-colors hover:text-body"
              >
                기본값
              </button>
            </div>
          </Row>

          <Section>알림</Section>

          <Row label="알림음" hint="알림이 울릴 때 소리로도 알려줍니다">
            <Toggle
              checked={settings.notifySound}
              onChange={(v) => settings.set('notifySound', v)}
            />
          </Row>

          <Section>새 메모 기본값</Section>

          <Row label="배경색">
            <div className="flex flex-wrap justify-end gap-1.5">
              {BACKGROUND_COLORS.map((c) => (
                <button
                  key={c.key}
                  title={c.name}
                  onClick={() => settings.setDefaultDesign({ color: c.key })}
                  className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 ${
                    settings.defaultDesign.color === c.key ? 'border-2 border-accent' : 'border-line-strong'
                  }`}
                  style={{ background: settings.theme === 'dark' ? c.dark : c.light }}
                />
              ))}
            </div>
          </Row>

          <Row label="폰트">
            <select
              value={settings.defaultDesign.font}
              onChange={(e) => settings.setDefaultDesign({ font: e.target.value })}
              className="ui-input !w-auto"
            >
              {FONTS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.name}
                </option>
              ))}
            </select>
          </Row>

          <Section>Windows</Section>

          <Row label="시작 시 자동 실행" hint={isElectron() ? undefined : '설치 버전 전용'}>
            <Toggle
              checked={settings.autoStart}
              disabled={!isElectron()}
              onChange={(v) => settings.set('autoStart', v)}
            />
          </Row>

          {isElectron() && (
            <Row label="빠른 캡처" hint="어디서든 새 메모 띄우기">
              <kbd className="rounded-sm border border-line bg-surface-2 px-2 py-1 text-xs text-muted">
                Ctrl + Shift + N
              </kbd>
            </Row>
          )}

          <Section>백업</Section>

          <Row label="내보내기 / 가져오기">
            <div className="flex gap-2">
              <Button onClick={exportJSON}>
                <Download size={ICON.md} /> 내보내기
              </Button>
              <Button onClick={() => fileRef.current?.click()}>
                <Upload size={ICON.md} /> 가져오기
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImport(file)
                  e.target.value = ''
                }}
              />
            </div>
          </Row>

          <p className="mt-4 rounded-md bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            메모 {memoCount}개가 이 컴퓨터에 저장되어 있습니다. 내용·디자인·필기는 각각 따로
            보관되므로 꾸미기를 바꿔도 글이 손상되지 않습니다.
          </p>
        </div>

        <div className="border-t border-line px-5 py-3 text-center text-xs text-faint">
          HYUNLAB Memo v1.1.18 · © HYUNLAB
        </div>
      </div>
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-faint first:pt-0">
      {children}
    </div>
  )
}

function Row({
  label, hint, children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-4 border-b border-line/60 py-2 last:border-0">
      <div className="min-w-0">
        <div className="text-base text-body">{label}</div>
        {hint && <div className="text-xs text-faint">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Segmented({
  options, value, onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-0.5 rounded-md bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`h-7 rounded-sm px-4 text-sm transition-all ${
            value === o.value ? 'bg-surface text-body shadow-sm' : 'text-muted hover:text-body'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({
  checked, onChange, disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-accent' : 'bg-line-strong'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
