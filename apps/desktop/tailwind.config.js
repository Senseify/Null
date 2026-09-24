/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        null: {
          bg: '#0B0C0E',
          charcoal: '#121316',
          panel: '#17181D',
          surface: '#1E2026',
          border: '#252830',
          borderLight: '#333742',
          text: '#F0F1F3',
          muted: '#8E929B',
          ash: '#5A5E69',
          online: '#10B981',
          danger: '#EF4444',
          accent: '#A4AAB7',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Inter',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'Consolas',
          '"Liberation Mono"',
          'Menlo',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
