// ============================================================
// 홈페이지용 스크린샷 자동 촬영 (웹 개발 서버 버전)
//
//   npm run shots:web
//
// capture-shots.mjs는 설치본(.exe)이 있어야 하지만, 이 스크립트는
// "npm run dev" 개발 서버만 떠 있으면 바로 찍을 수 있습니다.
// (실제 웹 UI를 그대로 찍는 것이라 화면은 설치본과 동일합니다)
//
// 촬영 목록
//   01 메인 화면 / 02 스크래치패드 / 03 글꼴 선택 / 04 체크리스트
//   05 그리기·주석 / 06 팝업 메모
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'website', 'screenshots')
const PORT = 9334
const DEV_URL = 'http://localhost:5173/'

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]
const CHROME = CHROME_CANDIDATES.find((p) => fs.existsSync(p))

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    let id = 0
    const pending = new Map()
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data)
      if (m.id && pending.has(m.id)) {
        const { resolve: r, reject: j } = pending.get(m.id)
        pending.delete(m.id)
        m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result)
      }
    }
    ws.onerror = reject
    ws.onopen = () =>
      resolve({
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const i = ++id
            pending.set(i, { resolve: res, reject: rej })
            ws.send(JSON.stringify({ id: i, method, params }))
          })
        },
        async eval(expression) {
          const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
          if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400))
          return r.result.value
        },
        async shot(name, width, height) {
          await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false })
          await wait(500)
          const { data } = await this.send('Page.captureScreenshot', { format: 'png' })
          const file = path.join(OUT, `${name}.png`)
          fs.writeFileSync(file, Buffer.from(data, 'base64'))
          const kb = (fs.statSync(file).size / 1024).toFixed(0)
          console.log(`  📸 ${name}.png  (${width}x${height} @2x, ${kb}KB)`)
          await this.send('Emulation.clearDeviceMetricsOverride')
        },
        close: () => ws.close(),
      })
  })
}

const targets = async () => (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()

const SEED = `(() => {
  localStorage.clear();
  localStorage.setItem('hyunlab-memo:schema', '2');
  const now = Date.now();
  const uid = () => crypto.randomUUID();
  const proj1 = uid(), proj2 = uid(), proj3 = uid();
  const projects = [
    { id: proj1, name: '마케팅 기획', color: '#FF8A5C', createdAt: now - 8000000 },
    { id: proj2, name: '개발 문서', color: '#3b82f6', createdAt: now - 7000000 },
    { id: proj3, name: '개인 메모', color: '#22c55e', createdAt: now - 6000000 },
  ];
  const m1 = uid(), m2 = uid(), m3 = uid(), m4 = uid(), m5 = uid();
  function memo(id, projectId, title, content, opts = {}) {
    return {
      id, projectId, title, content,
      label: opts.label ?? null, tags: opts.tags ?? [],
      pinned: opts.pinned ?? false, favorite: opts.favorite ?? false,
      reminder: opts.reminder ?? { enabled: false, datetime: '', repeat: 'none' },
      popup: { x: 200, y: 200, width: 340, height: 380, alwaysOnTop: true, locked: false },
      createdAt: now - (opts.age ?? 100000), updatedAt: now - (opts.age ?? 100000) + 1000,
    };
  }
  const memos = [
    memo(m1, proj1, '4분기 마케팅 캠페인 아이디어',
      '<p><b>목표:</b> 신규 사용자 20% 증가</p><p>1. SNS 숏폼 콘텐츠 주 3회 업로드</p><p>2. 인플루언서 협업 3건 진행</p><p>3. <span style="background-color:#fff59d">런칭 이벤트 — 12월 첫째 주</span></p>',
      { label: 'today', tags: ['캠페인', '아이디어'], pinned: true, age: 30000 }),
    memo(m2, proj1, '신규 랜딩페이지 체크리스트',
      '<div class="check-item done"><input type="checkbox" checked contenteditable="false" />&nbsp;메인 카피 초안 작성</div><div class="check-item"><input type="checkbox" contenteditable="false" />&nbsp;반응형 디자인 검토</div><div class="check-item"><input type="checkbox" contenteditable="false" />&nbsp;CTA 버튼 A/B 테스트</div>',
      { label: 'doing', tags: ['웹사이트'], age: 200000 }),
    memo(m3, proj2, 'API 설계 회의록',
      '<p><b>참석자:</b> 개발팀 전원</p><p>- 인증 방식은 JWT로 통일</p><p>- 알림 API는 다음 스프린트에서 진행</p><p>- 응답 형식 문서화 필요</p>',
      { label: 'urgent', tags: ['백엔드'], age: 400000 }),
    memo(m4, proj3, '올해 읽고 싶은 책 목록',
      '<ul><li>사피엔스</li><li>이기적 유전자</li><li>총, 균, 쇠</li></ul>',
      { favorite: true, tags: ['독서'], age: 600000 }),
    memo(m5, proj3, '가족 여행 준비물',
      '<div class="check-item done"><input type="checkbox" checked contenteditable="false" />&nbsp;여권 확인</div><div class="check-item done"><input type="checkbox" checked contenteditable="false" />&nbsp;숙소 예약 확인</div><div class="check-item"><input type="checkbox" contenteditable="false" />&nbsp;환전하기</div>',
      { label: 'done', tags: ['개인'], age: 800000 }),
  ];
  const designs = {
    [m1]: { color: 'cream', font: 'pretendard', fontSize: 16, skin: 'plain', border: 'none', shadow: 'soft', opacity: 1 },
    [m2]: { color: 'sky', font: 'pretendard', fontSize: 15, skin: 'plain', border: 'none', shadow: 'soft', opacity: 1 },
    [m3]: { color: 'white', font: 'suit', fontSize: 15, skin: 'lined', border: 'none', shadow: 'soft', opacity: 1 },
    [m4]: { color: 'lavender', font: 'nanummyeongjo', fontSize: 16, skin: 'plain', border: 'none', shadow: 'soft', opacity: 1 },
    [m5]: { color: 'yellow', font: 'pretendard', fontSize: 15, skin: 'plain', border: 'none', shadow: 'soft', opacity: 1 },
  };
  localStorage.setItem('hyunlab-memo:projects', JSON.stringify(projects));
  localStorage.setItem('hyunlab-memo:memos', JSON.stringify(memos));
  localStorage.setItem('hyunlab-memo:designs', JSON.stringify(designs));
  return { m1, m2, m3, m4, m5 };
})()`

console.log('\n📸 HYUNLAB Memo 웹 스크린샷 촬영\n')

if (!CHROME) {
  console.error('  ❌ Chrome 또는 Edge를 찾을 수 없습니다.\n')
  process.exit(1)
}

// 개발 서버가 이미 떠 있는지 확인
try {
  await fetch(DEV_URL)
} catch {
  console.error(`  ❌ 개발 서버(${DEV_URL})에 연결할 수 없습니다. 먼저 "npm run dev" 를 실행하세요.\n`)
  process.exit(1)
}

fs.mkdirSync(OUT, { recursive: true })
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hyunlab-shots-'))

const child = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1400,900',
    DEV_URL,
  ],
  { detached: true, stdio: 'ignore' },
)

let main = null
for (let i = 0; i < 30; i++) {
  await wait(500)
  try {
    const list = await targets()
    main = list.find((t) => t.type === 'page' && t.url.startsWith(DEV_URL))
    if (main) break
  } catch {}
}
if (!main) {
  console.error('  ❌ 브라우저에 연결하지 못했습니다.\n')
  process.exit(1)
}

const S = await connect(main.webSocketDebuggerUrl)
const ids = await S.eval(SEED)
await S.eval('location.reload()')
await wait(1500)

// ── 01. 메인 화면 (메모 선택) ──
await S.eval(`(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('4분기 마케팅'));
  btn?.click();
  return true;
})()`)
await wait(600)
await S.shot('01-main', 1360, 860)

// ── 02. 스크래치패드 ──
await S.eval(`(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.title?.includes('스크래치패드로 돌아가기'));
  btn?.click();
  return true;
})()`)
await wait(500)
await S.shot('02-scratchpad', 1360, 860)

// ── 03. 글꼴 선택 ──
await S.eval(`(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('4분기 마케팅'));
  btn?.click();
  return true;
})()`)
await wait(500)
await S.eval(`(() => {
  const modeBtn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '내용 편집');
  modeBtn?.click();
  return true;
})()`)
await wait(300)
await S.eval(`(() => {
  const editor = document.querySelector('.rich-editor');
  editor.focus();
  const range = document.createRange();
  range.selectNodeContents(editor.firstChild || editor);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  const fontBtn = [...document.querySelectorAll('button')].find(b => b.title === '선택한 글자의 글꼴');
  fontBtn?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  fontBtn?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  fontBtn?.click();
  return true;
})()`)
await wait(700)
await S.eval(`(() => {
  const chip = [...document.querySelectorAll('button')].find(b => b.textContent.includes('손글씨'));
  chip?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  chip?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  return document.body.textContent.includes('교보손글씨');
})()`)
await wait(500)
await S.shot('03-fonts', 1360, 860)

// 팝오버 닫기
await S.eval(`document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); true`)
await wait(300)

// ── 04. 체크리스트 ──
await S.eval(`(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('신규 랜딩페이지'));
  btn?.click();
  return true;
})()`)
await wait(600)
await S.shot('04-checklist', 1360, 860)

// ── 05. 그리기·주석 ──
await S.eval(`(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('API 설계'));
  btn?.click();
  return true;
})()`)
await wait(500)
await S.eval(`(() => {
  const drawBtn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '그리기·주석');
  drawBtn?.click();
  return true;
})()`)
await wait(500)
await S.eval(`(async () => {
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  const canvas = document.querySelector('main canvas');
  if (!canvas) return 'no canvas';
  canvas.setPointerCapture = () => {};
  const r = canvas.getBoundingClientRect();
  const pe = (type,x,y,buttons=1) => canvas.dispatchEvent(new PointerEvent(type,{
    clientX:r.left+x, clientY:r.top+y, buttons, bubbles:true, pointerId:1, isPrimary:true}));
  pe('pointerdown', 40, 50);
  for (let i=1;i<=16;i++) pe('pointermove', 40+i*12, 50+Math.sin(i/2.5)*4);
  pe('pointerup', 232, 50);
  await wait(200);
  const arrow = [...document.querySelectorAll('button')].find(b=>b.title==='화살표');
  arrow?.click(); await wait(150);
  pe('pointerdown', 320, 160);
  pe('pointermove', 180, 110);
  pe('pointerup', 180, 110);
  await wait(200);
  return 'drawn';
})()`)
await wait(600)
await S.shot('05-drawing', 1360, 860)

// ── 06. 팝업 메모 (새 탭으로 직접 라우팅) ──
const { targetId } = await S.send('Target.createTarget', { url: `${DEV_URL}#/popup/${ids.m2}` })
await wait(1200)
const popupTargets = await targets()
const popupTarget = popupTargets.find((t) => t.id === targetId || t.url.includes('#/popup/'))
if (popupTarget) {
  const P = await connect(popupTarget.webSocketDebuggerUrl)
  await wait(600)
  await P.shot('06-popup', 380, 460)
  P.close()
} else {
  console.log('  ⚠️  팝업 탭을 찾지 못해 건너뜁니다.')
}

S.close()
try {
  process.kill(-child.pid)
} catch {
  try { process.kill(child.pid) } catch {}
}

const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.png'))
console.log(`\n✅ ${files.length}장 저장 완료 → ${path.relative(ROOT, OUT)}\n`)
process.exit(0)
