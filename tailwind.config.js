/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}", // Include components directory
    "./utils/translations/**/*.{js,ts,jsx,tsx}", // Include translations directory
  ],
  theme: {
    extend: {
      colors: {
        // Custom Nature/Heritage Palette (Sage/Teal based)
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488', // Primary Action
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        // Warm Paper Tones for backgrounds
        paper: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          800: '#292524',
          900: '#1c1917',
        }
      },
      fontFamily: {
        // Use CSS variables for dynamic font switching
        sans: ['var(--font-family-sans)', 'sans-serif'],
        serif: ['var(--font-family-serif)', 'serif'],
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'card': '0 2px 8px -2px rgba(0,0,0,0.05), 0 0 1px rgba(0,0,0,0.1)',
        'float': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }
    }
  },
  plugins: [],
}