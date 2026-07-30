// ============================================================
// 배포용 사이트 폴더 만들기
//
//   npm run build:site
//
// 실행하면 website/dist-site/ 폴더가 만들어집니다.
// 그 폴더 '안에 있는 것들'을 홈페이지 서버에 통째로 올리면 끝입니다.
//
//   website/dist-site/
//     ├─ index.html       소개 페이지
//     ├─ icon.svg/png     아이콘
//     ├─ app/             웹 버전 (설치 없이 바로 사용)
//     └─ download/        Windows 설치 파일(.exe)
//
// 링크가 전부 상대경로(./app/, ./download/)라서
// 어떤 주소에 올려도 그대로 동작합니다.
//   예) https://내사이트.com/memo/  →  그 안에 올리면 됨
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const SITE_SRC = path.join(ROOT, 'website')
const OUT = path.join(SITE_SRC, 'dist-site')
const APP_BUILD = path.join(ROOT, 'dist')
const PUBLIC = path.join(ROOT, 'public')

/** package.json에서 버전을 읽어 설치 파일 이름을 만듭니다. */
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const VERSION = pkg.version
const EXE_NAME = `HYUNLAB-Memo-Setup-${VERSION}.exe`
const EXE_PATH = path.join(ROOT, 'release', VERSION, EXE_NAME)

/** 콘솔에 보기 좋게 출력 */
const ok = (msg) => console.log(`  ✅ ${msg}`)
const warn = (msg) => console.log(`  ⚠️  ${msg}`)
const fail = (msg) => {
  console.error(`  ❌ ${msg}`)
  process.exitCode = 1
}

/** 폴더를 통째로 복사 */
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name)
    const dst = path.join(to, entry.name)
    if (entry.isDirectory()) copyDir(src, dst)
    else fs.copyFileSync(src, dst)
  }
}

/** 폴더 안 파일 크기 합계(MB) */
function sizeMB(target) {
  let total = 0
  const walk = (p) => {
    const st = fs.statSync(p)
    if (st.isDirectory()) fs.readdirSync(p).forEach((f) => walk(path.join(p, f)))
    else total += st.size
  }
  walk(target)
  return (total / 1024 / 1024).toFixed(1)
}

console.log('\n📦 HYUNLAB Memo 배포용 사이트 만들기\n')

// 0) 이전 결과물 정리
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

// 1) 소개 페이지
fs.copyFileSync(path.join(SITE_SRC, 'index.html'), path.join(OUT, 'index.html'))
ok('index.html (소개 페이지)')

// 2) 아이콘
for (const f of ['icon.svg', 'icon.png']) {
  const src = path.join(PUBLIC, f)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(OUT, f))
    ok(f)
  } else {
    warn(`${f} 없음 — 건너뜀`)
  }
}

// 3) 스크린샷
const SHOTS = path.join(SITE_SRC, 'screenshots')
if (fs.existsSync(SHOTS) && fs.readdirSync(SHOTS).some((f) => f.endsWith('.png'))) {
  copyDir(SHOTS, path.join(OUT, 'screenshots'))
  const n = fs.readdirSync(path.join(OUT, 'screenshots')).length
  ok(`screenshots/ (${n}장, ${sizeMB(path.join(OUT, 'screenshots'))}MB)`)
} else {
  fail('스크린샷이 없습니다. "npm run shots" 를 먼저 실행하세요.')
}

// 4) 웹 버전
if (fs.existsSync(path.join(APP_BUILD, 'index.html'))) {
  copyDir(APP_BUILD, path.join(OUT, 'app'))
  ok(`app/ (웹 버전, ${sizeMB(path.join(OUT, 'app'))}MB)`)
} else {
  fail('웹 버전이 없습니다. 먼저 "npm run build:web" 을 실행하세요.')
}

// 5) Windows 설치 파일
if (fs.existsSync(EXE_PATH)) {
  fs.mkdirSync(path.join(OUT, 'download'), { recursive: true })
  fs.copyFileSync(EXE_PATH, path.join(OUT, 'download', EXE_NAME))
  ok(`download/${EXE_NAME} (${sizeMB(path.join(OUT, 'download'))}MB)`)
} else {
  fail(`설치 파일이 없습니다: ${path.relative(ROOT, EXE_PATH)}\n     먼저 "npm run build:win" 을 실행하세요.`)
}

// 6) 링크가 실제 파일을 가리키는지 검사 (깨진 링크 방지)
const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8')
const links = [...html.matchAll(/(?:href|src)="\.\/([^"#]+)"/g)].map((m) => m[1])
const broken = [...new Set(links)].filter((rel) => !fs.existsSync(path.join(OUT, rel)))

console.log('')
if (broken.length) {
  fail(`페이지가 가리키는 파일이 없습니다: ${broken.join(', ')}`)
} else {
  ok(`링크 ${new Set(links).size}개 모두 정상`)
}

if (process.exitCode) {
  console.log('\n❌ 완료하지 못했습니다. 위 메시지를 확인하세요.\n')
} else {
  console.log(`\n✅ 완료!  총 ${sizeMB(OUT)}MB\n`)
  console.log(`   폴더: ${path.relative(process.cwd(), OUT)}`)
  console.log('   이 폴더 "안의 파일들"을 홈페이지에 업로드하세요.')
  console.log('   예) https://내사이트.com/memo/  →  그 아래에 올리면 됩니다.\n')
}
