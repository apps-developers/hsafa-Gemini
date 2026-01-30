/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./.storybook/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  important: true,
  theme: {
    extend: {
      colors: {
        // Primary Colors
        primary: {
          50: "#f2effb",
          100: "#e3dff6",
          200: "#d6cff2",
          300: "#c7bfed",
          400: "#b8afe9",
          500: "#a89fe5",
          600: "#8e84cc",
          700: "#7168a7",
          800: "#554f81",
          900: "#3b375b"
        },
        // Background Colors
        background: {
          light: '#FFFFFF',
          'light-intermediate': '#fbfbfb',
          'light-secondary': '#f7f7f7',
          'light-semi-tertiary': '#f4f4f4',
          'light-tertiary': '#f0f0f0',
          dark: '#101010',
          'dark-intermediate': '#151515',
          'dark-secondary': '#1a1a1a',
          'dark-semi-tertiary': '#2a2a2a',
          'dark-tertiary': '#404040',
        },
        // Text Colors
        text: {
          'light-primary': '#171717',
          'light-secondary': '#4B5563',
          'light-tertiary': '#6B7280',
          'dark-primary': '#FFFFFF',
          'dark-secondary': '#E5E5E5',
          'dark-tertiary': '#A3A3A3',
        },
        // Border Colors
        border: {
          'light-primary': '#E5E7EB',
          'light-secondary': '#D1D5DB',
          'light-tertiary': '#9CA3AF',
          'dark-primary': '#404040',
          'dark-secondary': '#525252',
          'dark-tertiary': '#737373',
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'gradient-x': 'gradient-x 3s ease infinite',
        blob: 'blob 7s infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        blob: {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
        },
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.text-primary': {
          '@apply text-text-light-primary dark:text-text-dark-primary': {},
        },
        '.text-secondary': {
          '@apply text-text-light-secondary dark:text-text-dark-secondary': {},
        },
        '.text-tertiary': {
          '@apply text-text-light-tertiary dark:text-text-dark-tertiary': {},
        },
        '.bg-primary': {
          '@apply bg-background-light dark:bg-background-dark': {},
        },
        '.bg-intermediate': {
          '@apply bg-background-light-intermediate dark:bg-background-dark-intermediate': {},
        },
        '.bg-secondary': {
          '@apply bg-background-light-secondary dark:bg-background-dark-secondary': {},
        },
        '.bg-semi-tertiary': {
          '@apply bg-background-light-semi-tertiary dark:bg-background-dark-semi-tertiary': {},
        },
        '.bg-tertiary': {
          '@apply bg-background-light-tertiary dark:bg-background-dark-tertiary': {},
        },
        '.border-primary': {
          '@apply border-border-light-primary dark:border-border-dark-primary': {},
        },
        '.no-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.tc-animated-border': {
          'background': 'linear-gradient(90deg, #ffffff, #ffffff80, #ffffff40, #ffffff80, #ffffff)',
          'background-size': '200% 200%',
          'animation': 'gradient-x 2s ease-in-out infinite',
        },
      }
      addUtilities(newUtilities)
    }
  ]
}
