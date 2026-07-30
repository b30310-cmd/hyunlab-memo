// ============================================================
// 알림음
//  - 별도 오디오 파일 없이 Web Audio API로 짧은 2음 벨소리를 만들어 재생합니다.
//  - Windows/웹 어디서나 동일하게 동작하고, 설정의 '알림음' 스위치로 켜고 끕니다.
// ============================================================

export function playAlertSound(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime

    ;[880, 1108].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + i * 0.14

      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.18)
    })

    setTimeout(() => ctx.close(), 500)
  } catch {
    // 자동재생 정책 등으로 소리를 낼 수 없는 환경에서는 조용히 무시합니다.
  }
}
