import { create } from 'zustand'
import { createId } from '@/lib/id'
import { electron } from '@/lib/electron'

// ============================================================
// 알림(리마인더) 발생 상태 — 화면에만 존재하는 일시적 상태입니다.
//  - 알림이 울리면 여기에 쌓이고, 사용자가 "확인"하거나 다시 알림을
//    설정할 때까지 화면(ReminderAlertOverlay)에 계속 남아 있습니다.
//  - 저장소에 남기지 않습니다 (앱을 새로고침하면 사라져도 되는 정보입니다).
//  - 알림 스케줄러는 메인 창 하나에서만 돌지만, 그 메모를 팝업으로 열어
//    둔 창이 있을 수 있으므로 다른 창에서 온 알림도 여기 함께 쌓입니다
//    (팝업 창은 이걸로 자기 메모에 맞는 알림이 있는지 확인해 표시합니다).
// ============================================================

export interface ReminderAlert {
  id: string
  memoId: string
  firedAt: number
}

interface AlertState {
  alerts: ReminderAlert[]
  push: (memoId: string) => void
  dismiss: (id: string) => void
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  push: (memoId) =>
    set((s) => ({ alerts: [...s.alerts, { id: createId(), memoId, firedAt: Date.now() }] })),
  dismiss: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
}))

if (typeof window !== 'undefined') {
  electron()?.onAlertFired((memoId) => useAlertStore.getState().push(memoId))
}
