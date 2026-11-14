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
          blue: '#0066B3',
          darkBlue: '#00508F',
          gold: '#FFC72C',
          amber: '#F59E0B',
          canvas: '#F8FAFC',
          navy: '#0A192F',
          sky: '#38BDF8',
          mint: '#10B981',
        }
      }
    },
  },
  plugins: [],
}
