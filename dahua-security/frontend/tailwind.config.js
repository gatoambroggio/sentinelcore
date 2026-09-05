/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#0f172a',
        card: '#1e293b',
        cardhover: '#334155',
        accent: '#0ea5e9',
      },
    },
  },
  plugins: [],
};