/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0B3D91',
        'primary-dark': '#072B68',
        accent: '#0BD3D3',
        'night-sky': '#0B1220',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(11, 18, 32, 0.35)',
      },
    },
  },
  plugins: [],
};
