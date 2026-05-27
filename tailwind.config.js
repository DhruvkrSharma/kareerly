/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface:                    'var(--surface)',
        'surface-dim':              'var(--surface-dim)',
        'surface-bright':           'var(--surface-bright)',
        'surface-container-lowest': 'var(--surface-container-lowest)',
        'surface-container-low':    'var(--surface-container-low)',
        'surface-container':        'var(--surface-container)',
        'surface-container-high':   'var(--surface-container-high)',
        'surface-container-highest':'var(--surface-container-highest)',
        'on-surface':               'var(--on-surface)',
        'on-surface-variant':       'var(--on-surface-variant)',
        primary:                    'var(--primary)',
        'primary-container':        'var(--primary-container)',
        'on-primary':               'var(--on-primary)',
        'on-primary-container':     'var(--on-primary-container)',
        secondary:                  'var(--secondary)',
        'on-secondary':             'var(--on-secondary)',
        'secondary-container':      'var(--secondary-container)',
        'on-secondary-container':   'var(--on-secondary-container)',
        tertiary:                   'var(--tertiary)',
        'on-tertiary':              'var(--on-tertiary)',
        'tertiary-container':       'var(--tertiary-container)',
        outline:                    'var(--outline)',
        'outline-variant':          'var(--outline-variant)',
        error:                      'var(--error)',
      },
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui'],
        display: ['"Hanken Grotesk"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'glow-primary': '0 0 24px color-mix(in srgb, var(--primary-container) 40%, transparent)',
        'glow-tertiary': '0 0 24px color-mix(in srgb, var(--tertiary) 30%, transparent)',
      },
    },
  },
  plugins: [],
}
