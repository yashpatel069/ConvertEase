/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        midnight: '#161616',
        'orange-accent': '#F44A22',
        silver: '#FEF8E8',
        'grey-surface': '#E4E2E3',
        'stone-accent': '#A8AAAC',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      borderRadius: {
        'btn': '12px',
        'card': '16px',
      },
      boxShadow: {
        'subtle': '0 4px 14px 0 rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
