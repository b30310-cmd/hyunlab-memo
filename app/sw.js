// ============================================================
// 서비스 워커 (PWA 오프라인 지원 — 기본 수준)
//  - 앱 파일을 캐시해 인터넷 없이도 실행되게 합니다.
//  - 메모 데이터는 localStorage에 있으므로 원래 오프라인에서 동작합니다.
//
// 두 가지 요청을 구분해서 처리합니다.
//   ① 페이지 이동(주소를 열 때)   → 네트워크 우선, 실패하면 index.html
//      (항상 최신 화면을 보여주되, 오프라인일 땐 SPA 껍데기라도 띄웁니다)
//   ② 그 외 자산(JS·CSS·이미지)  → 캐시 우선, 없으면 네트워크
//      (한 번 받은 파일은 그대로 재사용 — 이미지 요청에 엉뚱하게
//       index.html이 대신 오는 사고를 막습니다)
// ============================================================

// 앱을 새로 배포할 때마다 숫자를 올리면 이전 캐시가 자동으로 정리됩니다.
const CACHE_NAME = 'hyunlab-memo-v3'

// 설치 시: 앱 껍데기를 미리 받아둡니다.
// JS/CSS 번들은 빌드마다 파일명이 바뀌어 미리 알 수 없으므로,
// 실제로 방문했을 때 ②번 전략에 의해 자동으로 캐시됩니다.
const APP_SHELL = ['./', './index.html', './manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  // ① 페이지 이동 요청 (주소창 입력, 새로고침, 링크 클릭 등)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html')),
    )
    return
  }

  // ② 그 외 정적 자산 — 캐시에 있으면 바로 반환하고, 동시에 새 버전을 받아 갱신합니다
  //    (stale-while-revalidate: 빠르게 보여주고 조용히 최신화)
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()))
          return res
        })
        .catch(() => cached) // 오프라인이면 네트워크 실패 → 캐시로 대체
      return cached || network
    }),
  )
})
