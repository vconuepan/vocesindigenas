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
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec268f',
          600: '#d41f7f',
          700: '#b01a6a',
          800: '#661845',
          900: '#4a1133',
        }
      },
      fontFamily: {
        nexa: ['Nexa', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        lora: ['Lora', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
