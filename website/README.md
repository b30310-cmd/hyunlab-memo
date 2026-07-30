# HYUNLAB 사이트에 올리기

## 한 줄 요약

```bash
npm run build:win     # 설치 파일(.exe) 만들기
npm run build:site    # 업로드할 폴더 만들기
```

그러면 `website/dist-site/` 폴더가 생깁니다.
**그 폴더 "안에 있는 것들"을 홈페이지에 업로드하면 끝입니다.**

---

## 1. 업로드할 폴더 구조

`npm run build:site` 를 실행하면 이렇게 만들어집니다.

```
website/dist-site/
├─ index.html                             ← 소개 페이지
├─ icon.svg
├─ icon.png
├─ app/                                   ← 웹 버전 (설치 없이 사용)
│   ├─ index.html
│   └─ assets/...
└─ download/
    └─ HYUNLAB-Memo-Setup-1.0.0.exe       ← Windows 설치 파일 (80MB)
```

## 2. 업로드

FTP든 파일 관리자든, 원하는 위치에 **폴더 안의 내용물**을 그대로 올리면 됩니다.

예를 들어 `https://내사이트.com/memo/` 에 올리고 싶다면
서버의 `memo/` 폴더 안에 위 파일들을 넣습니다.

```
https://내사이트.com/memo/                            → 소개 페이지
https://내사이트.com/memo/app/                        → 웹 버전
https://내사이트.com/memo/download/HYUNLAB-...exe     → 다운로드
```

> **주소는 마음대로 정해도 됩니다.**
> 페이지 안의 링크가 전부 상대경로(`./app/`, `./download/`)라서
> 어느 폴더에 올리든 그대로 동작합니다. 수정할 필요 없습니다.

## 3. 기존 사이트에 메뉴만 연결하기

이미 있는 사이트에서 링크만 걸고 싶다면 이렇게 하면 됩니다.

```html
<a href="/memo/">HYUNLAB Memo</a>
```

소개 페이지를 쓰지 않고 **기존 페이지에 카드만 넣고 싶다면**
아래 HTML을 원하는 위치에 붙여 넣으세요.

```html
<div style="border:1px solid #e6e8ec;border-radius:16px;padding:24px;max-width:420px;font-family:Pretendard,sans-serif">
  <h3 style="margin:0 0 4px;font-size:20px;font-weight:700">HYUNLAB Memo</h3>
  <p style="margin:0 0 16px;color:#6b7280;font-size:14px">필요한 순간 바로 꺼내 쓰는 메모</p>
  <div style="display:flex;gap:8px;margin-bottom:12px">
    <a href="/memo/app/" style="background:#4F46E5;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:500">웹에서 사용하기</a>
    <a href="/memo/download/HYUNLAB-Memo-Setup-1.0.0.exe" style="border:1px solid #e6e8ec;color:#1a1c20;padding:10px 16px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:500">Windows 다운로드</a>
  </div>
  <div style="color:#6b7280;font-size:13px">
    <span style="color:#f5a623">★★★★★</span> · 무료 · Windows 10/11 지원
  </div>
</div>
```

## 4. 서버 설정 확인 (다운로드가 안 될 때)

일부 웹서버는 `.exe` 파일 다운로드를 막아 둡니다.
다운로드 링크를 눌렀는데 404나 403이 나오면 서버 설정을 확인하세요.

**Apache** (`.htaccess`)

```apache
<FilesMatch "\.exe$">
  ForceType application/octet-stream
  Header set Content-Disposition attachment
</FilesMatch>
```

**Nginx**

```nginx
location ~* \.exe$ {
  add_header Content-Disposition attachment;
  types { application/octet-stream exe; }
}
```

> 80MB 파일이라 업로드 용량 제한에 걸릴 수 있습니다.
> 서버에 직접 올리기 어렵다면 **GitHub Releases**나 구글 드라이브에 올리고,
> `index.html` 의 다운로드 링크만 그 주소로 바꾸면 됩니다.

## 5. 버전을 올릴 때

`package.json` 의 `version` 만 바꾸고 다시 빌드하면
설치 파일 이름과 사이트가 자동으로 맞춰집니다.

```bash
# package.json 의 "version": "1.0.1" 로 수정 후
npm run build:win
npm run build:site
```

다만 `index.html` 아래쪽의 다운로드 링크와 푸터의 버전 표기는
**직접 바꿔야 합니다.** (`HYUNLAB-Memo-Setup-1.0.0.exe` → `...-1.0.1.exe`)

## 6. 올리기 전 확인

`build:site` 는 페이지가 가리키는 파일이 실제로 있는지 자동으로 검사합니다.
`✅ 링크 3개 모두 정상` 이 나오면 업로드해도 됩니다.

직접 눈으로 확인하고 싶다면 아래로 미리보기할 수 있습니다.

```bash
npx serve website/dist-site -l 4173
# 브라우저에서 http://localhost:4173 접속
```
