# HYUNLAB Memo

> 필요한 순간 바로 꺼내 쓰는 메모

Windows 스티커 메모보다 편한 생산성 메모앱입니다.
**하나의 프로젝트**에서 **웹 버전**과 **Windows 설치 버전(Electron)** 을 함께 제공합니다.

---

## 1. 빠르게 실행해보기

```bash
npm install
```

### 웹 버전 개발 서버

```bash
npm run dev
```

실행 후 브라우저에서 `http://localhost:5173` 을 엽니다.

### Windows 데스크톱 앱 (개발 모드)

```bash
npm run dev:electron
```

Electron 창이 뜨면서 실제 프로그램처럼 실행됩니다.
(팝업 메모, 트레이 아이콘, Windows 알림은 이 모드에서만 완전히 동작합니다.)

### 배포용 빌드

```bash
npm run build:web    # 웹 배포용 → dist/ 폴더 생성
npm run build:win    # Windows 설치파일 → release/1.0.0/*.exe 생성
```

`build:win` 을 실행하면 `release/1.0.0/HYUNLAB Memo Setup 1.0.0.exe` 가 만들어집니다.
이 파일을 HYUNLAB 사이트에 올려서 배포하면 됩니다.

### 지원 플랫폼 3가지

같은 서비스를 세 가지 방식으로 씁니다. **Windows 앱은 그대로**이고, 웹과 PWA가 추가됐습니다.

| | 실행 방법 | 설치 | 비고 |
|---|---|---|---|
| **Windows 앱** | `HYUNLAB Memo.exe` | `build:win`으로 만든 설치 파일 | 기존 그대로 유지 |
| **Web** | 브라우저로 주소 접속 | 불필요 | `build:web` 결과물 |
| **PWA** | 웹 버전에서 "앱으로 설치" | 브라우저가 설치 창을 띄움 | 웹 버전과 같은 코드 |

세 가지가 코드 하나를 공유하면서도 서로 부딪히지 않는 이유:

- **Electron 전용 기능**(트레이 아이콘, 자동 시작 등)은 `window.electronAPI` 유무로 분기합니다.
  → `src/lib/electron.ts`의 `isElectron()`
- **PWA 설치 버튼**은 그 반대로, Electron 안에서는 아예 뜨지 않습니다.
  → `src/hooks/useInstallPrompt.ts`
- **Windows 아이콘**(`public/icon.ico`)과 **웹/PWA 아이콘**(`public/icon-*.png`)은
  완전히 다른 파일입니다. `npm run build:pwa-icons`는 웹 아이콘만 다시 만들고
  `icon.ico`는 절대 건드리지 않습니다.

### PWA (앱으로 설치)

Edge·Chrome에서 브라우저가 "설치할 만하다"고 판단하면(매니페스트+서비스워커+HTTPS
조건 충족) `beforeinstallprompt` 이벤트가 오고, 그때만 툴바에 **"앱으로 설치"**
버튼이 나타납니다. 이미 설치되어 독립 창으로 실행 중이면 버튼은 자동으로 숨습니다.

```bash
npm run build:pwa-icons   # icon.svg → 192/512/maskable/favicon 등 생성
```

아이콘을 바꾸려면 `public/icon.svg`(마스터), `public/icon-small.svg`(파비콘용
단순화 버전)를 고친 뒤 이 명령을 다시 실행하세요.

---

## 2. 프로젝트 구조 (초보 개발자를 위한 설명)

```
hyunlab-memo/
├── index.html              ← 웹페이지의 시작점. 여기에 React가 붙습니다.
├── package.json            ← 프로젝트 정보 + 명령어 + electron-builder 설정
├── vite.config.ts          ← 빌드 도구(Vite) 설정. Electron 켜고 끄는 곳
├── tailwind.config.js      ← 디자인(색상/그림자/폰트) 설정
│
├── electron/               ← 【Windows 앱 전용 코드】
│   ├── main.ts             ← 앱 창 생성, 팝업 창, 트레이, 알림, 자동시작
│   └── preload.ts          ← 웹 화면 ↔ Windows 기능을 잇는 안전한 다리
│
├── public/                 ← 그대로 복사되는 정적 파일
│   ├── icon.ico / icon.png / icon.svg   ← 앱 아이콘
│   ├── manifest.webmanifest             ← PWA 설치 정보
│   └── sw.js                            ← 서비스워커 (오프라인 지원)
│
├── website/
│   └── index.html          ← HYUNLAB 사이트에 올릴 소개/다운로드 페이지
│
└── src/                    ← 【화면과 기능의 대부분이 여기 있습니다】
    ├── main.tsx            ← 시작점. 주소(#/popup/...)에 따라 화면을 고릅니다.
    ├── App.tsx             ← 메인 화면 (툴바 + 목록 + 편집기)
    ├── index.css           ← 전역 스타일 + 에디터 스타일
    │
    ├── types/index.ts      ← 데이터 모양 정의 (메모란 무엇인가?)
    │
    ├── lib/                ← 순수 기능 함수 모음 (화면 없음)
    │   ├── constants.ts    ← 배경색, 폰트, 특수문자, 이모지 목록
    │   ├── storage.ts      ← 저장/불러오기, JSON 내보내기/가져오기
    │   ├── filter.ts       ← 검색·정렬·미리보기 텍스트
    │   ├── richtext.ts     ← 굵게/기울임/체크박스 등 서식 명령
    │   ├── electron.ts     ← Electron 기능 호출 (웹에서는 자동 대체)
    │   └── id.ts           ← 고유 ID 생성
    │
    ├── store/              ← 앱의 '상태'를 담는 곳 (Zustand)
    │   ├── useMemoStore.ts     ← 메모 추가/수정/삭제/복제/고정
    │   ├── useSettingsStore.ts ← 테마, 기본색, 자동시작 등 설정
    │   └── useUiStore.ts       ← 검색어, 태그 필터 등 화면 상태
    │
    ├── hooks/
    │   └── useReminders.ts ← 알림 시간이 되면 알림을 띄우는 타이머
    │
    ├── pages/
    │   └── PopupWindow.tsx ← 팝업(스티커) 메모 창 화면
    │
    └── components/         ← 화면 조각들
        ├── Toolbar/        ← 상단 툴바 (새 메모, 검색, 정렬, 설정)
        ├── Sidebar/        ← 좌측 메모 목록
        ├── Editor/         ← 우측 편집 영역
        │   ├── Editor.tsx           ← 편집 화면 전체
        │   ├── EditorToolbar.tsx    ← 굵게/기울임/체크박스 등 서식 버튼
        │   ├── EmojiPicker.tsx      ← 이모지 선택기
        │   ├── SpecialCharPicker.tsx← 특수문자 선택기
        │   └── ReminderEditor.tsx   ← 알림 설정
        ├── Settings/       ← 설정 모달
        └── common/         ← 여러 곳에서 재사용하는 조각
            ├── RichTextEditor.tsx   ← 글을 쓰는 실제 편집 영역
            └── Popover.tsx          ← 버튼 누르면 뜨는 작은 패널
```

### 데이터는 어디에 저장되나요?

브라우저와 Electron 모두 **localStorage** 에 저장되며,
성격이 다른 데이터를 **일부러 따로 나눠서** 보관합니다.

| 키 | 담는 것 | 잃었을 때 |
|---|---|---|
| `hyunlab-memo:memos` | 글 내용·제목·태그·분류 | 치명적 |
| `hyunlab-memo:designs` | 색·폰트·스킨·테두리·그림자 | 모양만 기본값으로 |
| `hyunlab-memo:drawings` | 펜·형광펜 등 필기 | 그림만 사라짐 |
| `hyunlab-memo:projects` | 프로젝트(폴더) 목록 | 분류만 사라짐 |
| `hyunlab-memo:history` | 이전 내용 스냅샷 | 복원 불가 |
| `hyunlab-memo:settings` | 앱 설정 | 기본값으로 |

**왜 나눴나요?**
꾸미기·그리기 기능을 나중에 고치다 문제가 생겨도 **글 내용에는 손이 가지 않기 때문**입니다.
기능을 계속 추가해도 기존 메모가 손상되지 않도록 만든 구조입니다.

데이터 구조가 바뀌면 앱을 켤 때 자동으로 변환되고,
변환 전 원본은 `hyunlab-memo:memos:backup-v1` 에 그대로 남습니다.

글을 입력하는 즉시 저장되므로 따로 "저장" 버튼이 없습니다.
다른 PC로 옮기려면 **설정 → 백업 → 내보내기** 로 JSON 파일을 만들면 됩니다.
(가져오기는 기본이 **합치기**라서 기존 메모가 지워지지 않습니다.)

### 화면이 단순한 이유

앱을 켜면 바로 글을 쓸 수 있어야 하므로,
서식·꾸미기·그리기 도구는 **접힌 상태**가 기본입니다.
필요할 때 `서식` `꾸미기` `그리기` 칩을 눌러 펼치고, 나머지 기능은 `⋯` 메뉴 안에 있습니다.
메모를 **우클릭**하면 그 메모에 필요한 동작만 담긴 메뉴가 뜹니다.

팝업 메모는 더 엄격합니다. 기본 노출은 **📌 고정 / ✏️ 그리기 / ⋯ 더보기 / ✕ 닫기** 네 개뿐이고,
서식·꾸미기·알림·태그·복제·내보내기·잠금·투명도·설정은 전부 더보기 안에 있습니다.
`⋯ → 작게 보기`를 누르면 제목과 체크리스트만 보이는 **Compact Mode**로 줄어들고,
본문을 클릭하면 다시 펼쳐집니다.

### 디자인 규칙

색·간격·버튼 크기·아이콘 크기는 한 곳에서만 정의합니다.
새 화면을 추가할 때 지켜야 할 규칙은 [DESIGN.md](DESIGN.md)에 정리했습니다.

### 홈페이지 배포

```bash
npm run build:win     # 설치 파일 만들기
npm run shots         # 실제 앱 화면 자동 촬영
npm run build:site    # 업로드용 폴더 만들기
```

`website/dist-site/` 폴더 안의 파일들을 홈페이지에 올리면 됩니다.
자세한 내용은 [website/README.md](website/README.md) 참고.

### 버전 기록

버전별 변경 내용과 앞으로의 계획은 [CHANGELOG.md](CHANGELOG.md) 에 있습니다.

### 설치가 안 될 때

설치 파일을 실행했을 때 **파란 경고 화면(SmartScreen)** 이 뜨면
[추가 정보] → [실행] 을 누르면 됩니다. 코드 서명이 없어서 생기는 정상적인 경고입니다.

그 밖의 설치 문제와 해결법은 [INSTALL.md](INSTALL.md) 에 정리했습니다.

### 제한 사항

AI·기기 간 동기화 등 **지금 구조로는 제대로 만들 수 없는 기능**과 그 대안은
[LIMITATIONS.md](LIMITATIONS.md) 에 따로 정리했습니다.

---

## 3. 주요 기능

| 기능 | 설명 |
|---|---|
| 메모 | 무제한 생성, 삭제, 복제, 고정, 즐겨찾기 |
| 서식 | 굵게 / 기울임 / 밑줄 / 취소선 / 글씨색 / 형광펜 / 크기 / 정렬 |
| 목록 | 체크박스, 번호 목록, 글머리 기호, 인용, 코드블럭 |
| 특수문자 | 하트·별·화살표 등 카테고리별 제공 |
| 이모지 | 검색, 최근 사용, 즐겨찾기(우클릭) |
| 배경색 | 8가지 기본 색상 (다크모드 대응) |
| 폰트 | Pretendard, Noto Sans, SUIT 등 |
| 태그 | #업무 #아이디어 등으로 분류 및 필터 |
| 검색 | 제목·내용·태그 실시간 검색 |
| 알림 | 날짜/시간 지정, 매일·매주·매월 반복 |
| **팝업 메모** | 독립 창, 항상 위, 투명도, 잠금, 위치 기억 |
| 백업 | JSON 내보내기 / 가져오기 |
| Windows | 트레이 아이콘, 시작프로그램 등록 |
| 웹 | PWA 설치, 오프라인, 반응형 |

### 팝업 메모 사용법

1. 메모를 선택하고 상단의 **↗ (팝업으로 열기)** 버튼을 누릅니다.
2. 작은 독립 창이 뜹니다. 상단 바를 잡고 **바탕화면 어디로든 드래그**하세요.
3. 창 안에서 조절할 수 있는 것:
   - 📌 **항상 위** — 다른 창 위에 계속 표시
   - 🔒 **잠금** — 실수로 수정하지 않도록 편집 잠금
   - 🎨 **배경색** 변경
   - **투명도** 슬라이더
4. 여러 메모를 동시에 팝업으로 띄울 수 있습니다.
5. 창을 옮기거나 크기를 바꾸면 **위치가 기억**되어 다음에 같은 자리에 열립니다.

---

## 4. 자주 묻는 질문

**Q. 웹 버전과 설치 버전의 차이는?**
기능은 거의 같습니다. 다만 팝업 메모의 *항상 위 / 투명도 / 트레이 / 시작프로그램* 은
Windows 설치 버전에서만 완전히 동작합니다. 웹에서는 브라우저 팝업 창으로 열립니다.

**Q. 인터넷이 없어도 되나요?**
네. 데이터가 내 PC에 저장되고, 웹 버전도 PWA로 설치하면 오프라인에서 동작합니다.

**Q. 아이콘을 바꾸고 싶어요.**
`public/icon.ico` (Windows용), `public/icon.svg` (웹용)를 교체하고 다시 빌드하세요.

**Q. 배경색이나 폰트를 추가하고 싶어요.**
`src/lib/constants.ts` 의 `BACKGROUND_COLORS` / `FONTS` 배열에 항목을 추가하면 됩니다.

---

## 5. 배포 방법

1. `npm run build:win` 실행
2. `release/1.0.0/HYUNLAB Memo Setup 1.0.0.exe` 를 서버에 업로드
3. `website/index.html` 의 다운로드 링크를 업로드한 주소로 수정
4. `npm run build:web` 으로 만든 `dist/` 폴더를 웹 호스팅에 올리고,
   "웹에서 사용하기" 링크를 그 주소로 수정

---

© HYUNLAB · MIT License
