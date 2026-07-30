// ============================================================
// 3단계: 복사 / 내보내기
//
//  - 텍스트 복사, 서식(HTML) 포함 복사
//  - 이미지로 복사 (클립보드), PNG / JPG 저장
//  - PDF 저장 (브라우저 인쇄 대화상자를 이용)
//
// 【웹 / Windows 차이】
//  · 이미지 클립보드 복사는 Chromium 기반에서만 동작합니다.
//    (웹 브라우저 = Chrome/Edge OK, Firefox/Safari 일부 제한 / Electron = OK)
//  · PDF는 '인쇄 → PDF로 저장'을 여는 방식입니다. 자동 저장은 아닙니다.
// ============================================================

import { toPng, toJpeg } from 'html-to-image'
import { stripHtml } from './filter'

/** 순수 텍스트로 클립보드에 복사 */
export async function copyText(html: string): Promise<void> {
  await navigator.clipboard.writeText(stripHtml(html))
}

/**
 * 서식을 유지한 채 복사.
 * text/html 과 text/plain 두 형식을 함께 넣어,
 * 붙여넣는 곳이 서식을 지원하면 서식이, 아니면 글자만 들어갑니다.
 */
export async function copyRich(html: string): Promise<void> {
  if (typeof ClipboardItem === 'undefined') {
    // 구형 환경 폴백
    await copyText(html)
    return
  }
  const item = new ClipboardItem({
    'text/html': new Blob([html], { type: 'text/html' }),
    'text/plain': new Blob([stripHtml(html)], { type: 'text/plain' }),
  })
  await navigator.clipboard.write([item])
}

/** 캡처할 때 잠시 감출 요소(선택 테두리 등)를 걸러냅니다. */
const captureOptions = {
  cacheBust: true,
  filter: (node: HTMLElement) => !node.dataset?.noCapture,
}

/** DOM 영역을 PNG data URL로 만들기 */
export async function elementToPng(el: HTMLElement, background: string): Promise<string> {
  return toPng(el, { ...captureOptions, backgroundColor: background, pixelRatio: 2 })
}

/** 메모 영역을 이미지로 클립보드에 복사 */
export async function copyAsImage(el: HTMLElement, background: string): Promise<void> {
  const dataUrl = await elementToPng(el, background)
  const blob = await (await fetch(dataUrl)).blob()
  if (typeof ClipboardItem === 'undefined') {
    throw new Error('이 환경에서는 이미지 복사를 지원하지 않습니다.')
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

/** data URL을 파일로 내려받기 */
function download(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

/** PNG로 저장 */
export async function saveAsPng(el: HTMLElement, background: string, name: string): Promise<void> {
  download(await elementToPng(el, background), `${name}.png`)
}

/** JPG로 저장 */
export async function saveAsJpg(el: HTMLElement, background: string, name: string): Promise<void> {
  const dataUrl = await toJpeg(el, {
    ...captureOptions,
    backgroundColor: background,
    pixelRatio: 2,
    quality: 0.95,
  })
  download(dataUrl, `${name}.jpg`)
}

/**
 * PDF로 저장.
 *
 * 【제한 사항】 브라우저에는 "PDF 파일을 조용히 만들어 저장"하는 표준 기능이 없습니다.
 * PDF 라이브러리(jsPDF 등)를 넣으면 한글 폰트를 통째로 포함해야 해서
 * 앱 용량이 크게 늘고 글꼴이 깨지기 쉽습니다.
 * 그래서 여기서는 메모를 이미지로 렌더한 뒤 인쇄 창을 열어
 * 사용자가 '대상: PDF로 저장'을 고르도록 합니다. (Windows/웹 모두 동일)
 */
export async function printToPdf(el: HTMLElement, background: string, title: string): Promise<void> {
  const dataUrl = await elementToPng(el, background)
  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) {
    alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.')
    return
  }
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page { margin: 12mm; }
          body { margin: 0; display: flex; justify-content: center; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.focus(); window.print();" />
      </body>
    </html>
  `)
  win.document.close()
}
