// 고유 ID 생성 유틸
// crypto.randomUUID가 있으면 사용하고, 없으면 대체 로직을 씁니다.
export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}
