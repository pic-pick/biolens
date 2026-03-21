/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        primary:   '#3B82F6',
        secondary: '#06B6D4',
        accent:    '#8B5CF6',
        success:   '#10B981',
        warning:   '#F59E0B',
        muted:     '#64748B',
        // Dark surfaces
        base:      '#060B18',
        surface:   '#0F172A',
        elevated:  '#1E293B',
        rim:       '#2D4060',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        floatUp: {
          '0%':   { opacity: '0', transform: 'translateX(-50%) translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
      },
      animation: {
        shimmer:        'shimmer 2s linear infinite',
        'fade-up':      'fadeUp 0.4s ease forwards',
        'slide-in-right':'slideInRight 0.35s cubic-bezier(0.16,1,0.3,1)',
        'float-up':     'floatUp 0.35s ease forwards',
      },
    },
  },
  plugins: [],
}
