/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // src/styles/tokens.css의 --font-family-display와 일치.
        // src/index.css의 @layer utilities .font-orbitron와 동일.
        orbitron: ['Orbitron', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
