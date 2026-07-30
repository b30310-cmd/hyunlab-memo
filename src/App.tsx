import { useEffect } from 'react'
import { Toolbar } from '@/components/Toolbar/Toolbar'
import { Sidebar } from '@/components/Sidebar/Sidebar'
import { Editor } from '@/components/Editor/Editor'
import { ScratchPad } from '@/components/ScratchPad/ScratchPad'
import { SettingsModal } from '@/components/Settings/SettingsModal'
import { ReminderAlertOverlay } from '@/components/Notif/ReminderAlertOverlay'
import { useMemoStore } from '@/store/useMemoStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useReminders } from '@/hooks/useReminders'
import { electron, openPopupMemo } from '@/lib/electron'

// ============================================================
// 메인 화면
//  상단 Toolbar / 좌측 Sidebar(목록) / 우측 Editor(선택 메모) 또는 ScratchPad
//
//  앱을 열면 항상 스크래치패드(임시 작업 공간)가 먼저 보입니다.
//  사이드바에서 메모를 고르면 그 메모의 Editor로 바뀌고,
//  '새로 쓰기'를 누르면 다시 스크래치패드로 돌아옵니다.
// ============================================================

export default function App() {
  const memos = useMemoStore((s) => s.memos)
  const selectedId = useMemoStore((s) => s.selectedId)
  const addMemo = useMemoStore((s) => s.addMemo)
  const defaultDesign = useSettingsStore((s) => s.defaultDesign)

  useReminders()

  // 빠른 캡처 (Ctrl+Shift+N) — Windows 설치 버전 전용
  useEffect(() => {
    const api = electron()
    if (!api) return
    return api.onQuickCapture((bounds) => {
      const memo = addMemo(null, defaultDesign)
      openPopupMemo(memo.id, { ...memo.popup, ...bounds })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultDesign])

  const selected = memos.find((m) => m.id === selectedId)

  return (
    <div className="flex h-full flex-col">
      <Toolbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-hidden bg-bg">
          {selected ? <Editor memo={selected} /> : <ScratchPad />}
        </main>
      </div>

      <SettingsModal />
      <ReminderAlertOverlay />
    </div>
  )
}
