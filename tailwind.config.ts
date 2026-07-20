import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fondo: '#0A0A0A',
        panel: '#111111',
        'panel-alto': '#161616',
        borde: '#1F1F1F',
        acento: '#D2B48C',
        'acento-suave': 'rgba(210, 180, 140, 0.1)',
        'acento-hover': '#DEC29E',
        texto: '#EAEAEA',
        'texto-secundario': '#8A8A8A',
        peligro: '#E5484D',
        'peligro-suave': 'rgba(229, 72, 77, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
