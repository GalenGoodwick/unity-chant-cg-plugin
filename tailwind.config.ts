import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // CG dark palette
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Brand (CG purple-blue)
        brand: {
          50: '#ecedf8',
          100: '#d9dbf2',
          200: '#b3b7e5',
          300: '#8d93d8',
          400: '#636cca',
          500: '#404bbb',
          600: '#333b94',
          700: '#272d72',
          800: '#1a1e4c',
          900: '#0d0f26',
          950: '#070813',
        },
        // Surfaces (CG dark shades)
        surface: '#15161e',
        'surface-hover': '#1b1d27',
        'surface-active': '#222430',
        border: '#282a39',
        'border-strong': '#393c51',
        muted: '#9094b0',
        subtle: '#636c8a',
        // Semantic
        accent: '#404bbb',
        'accent-hover': '#333b94',
        'accent-light': '#636cca',
        success: '#09b76e',
        'success-hover': '#079258',
        warning: '#f99100',
        'warning-hover': '#c77400',
        error: '#d32127',
        'error-hover': '#a81a1f',
        info: '#008ed6',
        gold: '#f99100',
      },
      borderRadius: {
        'cg': '9px',
        'cg-sm': '4px',
        'cg-md': '6px',
        'cg-lg': '12px',
        'cg-xl': '16px',
      },
      boxShadow: {
        'cg-sm': '0px 0px 1px rgba(0,0,0,0.2), 0px 1px 4px rgba(0,0,0,0.06)',
        'cg-md': '0px 0px 1px rgba(0,0,0,0.16), 0px 2px 10px rgba(0,0,0,0.08)',
        'cg-lg': '0px 0px 2px rgba(0,0,0,0.08), 0px 4px 16px rgba(0,0,0,0.16)',
        'cg-xl': '0px 0px 4px rgba(0,0,0,0.08), 0px 6px 32px rgba(0,0,0,0.16)',
      },
    },
  },
  plugins: [],
} satisfies Config;
