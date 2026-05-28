/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // src/styles/tokens.css의 --font-family-display와 일치.
        // tailwind-source.css의 @layer utilities .font-orbitron를 대체할 수 있다.
        orbitron: ['Orbitron', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
