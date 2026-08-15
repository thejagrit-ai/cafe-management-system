/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "15px",
      screens: {
        "2xl": "1360px",
      },
    },
    screens: {
      sm: "640px",
      md: "768px",
      lg: "960px",
      xl: "1430px",
    },
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        inter: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        editorial: ['"Cormorant Upright"', 'Georgia', 'serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#7C4EEE',
          600: '#683bd6',
          700: '#5529bc',
          800: '#46229b',
          900: '#3a1e7d',
        },
        // Palette ported from the CoffeeShop-NextJS-Webpage design (MIT).
        // Used directly on the customer-facing pages; the shadcn HSL tokens
        // above are what admin and staff screens keep using.
        brand: {
          ink: '#100e0e',
          muted: '#787f8a',
          gold: '#c7a17a',
          'gold-dark': '#a08161',
          cream: '#f7f3ee',
        },
        cafe: {
          50: '#fdfbf7',
          100: '#f6f0e7',
          200: '#ede0cf',
          300: '#dbc4a7',
          400: '#c5a37f',
          500: '#b0845a',
          600: '#956743',
          700: '#774e34',
          800: '#543725',
          900: '#362217',
          950: '#1e120c',
        },
        obsidian: {
          50: '#f6f6f8',
          100: '#ececf0',
          200: '#d5d4de',
          300: '#b1afc3',
          400: '#8783a3',
          500: '#676288',
          600: '#514c6e',
          700: '#423e5a',
          800: '#242232',
          900: '#1a1824',
          950: '#121118',
        }
      },
      borderRadius: {
        '2xl': "1.25rem",
        xl: "1rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'card': '0 4px 20px -2px rgba(18, 17, 24, 0.05), 0 2px 6px -1px rgba(18, 17, 24, 0.03)',
        'card-hover': '0 10px 30px -4px rgba(18, 17, 24, 0.08), 0 4px 12px -2px rgba(18, 17, 24, 0.04)',
        'violet-glow': '0 0 25px -5px rgba(124, 78, 238, 0.35)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "float": "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}