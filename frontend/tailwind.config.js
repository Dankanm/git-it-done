/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#4f46e5',
          600: '#4338ca',
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(99, 102, 241, 0.35)',
      },
    },
  },
  plugins: [],
};
