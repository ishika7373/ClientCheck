import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Resolved against this file, not the process working directory, so the config
// keeps working whatever directory the dev server is launched from.
const root = dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [join(root, "index.html"), join(root, "src/**/*.{ts,tsx}")],
  theme: {
    // Zero radius is a hard brand rule. The only exception is the framed icon
    // square, which is also square, so the scale collapses to 0 by design.
    borderRadius: { none: "0", DEFAULT: "0", sm: "0", md: "0", lg: "0", full: "0" },
    boxShadow: { none: "none", DEFAULT: "none" },
    extend: {
      colors: {
        dbg: "var(--dbg)",
        ds: "var(--ds)",
        de: "var(--de)",
        db: "var(--db)",
        dm: "var(--dm)",
        dsc: "var(--dsc)",
        dbd: "var(--dbd)",
        dh: "var(--dh)",
        o50: "var(--o50)",
        o100: "var(--o100)",
        o200: "var(--o200)",
        o400: "var(--o400)",
        o600: "var(--o600)",
        o800: "var(--o800)",
        o900: "var(--o900)",
        e400: "var(--e400)",
        e600: "var(--e600)",
        success: "var(--st-success)",
        warning: "var(--st-warning)",
        error: "var(--st-error)",
        info: "var(--st-info)",
        progress: "var(--st-progress)",
        review: "var(--st-review)",
      },
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        lora: ["Lora", "ui-serif", "Georgia", "serif"],
      },
      fontSize: {
        eyebrow: ["10px", { lineHeight: "14px", letterSpacing: "0.12em" }],
        "table-sm": ["13px", { lineHeight: "18px" }],
        table: ["14px", { lineHeight: "20px" }],
        body: ["14px", { lineHeight: "22px" }],
        "body-lg": ["15px", { lineHeight: "24px" }],
        page: ["30px", { lineHeight: "36px" }],
      },
      spacing: { 1: "8px", 2: "16px", 3: "24px", 4: "32px", 6: "48px", 8: "64px" },
      maxWidth: { shell: "1200px" },
      transitionDuration: { DEFAULT: "200ms" },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: { rise: "rise 200ms ease-out both" },
    },
  },
  plugins: [],
};
