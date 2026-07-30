// ============================================================
// PWA / 웹 아이콘 만들기
//
//   npm run build:pwa-icons
//
// public/icon.svg (마스터, HYUNLAB 브랜드 심볼)에서
//   · icon-192.png / icon-512.png     — PWA 앱 아이콘
//   · icon-maskable.png               — 안드로이드 등 (잘려도 되는 여백 포함)
//   · favicon-16.png / favicon-32.png — 브라우저 탭
//   · apple-touch-icon.png            — iOS 홈화면 (PWA 설치 시)
// 을 만듭니다.
//
// ⚠️ Windows 설치 파일(exe)의 아이콘(public/icon.ico)은 건드리지 않습니다.
//    Windows 앱은 기존 그대로 유지하고, 이건 웹/PWA 전용 아이콘입니다.
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PUB = path.join(ROOT, 'public')

const MASTER = path.join(PUB, 'icon.svg') // 큰 크기용 (줄이 보이는 버전)
const SMALL = path.join(PUB, 'icon-small.svg') // 작은 크기용 (단순화 버전)
const MASKABLE = path.join(PUB, 'icon-maskable.svg')

const ok = (m) => console.log(`  ✅ ${m}`)

async function png(svgPath, size, outPath) {
  const buf = await sharp(svgPath, { density: 384 })
    .resize(size, size, { fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toBuffer()
  fs.writeFileSync(outPath, buf)
}

console.log('\n🎨 HYUNLAB Memo — PWA 아이콘 만들기\n')

for (const f of [MASTER, SMALL, MASKABLE]) {
  if (!fs.existsSync(f)) {
    console.error(`  ❌ 원본이 없습니다: ${path.relative(ROOT, f)}\n`)
    process.exit(1)
  }
}

await png(MASTER, 512, path.join(PUB, 'icon-512.png'))
ok('icon-512.png       PWA 앱 아이콘')

await png(MASTER, 192, path.join(PUB, 'icon-192.png'))
ok('icon-192.png       PWA 앱 아이콘')

await png(MASTER, 180, path.join(PUB, 'apple-touch-icon.png'))
ok('apple-touch-icon.png   iOS 홈화면 (PWA 설치)')

await png(MASKABLE, 512, path.join(PUB, 'icon-maskable.png'))
ok('icon-maskable.png  안드로이드 (모양 잘림 대응)')

await png(SMALL, 32, path.join(PUB, 'favicon-32.png'))
await png(SMALL, 16, path.join(PUB, 'favicon-16.png'))
ok('favicon-16/32.png  브라우저 탭')

console.log('\n완료. icon.svg를 고친 뒤 이 명령을 다시 실행하면 전부 갱신됩니다.')
console.log('(Windows exe 아이콘 public/icon.ico는 이 스크립트가 건드리지 않습니다)\n')
