/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // index.css에 정의한 CSS 변수를 Tailwind 색으로 연결합니다.
      // 이렇게 하면 bg-surface, text-muted 같은 클래스를 쓰면서
      // 라이트/다크 전환이 자동으로 됩니다.
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        line: 'var(--border)',
        'line-strong': 'var(--border-strong)',
        body: 'var(--text)',
        muted: 'var(--text-muted)',
        faint: 'var(--text-faint)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      spacing: {
        1: 'var(--gap-1)',
        2: 'var(--gap-2)',
        3: 'var(--gap-3)',
        4: 'var(--gap-4)',
        5: 'var(--gap-5)',
        6: 'var(--gap-6)',
      },
      fontFamily: {
        sans: ['Pretendard', 'Noto Sans KR', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // 앱에서 쓰는 글자 크기를 5단계로 제한해 통일감을 유지합니다.
        xs: ['11px', '1.4'],
        sm: ['12px', '1.5'],
        base: ['13px', '1.6'],
        md: ['14px', '1.6'],
        lg: ['16px', '1.5'],
        xl: ['19px', '1.4'],
      },
    },
  },
  plugins: [],
}
