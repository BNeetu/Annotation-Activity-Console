/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // One accent color for "primary / selected / active" state
        // (selected row, focus rings, the "in progress" status badge),
        // distinct from Tailwind's default blue so it reads as this app's
        // own color rather than an unstyled default -- not a decorative
        // palette, just one consistent accent.
        navy: {
          50: "#EEF2F8",
          400: "#5A7DAE",
          500: "#385B8A",
          600: "#2A4569",
          700: "#1F3450",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        // A single soft shadow for cards/inputs -- not a multi-tier
        // elevation system, since nothing in this app needs more than one
        // level of "this is a raised surface."
        soft: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 4px 10px -2px rgb(15 23 42 / 0.08)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};