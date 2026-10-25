import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#064E3B", // Emerald 900 herbal pekat
          primary: "#065F46", // Emerald 800
          medium: "#059669", // Emerald 600
          light: "#D1FAE5", // Emerald 100
          subtle: "#ECFDF5", // Emerald 50
        },
        accent: {
          gold: "#D97706", // Amber 600 kunyit keemasan
          amber: "#F59E0B", // Amber 500
          light: "#FEF3C7", // Amber 100
        },
        fintech: {
          bg: "#F8FAFC", // Slate 50
          card: "#FFFFFF",
          border: "#E2E8F0", // Slate 200
          muted: "#64748B", // Slate 500
          dark: "#0F172A", // Slate 900
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "Plus Jakarta Sans", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Courier New", "monospace"],
      },
      boxShadow: {
        'soft-sm': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'soft-md': '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        'soft-lg': '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
      }
    },
  },
  plugins: [],
};
export default config;
