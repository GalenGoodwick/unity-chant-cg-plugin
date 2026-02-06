import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        accent: "#0891b2",
        "accent-hover": "#0e7490",
        success: "#059669",
        warning: "#d97706",
        error: "#dc2626",
        surface: "#1a1a2e",
        "surface-hover": "#252540",
        border: "#2a2a4a",
        muted: "#9ca3af",
        gold: "#d4a843",
      },
    },
  },
  plugins: [],
} satisfies Config;
