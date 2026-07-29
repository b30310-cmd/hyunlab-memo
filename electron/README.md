# HYUNLAB Memo — Windows 데스크톱 앱 (Electron)

`app/` 폴더에 있는 기존 HYUNLAB Memo 웹앱(빌드 결과물)을 **그대로** 감싸서
Windows용 실행 파일로 만드는 Electron 프로젝트입니다.

- 웹앱 코드(`../app`)는 전혀 수정하지 않습니다.
- Chrome의 PWA 설치가 필요 없이 일반 `.exe` 프로그램처럼 실행됩니다.
- 자동 업데이트 기능은 포함하지 않습니다. (새 버전이 나오면 설치 파일을 다시 받아 재설치)

## 폴더 구조

```
electron/
├── main.js        # 메인 프로세스 — 창 생성, 팝업 메모 창, 창 위치 기억, 트레이 없이 일반 앱으로 동작
├── preload.js      # 렌더러에 window.electronAPI 를 주입 (웹앱이 이미 이 API를 사용하도록 만들어져 있음)
├── package.json    # electron-builder 빌드 설정 포함
└── build/
    └── icon.ico    # Windows 아이콘 (설치본/포터블 실행파일 아이콘)
```

## 사전 준비

- Node.js 20 이상
- Windows에서 빌드하는 것을 권장합니다. (아래 GitHub Actions를 쓰면 Windows PC 없이도 빌드됩니다)

## 개발 중 실행해보기

```bash
cd electron
npm install
npm start
```

창이 뜨고 `../app/index.html`(기존 웹앱)을 그대로 불러옵니다.

## 배포용 빌드 만들기 (로컬)

```bash
cd electron
npm install
npm run dist              # 설치 버전 + Portable 버전 둘 다 생성
# 또는 하나씩만
npm run dist:installer    # HyunLabMemo_Setup.exe 만
npm run dist:portable     # HyunLabMemo_Portable.exe 만
```

빌드 결과물은 `electron/dist/` 안에 생성됩니다.

- `HyunLabMemo_Setup.exe` — 설치 버전 (시작 메뉴 등록 + 바탕화면 바로가기 자동 생성, 설치 경로 변경 가능)
- `HyunLabMemo_Portable.exe` — 무설치 버전 (압축 없이 exe 파일 하나만 옮겨서 바로 실행 가능)

> Windows용 설치 파일은 Windows(또는 아래 GitHub Actions)에서 빌드해야 합니다.
> macOS/Linux에서도 `electron-builder`가 Windows 타깃 빌드를 시도할 수는 있지만,
> 코드 서명·NSIS 관련 도구 문제로 실패하기 쉬워 권장하지 않습니다.

## 아이콘 교체

`electron/build/icon.ico` 파일을 원하는 아이콘(.ico, 여러 해상도 포함 권장: 16/32/48/256px)으로
교체한 뒤 다시 빌드하면 됩니다. `app/icon-512.png` 등 기존 PWA 아이콘에서 다시 만들고 싶다면:

```bash
npx png-to-ico app/icon-512.png app/icon-192.png app/favicon-32.png app/favicon-16.png > electron/build/icon.ico
```

## GitHub Actions로 자동 빌드 + GitHub Release 배포

`.github/workflows/build-windows.yml` 워크플로우가 이미 포함되어 있습니다.
Windows PC가 없어도 GitHub의 `windows-latest` 러너에서 실제 `.exe`가 빌드됩니다.

### 방법 A — 태그를 push해서 자동으로 릴리스까지 만들기 (권장)

```bash
git tag v1.1.0
git push origin v1.1.0
```

`v`로 시작하는 태그가 push되면 워크플로우가:
1. `electron/` 에서 `npm ci` → `npm run dist` 실행 (Setup.exe + Portable.exe 빌드)
2. 빌드된 두 exe 파일을 **해당 태그의 GitHub Release**에 자동으로 첨부

Release가 없으면 새로 만들어지고, 있으면 자산이 추가됩니다.
(Actions 탭 → 워크플로우 실행 로그에서 진행 상황을 볼 수 있습니다.)

### 방법 B — 릴리스 없이 빌드만 확인하고 싶을 때

GitHub 저장소 → **Actions** 탭 → `Build Windows app` → **Run workflow** 버튼으로 수동 실행하면,
Release는 만들지 않고 빌드된 exe 파일을 워크플로우의 **Artifacts**로만 올려줍니다.
(태그 push 없이 빌드 결과물만 미리 확인하고 싶을 때 사용)

### 방법 C — 수동으로 로컬 빌드 후 직접 Release 올리기

```bash
cd electron
npm install
npm run dist
gh release create v1.1.0 dist/HyunLabMemo_Setup.exe dist/HyunLabMemo_Portable.exe \
  --title "HYUNLAB Memo v1.1.0" \
  --notes "Windows 데스크톱 앱 릴리스"
```

(`gh` CLI 대신 GitHub 웹사이트의 Releases → Draft a new release 화면에서 exe 파일을
직접 드래그해서 올려도 됩니다.)

## Windows SmartScreen 경고 안내

코드 서명 인증서가 없어서 설치/실행 시 "Windows의 PC 보호" 경고가 뜰 수 있습니다.
`[추가 정보]` → `[실행]` 을 누르면 정상적으로 진행됩니다. (관리자 권한 불필요)

## 웹앱 ↔ Electron 연동 방식 (참고)

`app/assets/index-*.js` 안의 기존 웹앱 코드는 이미 `window.electronAPI` 존재 여부를
감지해서, 있으면 Electron 전용 동작(팝업 메모 창, 데스크톱 알림, Windows 시작 시 자동 실행,
Ctrl+Shift+N 빠른 캡처)을 사용하도록 만들어져 있습니다. `preload.js`가 다음 메서드를
정확히 이 이름으로 제공해야 합니다 — 이름을 바꾸면 웹앱과의 연동이 끊깁니다.

| 메서드 | 설명 |
| --- | --- |
| `openPopup(memoId, popupState)` | 메모 하나를 독립된 팝업 창으로 열기/포커스 |
| `notify(title, body)` | Windows 데스크톱 알림 표시 |
| `setAutoStart(enabled)` | Windows 로그인 시 자동 실행 설정 |
| `setAlwaysOnTop(flag)` | (팝업 창) 항상 위에 고정 |
| `setOpacity(value)` | (팝업 창) 투명도 조절 |
| `closeWindow()` | 현재 창 닫기 |
| `openMain()` | 메인 창 열기/포커스 |
| `onQuickCapture(callback)` | Ctrl+Shift+N 눌렀을 때 이벤트 수신 |
| `onBoundsChanged(callback)` | 팝업 창을 옮기거나 크기 조절했을 때 이벤트 수신 (위치 기억용) |
