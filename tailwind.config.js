/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./**/*.html', './js/**/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4F46E5',
          50:  '#EEEEFF',
          100: '#D8D7FD',
          200: '#B5B3FA',
          300: '#9290F7',
          400: '#6E6CF0',
          500: '#4F46E5',
          600: '#3730C3',
          700: '#2822A1',
          800: '#1C177F',
          900: '#120F5E',
        },
        secondary: {
          DEFAULT: '#06B6D4',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
        },
        accent: {
          DEFAULT: '#8B5CF6',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
        },
      },
      fontFamily: {
        heading: ['"Poppins"', 'sans-serif'],
        body:    ['"Inter"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 50%, #06B6D4 100%)',
      },
      borderRadius: {
        xl:   '1rem',
        '2xl':'1.5rem',
        '3xl':'2rem',
      },
      boxShadow: {
        brand:    '0 4px 20px rgba(79,70,229,.25)',
        'brand-lg':'0 8px 40px rgba(79,70,229,.35)',
      },
    },
  },
  plugins: [],
};
