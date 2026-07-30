import { Plus, Search, ArrowUpDown, LayoutGrid, List, Settings, Moon, Sun, ChevronDown, X, Check, MonitorDown } from 'lucide-react'
import { useMemoStore, DEFAULT_POPUP } from '@/store/useMemoStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useUiStore } from '@/store/useUiStore'
import { useScratchStore } from '@/store/useScratchStore'
import { Popover } from '@/components/common/Popover'
import { Button, IconButton, MenuItem, MenuLabel, ICON } from '@/components/ui/Button'
import type { SortType } from '@/types'
import { TEMPLATES, applyTemplate } from '@/lib/templates'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { openScratchPopup } from '@/lib/electron'

// ============================================================
// 상단 툴바
//
//  왼쪽  : 로고 + [새 메모] (가장 자주 쓰는 동작)
//  가운데: 검색
//  오른쪽: 정렬 / 보기 / 테마 / 설정  (아이콘 버튼 통일)
// ============================================================

const SORT_LABELS: Record<SortType, string> = {
  updated: '수정한 날짜순',
  created: '만든 날짜순',
  title: '제목순',
}

/** 팝업이 겹치지 않도록 새로 열 때마다 위치를 살짝 어긋나게 합니다. */
function cascadedPopupState() {
  const jitter = Math.floor(Math.random() * 80) - 40
  return { ...DEFAULT_POPUP, x: DEFAULT_POPUP.x + jitter, y: DEFAULT_POPUP.y + jitter, opacity: 1 }
}

export function Toolbar() {
  const select = useMemoStore((s) => s.select)
  const updateDesign = useMemoStore((s) => s.updateDesign)
  const createDraft = useScratchStore((s) => s.createDraft)
  const scratchUpdate = useScratchStore((s) => s.update)
  const settings = useSettingsStore()
  const { query, setQuery, setSettingsOpen } = useUiStore()
  const { canInstall, promptInstall } = useInstallPrompt()

  // '새 메모'는 이제 메인 화면이 아니라 독립된 팝업 창(스크래치 초안)으로 엽니다.
  // 여러 개를 동시에 띄울 수 있고, 닫아도 자동 저장되어 있다가 나중에 저장할 수 있습니다.
  const createBlank = () => {
    const draftId = createDraft()
    updateDesign(draftId, settings.defaultDesign)
    openScratchPopup(draftId, cascadedPopupState())
  }

  const createFromTemplate = (key: string) => {
    const t = TEMPLATES.find((x) => x.key === key)!
    const draftId = createDraft()
    updateDesign(draftId, { ...settings.defaultDesign, ...t.design })
    const filled = applyTemplate(t)
    scratchUpdate(draftId, { title: filled.title, content: filled.content, tags: t.tags ?? [] })
    openScratchPopup(draftId, cascadedPopupState())
  }

  return (
    <header className="drag-region flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      {/* 로고 — 누르면 메인 스크래치패드(임시 작업 공간)로 돌아갑니다 */}
      <button
        onClick={() => select(null)}
        title="스크래치패드로 돌아가기"
        className="no-drag flex select-none items-center gap-2"
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-md font-bold text-white"
          style={{ background: 'var(--accent)' }}
        >
          H
        </div>
        <span className="hidden text-md font-semibold tracking-tight lg:block">HYUNLAB Memo</span>
      </button>

      {/* 새 메모 + 템플릿 */}
      <div className="no-drag flex items-center">
        <Button
          variant="primary"
          onClick={createBlank}
          className="!rounded-r-none !pr-2.5"
        >
          <Plus size={ICON.md} />
          새 메모
        </Button>
        <Popover
          align="left"
          trigger={() => (
            <button
              title="템플릿으로 만들기"
              aria-label="템플릿으로 만들기"
              className="ui-btn !h-[var(--h-md)] !rounded-l-none !px-1.5 border-l border-white/20 text-white"
              style={{ background: 'var(--accent)' }}
            >
              <ChevronDown size={ICON.sm} />
            </button>
          )}
        >
          {(close) => (
            <div className="w-52">
              <MenuLabel>템플릿으로 시작</MenuLabel>
              {TEMPLATES.map((t) => (
                <MenuItem
                  key={t.key}
                  icon={<span className="text-md">{t.icon}</span>}
                  onClick={() => {
                    createFromTemplate(t.key)
                    close()
                  }}
                >
                  {t.name}
                </MenuItem>
              ))}
            </div>
          )}
        </Popover>
      </div>

      {/* 검색 */}
      <div className="no-drag relative max-w-sm flex-1">
        <Search
          size={ICON.md}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색"
          className="ui-input !pl-9 !pr-8"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            title="검색어 지우기"
            className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-faint hover:bg-[var(--hover)] hover:text-body"
          >
            <X size={ICON.xs} />
          </button>
        )}
      </div>

      <div className="flex-1" />

      {/* 오른쪽 아이콘 묶음 — 간격 통일 */}
      <div className="no-drag flex items-center gap-1">
        <Popover
          align="right"
          trigger={() => (
            <IconButton title="정렬">
              <ArrowUpDown size={ICON.lg} />
            </IconButton>
          )}
        >
          {(close) => (
            <div className="w-44">
              <MenuLabel>정렬 기준</MenuLabel>
              {(Object.keys(SORT_LABELS) as SortType[]).map((key) => (
                <MenuItem
                  key={key}
                  trailing={settings.sort === key ? <Check size={ICON.sm} className="text-accent" /> : undefined}
                  onClick={() => {
                    settings.set('sort', key)
                    close()
                  }}
                >
                  {SORT_LABELS[key]}
                </MenuItem>
              ))}
            </div>
          )}
        </Popover>

        <IconButton
          title={settings.view === 'list' ? '카드 보기' : '목록 보기'}
          onClick={() => settings.set('view', settings.view === 'list' ? 'grid' : 'list')}
        >
          {settings.view === 'list' ? <LayoutGrid size={ICON.lg} /> : <List size={ICON.lg} />}
        </IconButton>

        <IconButton
          title={settings.theme === 'light' ? '다크 모드' : '라이트 모드'}
          onClick={() => settings.set('theme', settings.theme === 'light' ? 'dark' : 'light')}
        >
          {settings.theme === 'light' ? <Moon size={ICON.lg} /> : <Sun size={ICON.lg} />}
        </IconButton>

        {/* 앱으로 설치 (PWA) — 설치 가능할 때만 보입니다 */}
        {canInstall && (
          <Button
            variant="secondary"
            className="no-drag"
            onClick={promptInstall}
            title="작업표시줄에 고정해 앱처럼 사용"
          >
            <MonitorDown size={ICON.md} />
            앱으로 설치
          </Button>
        )}

        <IconButton title="설정" onClick={() => setSettingsOpen(true)}>
          <Settings size={ICON.lg} />
        </IconButton>
      </div>
    </header>
  )
}
