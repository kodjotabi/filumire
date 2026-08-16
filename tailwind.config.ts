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
        filumire: {
          navy: "#0f172a",
          slate: "#1e293b",
          accent: "#2563eb",
          verified: "#059669",
          pending: "#d97706",
          rejected: "#dc2626",
          muted: "#64748b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
