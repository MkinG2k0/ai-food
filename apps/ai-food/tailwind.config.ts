import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        kbju: {
          kcal: 'hsl(var(--kbju-kcal))',
          protein: 'hsl(var(--kbju-protein))',
          fat: 'hsl(var(--kbju-fat))',
          carbs: 'hsl(var(--kbju-carbs))',
          fiber: 'hsl(var(--kbju-fiber))',
          'kcal-soft': 'hsl(var(--kbju-kcal-soft))',
          'kcal-fg': 'hsl(var(--kbju-kcal-fg))',
          'kcal-border': 'hsl(var(--kbju-kcal-border))',
          'protein-soft': 'hsl(var(--kbju-protein-soft))',
          'protein-fg': 'hsl(var(--kbju-protein-fg))',
          'protein-border': 'hsl(var(--kbju-protein-border))',
          'fat-soft': 'hsl(var(--kbju-fat-soft))',
          'fat-fg': 'hsl(var(--kbju-fat-fg))',
          'fat-border': 'hsl(var(--kbju-fat-border))',
          'carbs-soft': 'hsl(var(--kbju-carbs-soft))',
          'carbs-fg': 'hsl(var(--kbju-carbs-fg))',
          'carbs-border': 'hsl(var(--kbju-carbs-border))',
          'fiber-soft': 'hsl(var(--kbju-fiber-soft))',
          'fiber-fg': 'hsl(var(--kbju-fiber-fg))',
          'fiber-border': 'hsl(var(--kbju-fiber-border))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
