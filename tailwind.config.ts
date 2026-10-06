import type { Config } from "tailwindcss";

// Design tokens live here, not scattered across components.
// Every color/spacing decision for the app traces back to this file.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0A0B0D", // page background
          panel: "#111318", // card / surface background
          raised: "#161920", // hover / raised surface
        },
        border: {
          DEFAULT: "#1F2329", // hairline border
          hover: "#2A2F38",
        },
        text: {
          primary: "#E4E6EA",
          muted: "#7A8088",
          faint: "#4B5058",
        },
        accent: {
          DEFAULT: "#5B8DEF", // signal blue — links, focus rings, primary actions
          muted: "#5B8DEF33",
        },
        status: {
          draft: "#7A8088",
          applied: "#5B8DEF",
          interviewing: "#E0A526",
          offered: "#3FB950",
          rejected: "#E5534B",
        },
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        lg: "12px",
      },
      boxShadow: {
        // subtle glow, used for hover/focus states — not a drop shadow
        glow: "0 0 0 1px var(--glow-color, rgba(91,141,239,0.4)), 0 0 16px -2px var(--glow-color, rgba(91,141,239,0.35))",
        "glow-sm": "0 0 0 1px var(--glow-color, rgba(91,141,239,0.3))",
      },
      spacing: {
        4.5: "1.125rem",
      },
    },
  },
  plugins: [],
};

export default config;
