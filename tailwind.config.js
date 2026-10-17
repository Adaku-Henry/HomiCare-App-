/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';

const homiOrange = colors.orange;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      ...colors,
      amber: homiOrange,
      blue: homiOrange,
      cyan: homiOrange,
      fuchsia: homiOrange,
      indigo: homiOrange,
      lime: homiOrange,
      pink: homiOrange,
      purple: homiOrange,
      red: homiOrange,
      rose: homiOrange,
      teal: homiOrange,
      violet: homiOrange,
      yellow: homiOrange,
    },
    extend: {
      boxShadow: {
        'homicare': '0 10px 28px rgba(194, 65, 12, 0.14)',
      },
    },
  },
  plugins: [],
};
