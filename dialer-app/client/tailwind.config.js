/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Tektur',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        crokodial: {
          primary: '#1A1A1A', // Dark background
          secondary: '#2D2D2D', // Lighter background
          accent: '#FF0000', // Red accent
          text: '#FFFFFF', // White text
          muted: '#808080', // Gray text
          border: '#404040', // Border color
          background: '#000000', // Black background
        },
      },
      backgroundImage: {
        speckles: "url('/images/DIALER SPECKLES BACKGROUND .png')",
        base: "url('/images/DIALER BASE BACKGROUND.png')",
      },
    },
  },
  plugins: [],
};
