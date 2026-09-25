/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5fb',
          100: '#dbe6f4',
          200: '#b3cbe8',
          300: '#84acd9',
          400: '#5688c4',
          500: '#3a6bac',
          600: '#2c5490',
          700: '#254475',
          800: '#213a61',
          900: '#1f3252',
        },
      },
    },
  },
  plugins: [],
};
