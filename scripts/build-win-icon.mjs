// ============================================================
// Windows 앱 아이콘(.ico) 만들기
//
//   npm run build:win-icon
//
// public/icon.svg (마스터, HYUNLAB 브랜드 심볼)에서 여러 크기의 PNG를
// 뽑아 하나의 public/icon.ico로 합칩니다.
//
// electron-builder(설치 파일 아이콘), electron/main.ts(창·트레이 아이콘)가
// 모두 이 파일을 씁니다. icon.svg를 고친 뒤에는 이 명령도 다시 실행해야
// Windows 앱 아이콘에 반영됩니다(build-pwa-icons.mjs는 웹/PWA 아이콘만
// 갱신하고 이 파일은 건드리지 않습니다).
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PUB = path.join(ROOT, 'public')
const MASTER = path.join(PUB, 'icon.svg')

const SIZES = [16, 24, 32, 48, 64, 128, 256]

console.log('\n🎨 HYUNLAB Memo — Windows 아이콘(.ico) 만들기\n')

if (!fs.existsSync(MASTER)) {
  console.error(`  ❌ 원본이 없습니다: ${path.relative(ROOT, MASTER)}\n`)
  process.exit(1)
}

const pngBuffers = await Promise.all(
  SIZES.map((size) =>
    sharp(MASTER, { density: 384 }).resize(size, size, { fit: 'contain' }).png().toBuffer(),
  ),
)

const icoBuffer = await pngToIco(pngBuffers)
fs.writeFileSync(path.join(PUB, 'icon.ico'), icoBuffer)
console.log(`  ✅ icon.ico          (${SIZES.join('/')} 포함)`)

// og:image 등 일반 PNG 아이콘(정사각형 512)도 같이 갱신합니다.
const iconPng = await sharp(MASTER, { density: 384 }).resize(512, 512, { fit: 'contain' }).png().toBuffer()
fs.writeFileSync(path.join(PUB, 'icon.png'), iconPng)
console.log('  ✅ icon.png          (512x512)')

console.log('\n완료.\n')
