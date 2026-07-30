// ============================================================
// 홈페이지용 스크린샷 자동 촬영
//
//   npm run shots
//
// 실제로 설치본 앱을 띄운 뒤 화면을 찍어 website/screenshots/ 에 저장합니다.
// (그림으로 흉내 낸 목업이 아니라 진짜 앱 화면입니다)
//
// 촬영 목록
//   01 메인 화면 / 02 체크리스트 / 03 꾸미기 / 04 그리기
//   05 스킨 모음 / 06 팝업 메모
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'website', 'screenshots')
const PORT = 9333

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const APP_EXE = path.join(ROOT, 'release', pkg.version, 'win-unpacked', `${'HYUNLAB Memo'}.exe`)

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- CDP 연결 도우미 ----------
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
          const r = await this.send('Runtime.evaluate', {
            expression,
            awaitPromise: true,
            returnByValue: true,
          })
          if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400))
          return r.result.value
        },
        /** 창 크기를 정하고 2배 해상도로 캡처해서 저장 */
        async shot(name, width, height) {
          await this.send('Emulation.setDeviceMetricsOverride', {
            width,
            height,
            deviceScaleFactor: 2, // 선명한 이미지
            mobile: false,
          })
          await wait(600)
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

/**
 * 열려 있는 팝오버(꾸미기 패널 등)를 닫는 코드.
 * Popover는 'click'이 아니라 'mousedown'을 듣기 때문에
 * click()으로는 닫히지 않습니다.
 */
const CLOSE_POPOVERS = `(async () => {
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(300);
  return !document.querySelector('.ui-panel');
})()`

// ---------- 화면에 채울 예시 데이터 ----------
const SEED = `(() => {
  localStorage.clear();
  const now = Date.now(), D = 86400000;
  const p1='p-work', p2='p-personal';
  const check=(t,done)=>'<div class="check-item'+(done?' done':'')+'"><input type="checkbox" contenteditable="false"'+(done?' checked':'')+'>&nbsp;'+t+'</div>';
  const base={reminder:{enabled:false,datetime:'',repeat:'none'},popup:{x:200,y:200,width:360,height:420,alwaysOnTop:true,locked:false}};
  const memos=[
    {...base,id:'m1',projectId:p1,title:'2월 마케팅 캠페인 기획',label:'urgent',
     content:'<b>목표</b><div>신규 가입자 3,000명 확보</div><div><br></div><b>채널별 예산</b><ul><li>검색광고 40%</li><li>SNS 35%</li><li>제휴 25%</li></ul><div><br></div><b>일정</b><div>2월 1일 소재 확정 → 2월 5일 집행 시작</div>',
     tags:['업무','기획'],pinned:true,favorite:true,
     reminder:{enabled:true,datetime:'2026-08-05T09:00',repeat:'weekly'},
     createdAt:now-3*D,updatedAt:now-1800000},
    {...base,id:'m2',projectId:p1,title:'출시 전 체크리스트',label:'today',
     content:check('QA 최종 점검',true)+check('스토어 심사 제출',true)+check('보도자료 배포',false)+check('사내 공지',false)+check('고객센터 매뉴얼 준비',false),
     tags:['업무'],pinned:true,favorite:false,createdAt:now-2*D,updatedAt:now-7200000},
    {...base,id:'m3',projectId:p1,title:'주간 회의록',label:'doing',
     content:'<b>참석자</b><div>김현수, 이지은, 박민철</div><div><br></div><b>결정 사항</b><ul><li>출시일 2주 연기</li><li>베타 테스터 200명 추가 모집</li></ul>',
     tags:['업무','회의'],pinned:false,favorite:false,createdAt:now-5*D,updatedAt:now-D},
    {...base,id:'m4',projectId:p2,title:'읽을 책 목록',label:'personal',
     content:check('사피엔스',true)+check('클린 코드',false)+check('넛지',false),
     tags:['개인'],pinned:false,favorite:true,createdAt:now-10*D,updatedAt:now-2*D},
    {...base,id:'m5',projectId:p2,title:'여행 준비물',label:'doing',
     content:check('여권 확인',true)+check('환전',false)+check('보조배터리',false),
     tags:['개인','여행'],pinned:false,favorite:false,createdAt:now-12*D,updatedAt:now-3*D},
    {...base,id:'m6',projectId:null,title:'아이디어 메모',label:null,
     content:'<b>음성 메모 기능</b><div>걸어다니면서 빠르게 기록</div>',
     tags:['아이디어'],pinned:false,favorite:false,createdAt:now-30*D,updatedAt:now-5*D},
  ];
  localStorage.setItem('hyunlab-memo:memos',JSON.stringify(memos));
  localStorage.setItem('hyunlab-memo:projects',JSON.stringify([
    {id:p1,name:'회사 업무',color:'#4F46E5',createdAt:now},
    {id:p2,name:'개인',color:'#10b981',createdAt:now}]));
  const d=(c,skin)=>({color:c,font:'pretendard',fontSize:16,skin:skin||'plain',border:'none',shadow:'soft',opacity:1});
  localStorage.setItem('hyunlab-memo:designs',JSON.stringify({
    m1:d('white'), m2:d('mint'), m3:d('sky','lined'),
    m4:d('cream','dot'), m5:d('lavender'), m6:d('yellow','grid')}));
  localStorage.setItem('hyunlab-memo:settings',JSON.stringify({
    theme:'light', sort:'updated', view:'list',
    defaultDesign:{color:'yellow',font:'pretendard',fontSize:16,skin:'plain',border:'none',shadow:'soft',opacity:1},
    autoStart:false, autoBackup:true, custom:{accent:'#4F46E5',customColors:[]}, historyLimit:20}));
  localStorage.setItem('hyunlab-memo:schema','2');
  return 'seeded';
})()`

// ---------- 실행 ----------
console.log('\n📸 HYUNLAB Memo 스크린샷 촬영\n')

if (!fs.existsSync(APP_EXE)) {
  console.error(`  ❌ 앱을 찾을 수 없습니다: ${path.relative(ROOT, APP_EXE)}`)
  console.error('     먼저 "npm run build:win" 을 실행하세요.\n')
  process.exit(1)
}

fs.mkdirSync(OUT, { recursive: true })

const child = spawn(APP_EXE, [`--remote-debugging-port=${PORT}`], {
  detached: true,
  stdio: 'ignore',
})

let main = null
for (let i = 0; i < 40; i++) {
  await wait(600)
  try {
    const list = await targets()
    main = list.find((t) => t.type === 'page' && !t.url.includes('#/popup/'))
    if (main) break
  } catch {}
}
if (!main) {
  console.error('  ❌ 앱에 연결하지 못했습니다.\n')
  process.exit(1)
}

const S = await connect(main.webSocketDebuggerUrl)
await S.eval(SEED)
await S.eval('location.reload()')
await wait(2500)

// ── 01. 메인 화면 ──
await S.eval(`(() => {
  const s = window.__memoStore; // 배포 빌드엔 없으므로 UI로 선택
  const card = document.querySelectorAll('aside h3')[0]?.closest('button');
  card?.click();
  return true;
})()`)
await wait(700)
await S.shot('01-main', 1180, 760)

// ── 02. 체크리스트 ──
await S.eval(`(() => {
  const cards = [...document.querySelectorAll('aside h3')];
  const target = cards.find(h => h.textContent.includes('체크리스트'));
  target?.closest('button')?.click();
  return true;
})()`)
await wait(700)
await S.shot('02-checklist', 1180, 760)

// ── 03. 꾸미기 패널 ──
await S.eval(`(async () => {
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  const chip = [...document.querySelectorAll('main button')].find(b=>b.textContent.trim()==='꾸미기');
  chip?.click();
  await wait(400);
  return true;
})()`)
await wait(700)
await S.shot('03-design', 1180, 760)

// ── 04. 그리기 ──
await S.eval(CLOSE_POPOVERS)
await S.eval(`(async () => {
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  const cards = [...document.querySelectorAll('aside h3')];
  cards.find(h=>h.textContent.includes('회의록'))?.closest('button')?.click();
  await wait(500);
  const draw = [...document.querySelectorAll('main button')].find(b=>b.textContent.trim()==='그리기');
  draw?.click();
  await wait(600);
  // 손그림 몇 개 그려 넣기
  const canvas = document.querySelector('main canvas');
  if (!canvas) return 'no canvas';
  canvas.setPointerCapture = () => {};
  const r = canvas.getBoundingClientRect();
  const pe = (type,x,y,buttons=1) => canvas.dispatchEvent(new PointerEvent(type,{
    clientX:r.left+x, clientY:r.top+y, buttons, bubbles:true, pointerId:1, isPrimary:true}));
  // 밑줄 강조
  pe('pointerdown', 30, 42);
  for (let i=1;i<=18;i++) pe('pointermove', 30+i*11, 42+Math.sin(i/2.5)*3);
  pe('pointerup', 228, 42);
  await wait(250);
  // 화살표
  const arrow = document.querySelector('button[title="화살표"]');
  arrow?.click(); await wait(200);
  pe('pointerdown', 300, 150);
  pe('pointermove', 150, 108);
  pe('pointerup', 150, 108);
  await wait(250);
  // 동그라미
  const circle = document.querySelector('button[title="동그라미"]');
  circle?.click(); await wait(200);
  pe('pointerdown', 20, 128);
  pe('pointermove', 140, 172);
  pe('pointerup', 140, 172);
  await wait(300);
  return 'drawn';
})()`)
await wait(900)
await S.shot('04-drawing', 1180, 760)

// ── 05. 스킨 (모눈 스킨 메모를 화면 가득) ──
await S.eval(CLOSE_POPOVERS)
await S.eval(`(async () => {
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  // 그리기 모드가 켜져 있으면 끕니다.
  const draw = [...document.querySelectorAll('main button')].find(b=>b.textContent.trim()==='그리기');
  if (draw && draw.className.includes('bg-accent')) { draw.click(); await wait(300); }
  // 모눈(grid) 스킨이 적용된 메모를 엽니다.
  const cards = [...document.querySelectorAll('aside h3')];
  cards.find(h=>h.textContent.includes('아이디어'))?.closest('button')?.click();
  await wait(600);
  return true;
})()`)
await wait(700)
await S.shot('05-skins', 1180, 760)

// ── 06. 팝업 메모 ──
await S.eval(CLOSE_POPOVERS)
await S.eval(`(async () => {
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  const cards = [...document.querySelectorAll('aside h3')];
  cards.find(h=>h.textContent.includes('체크리스트'))?.closest('button')?.click();
  await wait(500);
  document.querySelector('button[title="팝업으로 열기"]')?.click();
  return true;
})()`)
await wait(3000)

const popupTarget = (await targets()).find((t) => t.type === 'page' && t.url.includes('#/popup/'))
if (popupTarget) {
  const P = await connect(popupTarget.webSocketDebuggerUrl)
  await wait(800)
  await P.shot('06-popup', 380, 440)
  P.close()
} else {
  console.log('  ⚠️  팝업 창을 찾지 못해 건너뜁니다.')
}

S.close()
try {
  process.kill(child.pid)
} catch {}

// 남은 프로세스 정리
spawn('taskkill', ['/IM', 'HYUNLAB Memo.exe', '/F'], { stdio: 'ignore' })

const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.png'))
console.log(`\n✅ ${files.length}장 저장 완료 → ${path.relative(ROOT, OUT)}\n`)
process.exit(0)
