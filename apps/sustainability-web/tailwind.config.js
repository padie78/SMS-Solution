const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'src/**/*.{html,ts}'),
  ],
  theme: {
    extend: {
      colors: {
        'eco-green': '#2ecc71',
        'eco-dark': '#27ae60',
      },
    },
  },
  plugins: [],
};
