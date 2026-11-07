import type { Config } from "tailwindcss";

// Every colour comes from the CSS variables in styles/tokens.css (blueprint §2.2). No hard-coded hex anywhere.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", s1: "var(--surface-1)", s2: "var(--surface-2)", line: "var(--border)",
        ink: "var(--text)", muted: "var(--text-muted)", primary: "var(--primary)", onprimary: "var(--on-primary)",
        ptext: "var(--primary-text)", psoft: "var(--primary-soft)", warn: "var(--warning)", danger: "var(--danger)", info: "var(--info)",
      },
      borderRadius: { card: "var(--radius-card)", input: "var(--radius-input)", pill: "var(--radius-pill)" },
      boxShadow: { glow: "var(--glow)", card: "var(--shadow-card)" },
      fontFamily: { heading: ["var(--font-heading)"], body: ["var(--font-body)"], mono: ["var(--font-mono)"] },
      fontSize: { xs: "12px", sm: "14px", base: "16px", xl: "20px", "2xl": "28px", "3xl": "40px" },
    },
  },
  plugins: [],
};
export default config;
