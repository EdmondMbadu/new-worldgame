/** @type {import('tailwindcss').Config} */




module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        Nunito: ['Nunito', 'sans-serif'],
       },
      colors:{
        worldmain:'#D7EEEF',
        worldsecond:'#865B4C'
      
      }
    },
  },
  plugins: [],
}

