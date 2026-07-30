// ============================================================
// GitHub Pages로 배포하기
//
//   npm run deploy
//
// 하는 일
//   1. 저장소가 없으면 새로 만듭니다
//   2. 소개 페이지 + 웹 버전 + 스크린샷을 'gh-pages' 브랜치에 올립니다
//      (main 브랜치는 소스 코드 전용입니다 — 여기서는 절대 건드리지 않습니다)
//   3. GitHub Pages를 gh-pages 브랜치로 켭니다
//   4. 설치 파일(.exe)은 'Release'에 올립니다
//      → 80MB짜리를 저장소에 넣으면 무거워지고, 큰 파일은 Release가 정석입니다
//   5. 다운로드 링크를 releases/latest/download/... 로 바꿔 줍니다
//      → 설치 파일 이름에 버전을 넣지 않으므로, 새 버전을 릴리스해도
//        이 링크는 코드 수정 없이 항상 최신 파일을 가리킵니다
//   6. website/CNAME 이 있으면 그 도메인을 그대로 유지합니다
//
// 토큰은 아래 순서로 찾습니다 (대화창에 붙여넣지 않아도 되도록)
//   ① 환경변수 GH_TOKEN
//   ② 프로젝트 상위 폴더의 .gh-token 파일
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SITE = path.join(ROOT, 'website', 'dist-site')

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const VERSION = pkg.version
const REPO_NAME = 'hyunlab-memo'

/**
 * 내 도메인 연결
 *
 *   npm run deploy -- --domain=memo.hyunlab.com
 *
 * 인자를 주지 않으면 website/CNAME 파일에 적힌 도메인을 그대로 씁니다.
 * 둘 다 없으면 기본 주소(아이디.github.io/hyunlab-memo)를 씁니다.
 *
 * ※ GitHub Pages는 '서브도메인'만 연결됩니다.
 *    memo.hyunlab.com  ← 가능
 *    hyunlab.com/memo  ← 불가 (이건 서버에 직접 올려야 합니다)
 */
const cnamePath = path.join(ROOT, 'website', 'CNAME')
const CUSTOM_DOMAIN =
  process.argv.find((a) => a.startsWith('--domain='))?.split('=')[1]?.trim() ||
  (fs.existsSync(cnamePath) ? fs.readFileSync(cnamePath, 'utf8').trim() : '')

// 설치 파일 이름은 버전을 포함하지 않습니다 (release/${VERSION}/ 폴더에서 찾긴 하지만,
// 파일명 자체를 고정해야 releases/latest/download/ 링크가 항상 최신 버전을 가리킵니다)
const EXE_NAME = 'HYUNLAB-Memo-Setup.exe'
const EXE_PATH = path.join(ROOT, 'release', VERSION, EXE_NAME)
const GH_PAGES_BRANCH = 'gh-pages'

const ok = (m) => console.log(`  ✅ ${m}`)
const info = (m) => console.log(`  ·  ${m}`)
const die = (m) => {
  console.error(`\n  ❌ ${m}\n`)
  process.exit(1)
}

// ---------- 토큰 찾기 ----------
function findToken() {
  if (process.env.GH_TOKEN?.trim()) return { token: process.env.GH_TOKEN.trim(), from: '환경변수 GH_TOKEN' }
  const candidates = [
    path.join(ROOT, '..', '.gh-token'),
    path.join(ROOT, '.gh-token'),
    path.join(os.homedir(), '.gh-token'),
  ]
  for (const f of candidates) {
    if (fs.existsSync(f)) {
      const t = fs.readFileSync(f, 'utf8').trim()
      if (t) return { token: t, from: f }
    }
  }
  return null
}

const found = findToken()
if (!found) {
  die(
    '토큰을 찾을 수 없습니다.\n\n' +
      '     https://github.com/settings/tokens 에서 토큰을 만든 뒤\n' +
      `     아래 파일에 붙여넣고 저장해 주세요 (한 줄만):\n\n` +
      `       ${path.resolve(ROOT, '..', '.gh-token')}\n\n` +
      '     classic 토큰이면 repo 권한 하나로 충분합니다.\n' +
      '     fine-grained 토큰이면 이 저장소에 대해 Contents/Pages/Actions를\n' +
      '     모두 "Read and write"로 지정해야 합니다.',
  )
}
const TOKEN = found.token

// ---------- GitHub API 도우미 ----------
const api = async (method, url, body, extraHeaders = {}) => {
  const res = await fetch(url.startsWith('http') ? url : `https://api.github.com${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'hyunlab-memo-deploy',
      ...(body && !extraHeaders['Content-Type'] ? { 'Content-Type': 'application/json' } : {}),
      ...extraHeaders,
    },
    body: body ? (Buffer.isBuffer(body) ? body : JSON.stringify(body)) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {}
  return { status: res.status, ok: res.ok, json, text }
}

console.log('\n🚀 HYUNLAB Memo — GitHub 배포\n')

// ---------- 0. 준비물 확인 ----------
if (!fs.existsSync(path.join(SITE, 'index.html'))) {
  die('배포할 사이트가 없습니다. "npm run build:site" 를 먼저 실행하세요.')
}
if (!fs.existsSync(EXE_PATH)) {
  die(`설치 파일이 없습니다: ${path.relative(ROOT, EXE_PATH)}\n     "npm run build:win" 을 먼저 실행하세요.`)
}
info(`토큰 위치: ${found.from}`)

// ---------- 1. 로그인 확인 ----------
const me = await api('GET', '/user')
if (!me.ok) die(`토큰이 올바르지 않습니다 (HTTP ${me.status}). 권한에 'repo' 가 포함됐는지 확인해 주세요.`)
const OWNER = me.json.login
ok(`GitHub 로그인: ${OWNER}`)

// ---------- 2. 저장소 준비 ----------
let repo = await api('GET', `/repos/${OWNER}/${REPO_NAME}`)
if (repo.status === 404) {
  const created = await api('POST', '/user/repos', {
    name: REPO_NAME,
    description: 'HYUNLAB Memo — 필요한 순간 바로 꺼내 쓰는 메모',
    homepage: `https://${OWNER}.github.io/${REPO_NAME}/`,
    private: false,
    has_issues: true,
    has_wiki: false,
  })
  if (!created.ok) die(`저장소 생성 실패 (HTTP ${created.status}): ${created.json?.message ?? ''}`)
  ok(`저장소 새로 만듦: ${OWNER}/${REPO_NAME}`)
  repo = created
} else if (repo.ok) {
  ok(`저장소 사용: ${OWNER}/${REPO_NAME}`)
} else {
  die(`저장소 확인 실패 (HTTP ${repo.status})`)
}

const PAGES_URL = CUSTOM_DOMAIN
  ? `https://${CUSTOM_DOMAIN}/`
  : `https://${OWNER}.github.io/${REPO_NAME}/`
// latest/download/ 는 버전과 무관하게 항상 가장 최근 Release의 같은 이름 첨부파일로 리다이렉트됩니다.
const RELEASE_EXE_URL = `https://github.com/${OWNER}/${REPO_NAME}/releases/latest/download/${EXE_NAME}`

// ---------- 3. 올릴 파일 준비 ----------
// 설치 파일은 Release로 가므로 download/ 폴더는 제외합니다.
const STAGE = path.join(ROOT, 'website', '.deploy-stage')
fs.rmSync(STAGE, { recursive: true, force: true })
fs.mkdirSync(STAGE, { recursive: true })

const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true })
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name === 'download') continue // 설치 파일 제외
    const s = path.join(from, e.name)
    const d = path.join(to, e.name)
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d)
  }
}
copyDir(SITE, STAGE)

// 다운로드 링크를 Release 주소로 교체
const indexPath = path.join(STAGE, 'index.html')
let html = fs.readFileSync(indexPath, 'utf8')
html = html.replaceAll(`./download/${EXE_NAME}`, RELEASE_EXE_URL)
fs.writeFileSync(indexPath, html)
ok('다운로드 링크를 releases/latest/download/ 주소로 변경')

// CNAME/.nojekyll은 이미 build-site.mjs가 dist-site에 포함시켜 뒀습니다.
// (여기서는 --domain= 로 다른 도메인을 지정했을 때만 덮어씁니다)
if (CUSTOM_DOMAIN) {
  fs.writeFileSync(path.join(STAGE, 'CNAME'), CUSTOM_DOMAIN + '\n')
  ok(`도메인: ${CUSTOM_DOMAIN}`)
}
if (!fs.existsSync(path.join(STAGE, '.nojekyll'))) {
  fs.writeFileSync(path.join(STAGE, '.nojekyll'), '')
}

// ---------- 4. git push (gh-pages 브랜치로만 — main은 절대 건드리지 않습니다) ----------
const git = (args, cwd = STAGE) =>
  execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()

git(['init', '-q'])
git(['config', 'user.name', 'HYUNLAB Deploy'])
git(['config', 'user.email', `${OWNER}@users.noreply.github.com`])
git(['checkout', '-q', '-B', GH_PAGES_BRANCH])
git(['add', '-A'])
git(['commit', '-q', '-m', `HYUNLAB Memo v${VERSION} 사이트 배포`])

// 토큰이 화면이나 로그에 남지 않도록 원격 주소에만 잠깐 사용합니다.
const remote = `https://x-access-token:${TOKEN}@github.com/${OWNER}/${REPO_NAME}.git`
try {
  git(['remote', 'add', 'origin', remote])
  git(['push', '-q', '--force', 'origin', `HEAD:${GH_PAGES_BRANCH}`])
  ok(`사이트 파일 업로드 완료 (${GH_PAGES_BRANCH} 브랜치)`)
} catch (e) {
  const msg = String(e.stderr ?? e.message).replaceAll(TOKEN, '***')
  die(`업로드 실패:\n     ${msg}`)
} finally {
  try {
    git(['remote', 'remove', 'origin'])
  } catch {}
}

// ---------- 5. GitHub Pages 켜기 (gh-pages 브랜치를 서빙) ----------
const pagesBody = { source: { branch: GH_PAGES_BRANCH, path: '/' } }
let pages = await api('POST', `/repos/${OWNER}/${REPO_NAME}/pages`, pagesBody)
if (pages.status === 409 || pages.status === 422) {
  pages = await api('PUT', `/repos/${OWNER}/${REPO_NAME}/pages`, pagesBody)
  ok('GitHub Pages 설정 갱신')
} else if (pages.ok) {
  ok('GitHub Pages 켜짐')
} else {
  info(`Pages 설정 실패 (HTTP ${pages.status}) — 저장소 Settings → Pages 에서 직접 켜주세요`)
}

// 내 도메인 + HTTPS 적용
if (CUSTOM_DOMAIN) {
  const cd = await api('PUT', `/repos/${OWNER}/${REPO_NAME}/pages`, {
    cname: CUSTOM_DOMAIN,
    https_enforced: true,
  })
  if (cd.ok || cd.status === 204) {
    ok(`도메인 연결 요청 완료 (인증서 발급에 몇 분 걸립니다)`)
  } else {
    info(`도메인 자동 설정 실패 (HTTP ${cd.status}) — DNS가 아직 연결되지 않았을 수 있습니다`)
  }
}

// ---------- 6. Release 만들고 설치 파일 올리기 ----------
const tag = `v${VERSION}`
let release = await api('GET', `/repos/${OWNER}/${REPO_NAME}/releases/tags/${tag}`)
if (release.status === 404) {
  release = await api('POST', `/repos/${OWNER}/${REPO_NAME}/releases`, {
    tag_name: tag,
    name: `HYUNLAB Memo ${tag}`,
    body:
      `## HYUNLAB Memo ${tag}\n\n` +
      `아래 **${EXE_NAME}** 를 내려받아 설치하세요. (Windows 10/11 64bit)\n\n` +
      `### ⚠️ 설치 시 파란 경고 화면이 나옵니다\n` +
      `\`추가 정보\` → \`실행\` 을 누르면 설치됩니다.\n` +
      `코드 서명 인증서가 없어 표시되는 안내이며, 관리자 권한은 필요하지 않습니다.\n\n` +
      `자세한 내용은 [소개 페이지](${PAGES_URL})를 참고하세요.`,
    draft: false,
    prerelease: false,
  })
  if (!release.ok) die(`Release 생성 실패 (HTTP ${release.status}): ${release.json?.message ?? ''}`)
  ok(`Release 생성: ${tag}`)
} else {
  ok(`기존 Release 사용: ${tag}`)
}

// 같은 이름의 파일이 이미 있으면 지우고 다시 올립니다.
const existing = (release.json.assets ?? []).find((a) => a.name === EXE_NAME)
if (existing) {
  await api('DELETE', `/repos/${OWNER}/${REPO_NAME}/releases/assets/${existing.id}`)
  info('기존 설치 파일 삭제 후 재업로드')
}

const exeBuf = fs.readFileSync(EXE_PATH)
info(`설치 파일 업로드 중... (${(exeBuf.length / 1024 / 1024).toFixed(1)}MB, 잠시 걸립니다)`)
const uploadUrl = release.json.upload_url.replace(/\{.*\}$/, '') + `?name=${encodeURIComponent(EXE_NAME)}`
const up = await api('POST', uploadUrl, exeBuf, {
  'Content-Type': 'application/octet-stream',
  'Content-Length': String(exeBuf.length),
})
if (!up.ok) die(`설치 파일 업로드 실패 (HTTP ${up.status}): ${up.json?.message ?? up.text.slice(0, 200)}`)
ok('설치 파일 업로드 완료')

// ---------- 정리 ----------
fs.rmSync(STAGE, { recursive: true, force: true })

console.log(`
✅ 배포 완료!

   소개 페이지 : ${PAGES_URL}
   웹 버전     : ${PAGES_URL}app/
   다운로드    : ${RELEASE_EXE_URL}

   ※ 페이지가 처음 만들어질 때는 1~2분 정도 걸릴 수 있습니다.
`)
