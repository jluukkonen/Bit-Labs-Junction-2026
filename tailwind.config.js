/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        espoo: {
          blue: '#0050BB',
          navy: '#0A192F',
          sky: '#38BDF8',
          mint: '#10B981',
        }
      }
    },
  },
  plugins: [],
}
