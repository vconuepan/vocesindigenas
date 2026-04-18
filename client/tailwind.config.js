/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f9f4',
          100: '#dcf0e5',
          200: '#b9e2ca',
          300: '#86cd9e',
          400: '#4db378',
          500: '#27965c',
          600: '#1a7a4a',
          700: '#156040',
          800: '#0D5F3C',
          900: '#0a4a30',
        },
        accent: {
          50:  '#fdf2f1',
          100: '#fce4e2',
          200: '#f9c6c1',
          300: '#f59e97',
          400: '#ee6d64',
          500: '#C8473A',
          600: '#b03d31',
          700: '#922f25',
          800: '#6e221a',
          900: '#4a1410',
        },
      },
      fontFamily: {
        fraunces: ['Fraunces', 'Georgia', 'ui-serif', 'serif'],
        lora:     ['Lora',     'ui-serif', 'Georgia', 'serif'],
        'dm-sans':['DM Sans',  'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
