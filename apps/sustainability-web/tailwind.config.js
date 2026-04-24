/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'eco-green': '#2ecc71',
        'eco-dark': '#27ae60',
      }
    },
  },
  plugins: [],
}