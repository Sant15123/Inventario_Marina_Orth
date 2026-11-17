/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        'fmo-green': 'var(--fmo-green, #abd037)',
        'fmo-purple': 'var(--fmo-purple, #7b2cbf)',
        'fmo-gray': 'var(--fmo-gray, #6d6e71)',
        'fmo-deep-blue': 'var(--fmo-deep-blue, #013a52)',
      },
    },
  },
  plugins: [],
};
