import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'node:path'

// ELECTRON 환경변수가 있을 때만 Electron 플러그인을 켭니다.
// - 웹 개발/빌드: npm run dev / npm run build:web  (Electron 미포함)
// - 데스크톱 개발/빌드: npm run dev:electron / npm run build:win
const isElectron = !!process.env.ELECTRON

export default defineConfig({
  // Electron은 file:// 로 로드되므로 상대경로('./')가 필요합니다.
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    ...(isElectron
      ? [
          electron([
            {
              // 메인 프로세스
              entry: 'electron/main.ts',
            },
            {
              // preload 스크립트 (렌더러와 안전하게 통신하는 다리)
              // Electron의 preload는 CommonJS여야 하므로 .cjs로 내보냅니다.
              entry: 'electron/preload.ts',
              onstart(options) {
                options.reload()
              },
              vite: {
                build: {
                  // package.json이 "type": "module"이라 기본값은 ESM이지만,
                  // Electron preload는 CommonJS여야 하므로 lib 포맷을 cjs로 고정합니다.
                  // (여기서 formats를 지정하지 않으면 .cjs 파일 안에 import 구문이 들어가
                  //  preload가 로드되지 않고 window.electronAPI가 undefined가 됩니다.)
                  lib: {
                    entry: 'electron/preload.ts',
                    formats: ['cjs'],
                    fileName: () => 'preload.cjs',
                  },
                },
              },
            },
          ]),
          renderer(),
        ]
      : []),
  ],
  server: {
    port: 5173,
  },
})
