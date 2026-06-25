/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        light: {
          ...require('daisyui/src/theming/themes')['light'],
          primary: '#2563eb',
          secondary: '#0891b2',
          accent: '#06b6d4',
          neutral: '#0f172a',
          'base-100': '#ffffff',
          'base-200': '#f8fafc',
          'base-300': '#e2e8f0',
          info: '#0284c7',
          success: '#16a34a',
          warning: '#f59e0b',
          error: '#dc2626',
        },
      },
    ],
  },
};
