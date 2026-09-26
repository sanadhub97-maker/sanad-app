import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "IBM Plex Sans Arabic", "Plus Jakarta Sans", "Cairo", "sans-serif"],
      },
      boxShadow: {
        luxury: "0 10px 30px -10px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.03)",
        "luxury-hover": "0 20px 35px -12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(37, 99, 235, 0.2)",
        "luxury-xl": "0 24px 48px -12px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.08)",
        "card-glass": "0 8px 32px 0 rgba(0, 0, 0, 0.06)",
        "glow-sm": "0 0 15px -3px rgba(37, 99, 235, 0.25)",
        "glow-blue": "0 0 20px -3px rgba(37, 99, 235, 0.35)",
        "glow-emerald": "0 0 20px -3px rgba(16, 185, 129, 0.35)",
        "glow-amber": "0 0 20px -3px rgba(245, 158, 11, 0.35)",
        specular: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.45)",
      },
      colors: {
        // Surfaces carry their own transparency for the glass look: --<name>-alpha (1 when unset)
        // multiplies any opacity modifier, so bg-card and bg-card/90 both come out as glass.
        border: "hsl(var(--border) / calc(<alpha-value> * var(--border-alpha, 1)))",
        input: "hsl(var(--input) / calc(<alpha-value> * var(--border-alpha, 1)))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background) / calc(<alpha-value> * var(--background-alpha, 1)))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / calc(<alpha-value> * var(--secondary-alpha, 1)))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / calc(<alpha-value> * var(--muted-alpha, 1)))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card) / calc(<alpha-value> * var(--card-alpha, 1)))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / calc(<alpha-value> * var(--popover-alpha, 1)))",
          foreground: "hsl(var(--popover-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
