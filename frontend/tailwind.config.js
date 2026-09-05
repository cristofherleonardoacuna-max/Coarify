/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        coar: {
          navy: '#1A2B4C',
          'navy-light': '#25406F',
          gold: '#D4AF37',
          'gold-light': '#E9C863',
        },
        // Tokens del tema activo (definidos en styles/index.css)
        bg: 'var(--bg)',
        elev: 'var(--bg-elev)',
        soft: 'var(--bg-soft)',
        line: 'var(--border)',
        ink: 'var(--text)',
        dim: 'var(--text-dim)',
        accent: 'var(--accent)',
        accent2: 'var(--accent-2)',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px -6px var(--accent)',
        card: '0 8px 30px -12px rgba(0,0,0,.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '.45' },
          '50%': { opacity: '.9' },
        },
        spinSlow: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-up': 'fade-up .35s ease both',
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        'spin-slow': 'spinSlow 9s linear infinite',
      },
    },
  },
  plugins: [],
};
