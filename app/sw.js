// ============================================================
// 서비스 워커 (PWA 오프라인 지원)
//  - 앱 파일을 캐시해 인터넷 없이도 실행되게 합니다.
//  - 메모 데이터는 localStorage에 있으므로 원래 오프라인에서 동작합니다.
// ============================================================

const CACHE_NAME = 'hyunlab-memo-v1'

// 설치 시: 앱 셸을 미리 캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['./', './index.html'])),
  )
  self.skipWaiting()
})

// 활성화 시: 오래된 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  )
  self.clients.claim()
})

// 요청 처리: 네트워크 우선, 실패하면 캐시 (오프라인)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        return response
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match('./index.html'))),
  )
})
