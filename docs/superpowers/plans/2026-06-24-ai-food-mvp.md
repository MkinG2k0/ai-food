# AI Food MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable Turborepo monorepo with a mocked Express backend and a React mobile frontend that lets a user photograph food and see mocked nutrition results, persisted to a local diary.

**Architecture:** Feature-Sliced Design (FSD) in `apps/mobile/src/`. State split: Zustand for UI/local state (image selection, diary list), TanStack Query for all API calls. All HTTP through a centralized Axios client in `shared/api/`. React Router v6 for navigation.

**Tech Stack:** Turborepo 2, pnpm workspaces, React 18, TypeScript 5, Vite 5, TailwindCSS 3, shadcn/ui (manual install), TanStack Query v5, Zustand v5, Axios 1, React Router DOM v6, Express 4, tsx (backend runner), Vitest 2.

---

## File Map

```
ai-food/
├── .gitignore
├── .nvmrc
├── package.json                          # workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── packages/
│   └── shared-types/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/index.ts                  # FoodItem, Meal, NutritionResult, API types
├── apps/
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                  # Express server, CORS, port 3001
│   │       └── routes/analyze-food.ts   # POST /analyze-food, 1.5–3s mock
│   └── mobile/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── vite.config.ts
│       ├── vitest.config.ts
│       ├── postcss.config.js
│       ├── tailwind.config.ts
│       ├── components.json               # shadcn config
│       ├── index.html
│       └── src/
│           ├── main.tsx                  # Vite entry point
│           ├── test/setup.ts
│           ├── app/
│           │   ├── index.tsx             # App root
│           │   ├── providers.tsx         # QueryClient + Toaster
│           │   ├── router.tsx            # createBrowserRouter
│           │   └── styles/global.css     # Tailwind + shadcn CSS vars
│           ├── shared/
│           │   ├── api/client.ts         # Axios instance + interceptors
│           │   ├── lib/
│           │   │   ├── utils.ts          # cn() helper
│           │   │   ├── formatters.ts     # formatCalories, formatMacro, formatDate
│           │   │   └── formatters.test.ts
│           │   └── ui/                   # shadcn components (manual)
│           │       ├── index.ts          # barrel re-export
│           │       ├── button.tsx
│           │       ├── card.tsx
│           │       ├── skeleton.tsx
│           │       └── badge.tsx
│           ├── entities/
│           │   ├── meal/ui/MealCard.tsx
│           │   └── nutrition/ui/NutritionRow.tsx
│           ├── features/
│           │   ├── add-food/
│           │   │   ├── model/useImageStore.ts
│           │   │   ├── model/useImageStore.test.ts
│           │   │   └── ui/ImagePicker.tsx
│           │   ├── analyze-food/
│           │   │   ├── api/analyzeFoodApi.ts
│           │   │   ├── model/useAnalyzeFood.ts
│           │   │   └── model/useAnalyzeFood.test.ts
│           │   └── save-meal/
│           │       ├── model/useDiaryStore.ts
│           │       ├── model/useDiaryStore.test.ts
│           │       └── model/useSaveMeal.ts
│           ├── widgets/
│           │   ├── daily-header/ui/DailyHeader.tsx
│           │   ├── meal-list/ui/MealList.tsx
│           │   └── nutrition-card/ui/NutritionCard.tsx
│           └── pages/
│               ├── home/ui/HomePage.tsx
│               ├── add-food/ui/AddFoodPage.tsx
│               ├── result/ui/ResultPage.tsx
│               └── diary/ui/DiaryPage.tsx
```

---

## Task 1: Monorepo Root Configuration

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.nvmrc`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "ai-food",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "type-check": "turbo type-check"
  },
  "devDependencies": {
    "turbo": "^2.0.14"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.turbo/
*.local
.env
.DS_Store
```

- [ ] **Step 5: Create .nvmrc**

```
20
```

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: init monorepo root (Turborepo + pnpm)"
```

---

## Task 2: Shared Types Package

**Files:**
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/tsconfig.json`
- Create: `packages/shared-types/src/index.ts`

- [ ] **Step 1: Create packages/shared-types/package.json**

```json
{
  "name": "@ai-food/shared-types",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

- [ ] **Step 2: Create packages/shared-types/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/shared-types/src/index.ts**

```typescript
export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
}

export interface Meal {
  id: string;
  timestamp: string;
  items: FoodItem[];
  totalCalories: number;
}

export interface NutritionResult {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: number;
}

export interface AnalyzeFoodRequest {
  image: File;
}

export interface AnalyzeFoodResponse {
  result: NutritionResult;
  processingTime: number;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/
git commit -m "feat: add shared-types package"
```

---

## Task 3: Mock Backend Server

**Files:**
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/backend/src/index.ts`
- Create: `apps/backend/src/routes/analyze-food.ts`

- [ ] **Step 1: Create apps/backend/package.json**

```json
{
  "name": "@ai-food/backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@ai-food/shared-types": "workspace:*",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.14.10",
    "tsx": "^4.16.2",
    "typescript": "^5.5.3"
  }
}
```

- [ ] **Step 2: Create apps/backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create apps/backend/src/routes/analyze-food.ts**

```typescript
import { Router } from 'express';
import multer from 'multer';
import type { AnalyzeFoodResponse } from '@ai-food/shared-types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const MOCK_RESPONSE: AnalyzeFoodResponse = {
  result: {
    foodName: 'Grilled Chicken Salad',
    calories: 320,
    protein: 35,
    carbs: 18,
    fat: 12,
    fiber: 4,
    confidence: 0.89,
  },
  processingTime: 2100,
};

router.post('/', upload.single('image'), (_req, res) => {
  const delay = 1500 + Math.random() * 1500;
  setTimeout(() => {
    res.json(MOCK_RESPONSE);
  }, delay);
});

export default router;
```

- [ ] **Step 4: Create apps/backend/src/index.ts**

```typescript
import express from 'express';
import cors from 'cors';
import analyzeFoodRouter from './routes/analyze-food';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/analyze-food', analyzeFoodRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Mock backend running on http://localhost:${PORT}`);
});
```

- [ ] **Step 5: Smoke-test the backend**

```bash
cd apps/backend
pnpm install
pnpm dev
# In a second terminal:
curl -X POST http://localhost:3001/analyze-food
# Expected after 1.5–3s: {"result":{"foodName":"Grilled Chicken Salad",...},"processingTime":2100}
```

- [ ] **Step 6: Commit**

```bash
git add apps/backend/
git commit -m "feat: add mock Express backend (POST /analyze-food)"
```

---

## Task 4: Frontend Project Scaffolding

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/tsconfig.node.json`
- Create: `apps/mobile/vite.config.ts`
- Create: `apps/mobile/vitest.config.ts`
- Create: `apps/mobile/postcss.config.js`
- Create: `apps/mobile/tailwind.config.ts`
- Create: `apps/mobile/components.json`
- Create: `apps/mobile/index.html`
- Create: `apps/mobile/src/test/setup.ts`

- [ ] **Step 1: Create apps/mobile/package.json**

```json
{
  "name": "@ai-food/mobile",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@ai-food/shared-types": "workspace:*",
    "@radix-ui/react-slot": "^1.1.0",
    "@tanstack/react-query": "^5.51.1",
    "axios": "^1.7.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.408.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.24.1",
    "sonner": "^1.5.1",
    "tailwind-merge": "^2.4.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tanstack/react-query-devtools": "^5.51.1",
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.1.1",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.5.3",
    "vite": "^5.3.3",
    "vitest": "^2.0.3"
  }
}
```

- [ ] **Step 2: Create apps/mobile/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create apps/mobile/tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": [
    "vite.config.ts",
    "vitest.config.ts",
    "postcss.config.js",
    "tailwind.config.ts"
  ]
}
```

- [ ] **Step 4: Create apps/mobile/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
```

- [ ] **Step 5: Create apps/mobile/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 6: Create apps/mobile/postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Create apps/mobile/tailwind.config.ts**

```typescript
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
```

- [ ] **Step 8: Create apps/mobile/components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/styles/global.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/shared/ui",
    "utils": "@/shared/lib/utils",
    "ui": "@/shared/ui",
    "lib": "@/shared/lib",
    "hooks": "@/shared/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 9: Create apps/mobile/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥗</text></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#10b981" />
    <title>AI Food Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Create apps/mobile/src/test/setup.ts**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 11: Install dependencies from root**

```bash
# Run from monorepo root
pnpm install
```

Expected: pnpm resolves all workspaces and creates `node_modules` in each package with symlinks.

- [ ] **Step 12: Commit**

```bash
git add apps/mobile/
git commit -m "feat: scaffold mobile app (Vite + React + TypeScript + Tailwind)"
```

---

## Task 5: Global Styles + shadcn Components

**Files:**
- Create: `apps/mobile/src/app/styles/global.css`
- Create: `apps/mobile/src/shared/lib/utils.ts`
- Create: `apps/mobile/src/shared/ui/button.tsx`
- Create: `apps/mobile/src/shared/ui/card.tsx`
- Create: `apps/mobile/src/shared/ui/skeleton.tsx`
- Create: `apps/mobile/src/shared/ui/badge.tsx`
- Create: `apps/mobile/src/shared/ui/index.ts`

- [ ] **Step 1: Create apps/mobile/src/app/styles/global.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 160 84% 39%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 160 84% 39%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 160 84% 39%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 160 84% 39%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    -webkit-tap-highlight-color: transparent;
    overscroll-behavior: none;
  }
}
```

- [ ] **Step 2: Create apps/mobile/src/shared/lib/utils.ts**

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create apps/mobile/src/shared/ui/button.tsx**

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

- [ ] **Step 4: Create apps/mobile/src/shared/ui/card.tsx**

```tsx
import * as React from 'react';
import { cn } from '@/shared/lib/utils';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

- [ ] **Step 5: Create apps/mobile/src/shared/ui/skeleton.tsx**

```tsx
import { cn } from '@/shared/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
  );
}

export { Skeleton };
```

- [ ] **Step 6: Create apps/mobile/src/shared/ui/badge.tsx**

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

- [ ] **Step 7: Create apps/mobile/src/shared/ui/index.ts**

```typescript
export { Button, type ButtonProps, buttonVariants } from './button';
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';
export { Skeleton } from './skeleton';
export { Badge, type BadgeProps } from './badge';
```

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/app/ apps/mobile/src/shared/
git commit -m "feat: add global styles, shadcn components, and shared UI layer"
```

---

## Task 6: Shared API Client + Formatters

**Files:**
- Create: `apps/mobile/src/shared/api/client.ts`
- Create: `apps/mobile/src/shared/lib/formatters.ts`
- Create: `apps/mobile/src/shared/lib/formatters.test.ts`

- [ ] **Step 1: Write failing tests for formatters**

Create `apps/mobile/src/shared/lib/formatters.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatCalories, formatMacro, formatDate } from './formatters';

describe('formatCalories', () => {
  it('formats whole number', () => {
    expect(formatCalories(320)).toBe('320 kcal');
  });

  it('rounds decimals', () => {
    expect(formatCalories(320.7)).toBe('321 kcal');
  });

  it('formats zero', () => {
    expect(formatCalories(0)).toBe('0 kcal');
  });
});

describe('formatMacro', () => {
  it('formats whole grams', () => {
    expect(formatMacro(35)).toBe('35g');
  });

  it('rounds fractional grams', () => {
    expect(formatMacro(35.9)).toBe('36g');
  });
});

describe('formatDate', () => {
  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatDate('2026-06-24T10:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/mobile
pnpm test
# Expected: FAIL — "Cannot find module './formatters'"
```

- [ ] **Step 3: Create apps/mobile/src/shared/lib/formatters.ts**

```typescript
export function formatCalories(kcal: number): string {
  return `${Math.round(kcal)} kcal`;
}

export function formatMacro(grams: number): string {
  return `${Math.round(grams)}g`;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test
# Expected: PASS — 5 tests pass
```

- [ ] **Step 5: Create apps/mobile/src/shared/api/client.ts**

```typescript
import axios from 'axios';
import type { ApiError } from '@ai-food/shared-types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError: ApiError = {
      message: error.response?.data?.message ?? error.message ?? 'Unknown error',
      code: error.response?.data?.code ?? 'UNKNOWN',
      status: error.response?.status ?? 0,
    };
    return Promise.reject(apiError);
  }
);
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/shared/
git commit -m "feat: add Axios client and formatters with tests"
```

---

## Task 7: Zustand Stores

**Files:**
- Create: `apps/mobile/src/features/add-food/model/useImageStore.ts`
- Create: `apps/mobile/src/features/add-food/model/useImageStore.test.ts`
- Create: `apps/mobile/src/features/save-meal/model/useDiaryStore.ts`
- Create: `apps/mobile/src/features/save-meal/model/useDiaryStore.test.ts`

- [ ] **Step 1: Write failing tests for useImageStore**

Create `apps/mobile/src/features/add-food/model/useImageStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImageStore } from './useImageStore';

describe('useImageStore', () => {
  beforeEach(() => {
    useImageStore.setState({ selectedImage: null, previewUrl: null });
  });

  it('starts with no image', () => {
    const { result } = renderHook(() => useImageStore());
    expect(result.current.selectedImage).toBeNull();
    expect(result.current.previewUrl).toBeNull();
  });

  it('sets image and creates a blob preview URL', () => {
    const { result } = renderHook(() => useImageStore());
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });

    act(() => result.current.setImage(file));

    expect(result.current.selectedImage).toBe(file);
    expect(result.current.previewUrl).toMatch(/^blob:/);
  });

  it('clears image and preview URL', () => {
    const { result } = renderHook(() => useImageStore());
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });

    act(() => result.current.setImage(file));
    act(() => result.current.clear());

    expect(result.current.selectedImage).toBeNull();
    expect(result.current.previewUrl).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test
# Expected: FAIL — "Cannot find module './useImageStore'"
```

- [ ] **Step 3: Create apps/mobile/src/features/add-food/model/useImageStore.ts**

```typescript
import { create } from 'zustand';

interface ImageState {
  selectedImage: File | null;
  previewUrl: string | null;
  setImage: (file: File) => void;
  clear: () => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  selectedImage: null,
  previewUrl: null,
  setImage: (file) => {
    const prev = get().previewUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ selectedImage: file, previewUrl: URL.createObjectURL(file) });
  },
  clear: () => {
    const prev = get().previewUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ selectedImage: null, previewUrl: null });
  },
}));
```

- [ ] **Step 4: Write failing tests for useDiaryStore**

Create `apps/mobile/src/features/save-meal/model/useDiaryStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDiaryStore } from './useDiaryStore';
import type { Meal } from '@ai-food/shared-types';

const mockMeal: Meal = {
  id: '1',
  timestamp: '2026-06-24T10:00:00.000Z',
  items: [
    {
      id: 'item-1',
      name: 'Chicken Salad',
      calories: 320,
      protein: 35,
      carbs: 18,
      fat: 12,
      portion: '1 serving',
    },
  ],
  totalCalories: 320,
};

describe('useDiaryStore', () => {
  beforeEach(() => {
    useDiaryStore.setState({ meals: [] });
  });

  it('starts with empty meals', () => {
    const { result } = renderHook(() => useDiaryStore());
    expect(result.current.meals).toHaveLength(0);
  });

  it('adds a meal', () => {
    const { result } = renderHook(() => useDiaryStore());
    act(() => result.current.addMeal(mockMeal));
    expect(result.current.meals).toHaveLength(1);
    expect(result.current.meals[0]).toEqual(mockMeal);
  });

  it('prepends newer meals (newest first)', () => {
    const { result } = renderHook(() => useDiaryStore());
    const meal2: Meal = { ...mockMeal, id: '2', timestamp: '2026-06-24T11:00:00.000Z' };
    act(() => result.current.addMeal(mockMeal));
    act(() => result.current.addMeal(meal2));
    expect(result.current.meals[0].id).toBe('2');
    expect(result.current.meals[1].id).toBe('1');
  });

  it('clears all meals', () => {
    const { result } = renderHook(() => useDiaryStore());
    act(() => result.current.addMeal(mockMeal));
    act(() => result.current.clearDiary());
    expect(result.current.meals).toHaveLength(0);
  });
});
```

- [ ] **Step 5: Create apps/mobile/src/features/save-meal/model/useDiaryStore.ts**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Meal } from '@ai-food/shared-types';

interface DiaryState {
  meals: Meal[];
  addMeal: (meal: Meal) => void;
  clearDiary: () => void;
}

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set) => ({
      meals: [],
      addMeal: (meal) => set((state) => ({ meals: [meal, ...state.meals] })),
      clearDiary: () => set({ meals: [] }),
    }),
    { name: 'ai-food-diary' }
  )
);
```

- [ ] **Step 6: Run all tests — expect PASS**

```bash
pnpm test
# Expected: PASS — all store tests + formatter tests pass
```

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/features/add-food/ apps/mobile/src/features/save-meal/
git commit -m "feat: add Zustand stores (useImageStore, useDiaryStore) with tests"
```

---

## Task 8: analyze-food Feature

**Files:**
- Create: `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts`
- Create: `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts`
- Create: `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.test.ts`

- [ ] **Step 1: Write failing test for useAnalyzeFood**

Create `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAnalyzeFood } from './useAnalyzeFood';
import * as analyzeFoodApiModule from '../api/analyzeFoodApi';
import type { AnalyzeFoodResponse } from '@ai-food/shared-types';

vi.mock('../api/analyzeFoodApi');

const mockResponse: AnalyzeFoodResponse = {
  result: {
    foodName: 'Test Food',
    calories: 300,
    protein: 20,
    carbs: 30,
    fat: 10,
    fiber: 5,
    confidence: 0.92,
  },
  processingTime: 2000,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
}

describe('useAnalyzeFood', () => {
  beforeEach(() => {
    vi.mocked(analyzeFoodApiModule.analyzeFoodApi).mockResolvedValue(mockResponse);
  });

  it('is in pending/idle state when image is null', () => {
    const { result } = renderHook(() => useAnalyzeFood(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('fetches nutrition data when image is provided', async () => {
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });
    const { result } = renderHook(() => useAnalyzeFood(file), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(analyzeFoodApiModule.analyzeFoodApi).toHaveBeenCalledWith(file);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test
# Expected: FAIL — "Cannot find module './useAnalyzeFood'"
```

- [ ] **Step 3: Create apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts**

```typescript
import { apiClient } from '@/shared/api/client';
import type { AnalyzeFoodResponse } from '@ai-food/shared-types';

export async function analyzeFoodApi(image: File): Promise<AnalyzeFoodResponse> {
  const formData = new FormData();
  formData.append('image', image);

  const response = await apiClient.post<AnalyzeFoodResponse>('/analyze-food', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}
```

- [ ] **Step 4: Create apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts**

```typescript
import { useQuery } from '@tanstack/react-query';
import { analyzeFoodApi } from '../api/analyzeFoodApi';
import type { AnalyzeFoodResponse } from '@ai-food/shared-types';

export function useAnalyzeFood(image: File | null) {
  return useQuery<AnalyzeFoodResponse, Error>({
    queryKey: ['analyze-food', image?.name, image?.size, image?.lastModified],
    queryFn: () => analyzeFoodApi(image!),
    enabled: image !== null,
    staleTime: 30_000,
    retry: 2,
    gcTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm test
# Expected: PASS — all tests pass
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/analyze-food/
git commit -m "feat: add analyze-food API function and TanStack Query hook with tests"
```

---

## Task 9: save-meal Feature

**Files:**
- Create: `apps/mobile/src/features/save-meal/model/useSaveMeal.ts`

- [ ] **Step 1: Create apps/mobile/src/features/save-meal/model/useSaveMeal.ts**

```typescript
import { useNavigate } from 'react-router-dom';
import { useDiaryStore } from './useDiaryStore';
import { useImageStore } from '../../add-food/model/useImageStore';
import type { NutritionResult, Meal, FoodItem } from '@ai-food/shared-types';

export function useSaveMeal() {
  const addMeal = useDiaryStore((s) => s.addMeal);
  const clearImage = useImageStore((s) => s.clear);
  const navigate = useNavigate();

  return (result: NutritionResult) => {
    const item: FoodItem = {
      id: crypto.randomUUID(),
      name: result.foodName,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      portion: '1 serving',
    };

    const meal: Meal = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      items: [item],
      totalCalories: result.calories,
    };

    addMeal(meal);
    clearImage();
    navigate('/');
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/features/save-meal/model/useSaveMeal.ts
git commit -m "feat: add useSaveMeal hook"
```

---

## Task 10: Entity Components

**Files:**
- Create: `apps/mobile/src/entities/meal/ui/MealCard.tsx`
- Create: `apps/mobile/src/entities/nutrition/ui/NutritionRow.tsx`

- [ ] **Step 1: Create apps/mobile/src/entities/meal/ui/MealCard.tsx**

```tsx
import { Utensils } from 'lucide-react';
import type { Meal } from '@ai-food/shared-types';
import { Card, CardContent } from '@/shared/ui';
import { formatCalories } from '@/shared/lib/formatters';

interface MealCardProps {
  meal: Meal;
}

export function MealCard({ meal }: MealCardProps) {
  const time = new Date(meal.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <Utensils className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          {meal.items.map((item) => (
            <p key={item.id} className="text-sm font-medium truncate">
              {item.name}
            </p>
          ))}
          <p className="text-xs text-muted-foreground">{time}</p>
        </div>
        <p className="text-sm font-semibold text-emerald-600 flex-shrink-0">
          {formatCalories(meal.totalCalories)}
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create apps/mobile/src/entities/nutrition/ui/NutritionRow.tsx**

```tsx
interface NutritionRowProps {
  label: string;
  value: number;
  unit: string;
  max?: number;
  color?: string;
}

export function NutritionRow({
  label,
  value,
  unit,
  max = 100,
  color = 'bg-emerald-500',
}: NutritionRowProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {Math.round(value)}
          {unit}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/entities/
git commit -m "feat: add MealCard and NutritionRow entity components"
```

---

## Task 11: Widget Components

**Files:**
- Create: `apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx`
- Create: `apps/mobile/src/widgets/meal-list/ui/MealList.tsx`
- Create: `apps/mobile/src/widgets/nutrition-card/ui/NutritionCard.tsx`

- [ ] **Step 1: Create apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx**

```tsx
import { useDiaryStore } from '@/features/save-meal/model/useDiaryStore';
import { formatCalories } from '@/shared/lib/formatters';

const DAILY_GOAL = 2000;

export function DailyHeader() {
  const meals = useDiaryStore((s) => s.meals);

  const today = new Date().toDateString();
  const todayCalories = meals
    .filter((m) => new Date(m.timestamp).toDateString() === today)
    .reduce((sum, m) => sum + m.totalCalories, 0);

  const remaining = DAILY_GOAL - todayCalories;
  const progress = Math.min((todayCalories / DAILY_GOAL) * 100, 100);

  return (
    <header className="bg-emerald-500 text-white px-4 pt-12 pb-6">
      <p className="text-emerald-100 text-sm font-medium">Today</p>
      <p className="text-4xl font-bold mt-1">{formatCalories(todayCalories)}</p>
      <p className="text-emerald-100 text-sm mt-1">
        {remaining > 0
          ? `${Math.round(remaining)} kcal remaining`
          : `${Math.round(Math.abs(remaining))} kcal over goal`}
      </p>
      <div className="mt-4 h-1.5 bg-emerald-400 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create apps/mobile/src/widgets/meal-list/ui/MealList.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import { useDiaryStore } from '@/features/save-meal/model/useDiaryStore';
import { MealCard } from '@/entities/meal/ui/MealCard';
import { Button } from '@/shared/ui';

export function MealList() {
  const navigate = useNavigate();
  const meals = useDiaryStore((s) => s.meals);

  const today = new Date().toDateString();
  const todayMeals = meals.filter(
    (m) => new Date(m.timestamp).toDateString() === today
  );

  if (todayMeals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <p className="text-base font-medium">No meals tracked today</p>
        <p className="text-sm mt-1">Tap + to add your first meal</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-foreground">Today's Meals</h2>
        <Button variant="ghost" size="sm" onClick={() => navigate('/diary')}>
          View All
        </Button>
      </div>
      {todayMeals.map((meal) => (
        <MealCard key={meal.id} meal={meal} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create apps/mobile/src/widgets/nutrition-card/ui/NutritionCard.tsx**

```tsx
import type { NutritionResult } from '@ai-food/shared-types';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/shared/ui';
import { NutritionRow } from '@/entities/nutrition/ui/NutritionRow';
import { formatCalories } from '@/shared/lib/formatters';

interface NutritionCardProps {
  result: NutritionResult;
}

export function NutritionCard({ result }: NutritionCardProps) {
  const confidencePct = Math.round(result.confidence * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{result.foodName}</CardTitle>
          <Badge variant="secondary" className="flex-shrink-0">
            {confidencePct}% match
          </Badge>
        </div>
        <p className="text-3xl font-bold text-emerald-600 mt-1">
          {formatCalories(result.calories)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <NutritionRow
          label="Protein"
          value={result.protein}
          unit="g"
          max={60}
          color="bg-blue-500"
        />
        <NutritionRow
          label="Carbohydrates"
          value={result.carbs}
          unit="g"
          max={150}
          color="bg-amber-500"
        />
        <NutritionRow
          label="Fat"
          value={result.fat}
          unit="g"
          max={80}
          color="bg-red-400"
        />
        <NutritionRow
          label="Fiber"
          value={result.fiber}
          unit="g"
          max={30}
          color="bg-green-500"
        />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/widgets/
git commit -m "feat: add DailyHeader, MealList, NutritionCard widgets"
```

---

## Task 12: add-food Feature UI

**Files:**
- Create: `apps/mobile/src/features/add-food/ui/ImagePicker.tsx`

- [ ] **Step 1: Create apps/mobile/src/features/add-food/ui/ImagePicker.tsx**

```tsx
import { useRef } from 'react';
import { Camera, ImageIcon } from 'lucide-react';
import { Button } from '@/shared/ui';

interface ImagePickerProps {
  onImageSelect: (file: File) => void;
}

export function ImagePicker({ onImageSelect }: ImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
      e.target.value = '';
    }
  };

  const openPicker = () => fileInputRef.current?.click();

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <button
        type="button"
        className="w-full h-64 border-2 border-dashed border-muted-foreground/30 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
        onClick={openPicker}
      >
        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-emerald-600" />
        </div>
        <div className="text-center px-4">
          <p className="font-medium text-foreground">Tap to select a photo</p>
          <p className="text-sm text-muted-foreground mt-1">JPG, PNG, HEIC supported</p>
        </div>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1" onClick={openPicker}>
          <ImageIcon className="h-4 w-4 mr-2" />
          Gallery
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.setAttribute('capture', 'environment');
              fileInputRef.current.click();
              fileInputRef.current.removeAttribute('capture');
            }
          }}
        >
          <Camera className="h-4 w-4 mr-2" />
          Camera
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/features/add-food/ui/
git commit -m "feat: add ImagePicker UI component"
```

---

## Task 13: Page Components

**Files:**
- Create: `apps/mobile/src/pages/home/ui/HomePage.tsx`
- Create: `apps/mobile/src/pages/add-food/ui/AddFoodPage.tsx`
- Create: `apps/mobile/src/pages/result/ui/ResultPage.tsx`
- Create: `apps/mobile/src/pages/diary/ui/DiaryPage.tsx`

- [ ] **Step 1: Create apps/mobile/src/pages/home/ui/HomePage.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DailyHeader } from '@/widgets/daily-header/ui/DailyHeader';
import { MealList } from '@/widgets/meal-list/ui/MealList';
import { Button } from '@/shared/ui';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DailyHeader />
      <main className="flex-1 px-4 py-4 pb-24">
        <MealList />
      </main>
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg"
          onClick={() => navigate('/add')}
          aria-label="Add food"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create apps/mobile/src/pages/add-food/ui/AddFoodPage.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ImagePicker } from '@/features/add-food/ui/ImagePicker';
import { useImageStore } from '@/features/add-food/model/useImageStore';
import { Button } from '@/shared/ui';

export function AddFoodPage() {
  const navigate = useNavigate();
  const setImage = useImageStore((s) => s.setImage);

  const handleImageSelect = (file: File) => {
    setImage(file);
    navigate('/result');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 py-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2">Add Food</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <ImagePicker onImageSelect={handleImageSelect} />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create apps/mobile/src/pages/result/ui/ResultPage.tsx**

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useImageStore } from '@/features/add-food/model/useImageStore';
import { useAnalyzeFood } from '@/features/analyze-food/model/useAnalyzeFood';
import { useSaveMeal } from '@/features/save-meal/model/useSaveMeal';
import { NutritionCard } from '@/widgets/nutrition-card/ui/NutritionCard';
import { Button, Skeleton } from '@/shared/ui';

export function ResultPage() {
  const navigate = useNavigate();
  const { selectedImage, previewUrl } = useImageStore();
  const { data, isLoading, isError } = useAnalyzeFood(selectedImage);
  const saveMeal = useSaveMeal();

  useEffect(() => {
    if (!selectedImage) navigate('/add', { replace: true });
  }, [selectedImage, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 py-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate('/add')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2">Analysis Result</h1>
      </header>

      <main className="flex-1 px-4 py-6 space-y-4 max-w-lg mx-auto w-full">
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Food preview"
            className="w-full h-48 object-cover rounded-xl"
          />
        )}

        {isLoading && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" />
              <span className="text-sm text-muted-foreground">Analyzing your food…</span>
            </div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {isError && (
          <div className="text-center py-8">
            <p className="font-medium text-destructive">Analysis failed</p>
            <p className="text-sm text-muted-foreground mt-1">Please try again</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/add')}
            >
              Retake Photo
            </Button>
          </div>
        )}

        {data && (
          <>
            <NutritionCard result={data.result} />
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/add')}
              >
                Retake
              </Button>
              <Button className="flex-1" onClick={() => saveMeal(data.result)}>
                Save to Diary
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Create apps/mobile/src/pages/diary/ui/DiaryPage.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDiaryStore } from '@/features/save-meal/model/useDiaryStore';
import { MealCard } from '@/entities/meal/ui/MealCard';
import { Button } from '@/shared/ui';
import { formatDate } from '@/shared/lib/formatters';
import type { Meal } from '@ai-food/shared-types';

export function DiaryPage() {
  const navigate = useNavigate();
  const meals = useDiaryStore((s) => s.meals);

  const grouped = meals.reduce<Record<string, Meal[]>>((acc, meal) => {
    const date = formatDate(meal.timestamp);
    (acc[date] ??= []).push(meal);
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 py-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2">Food Diary</h1>
      </header>

      <main className="flex-1 px-4 py-4">
        {meals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg font-medium">No meals yet</p>
            <p className="text-sm mt-1">Add your first meal to get started</p>
            <Button className="mt-4" onClick={() => navigate('/add')}>
              Add Food
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, dateMeals]) => (
              <div key={date}>
                <h2 className="text-sm font-medium text-muted-foreground mb-3">{date}</h2>
                <div className="space-y-3">
                  {dateMeals.map((meal) => (
                    <MealCard key={meal.id} meal={meal} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/pages/
git commit -m "feat: add Home, AddFood, Result, and Diary pages"
```

---

## Task 14: App Layer (Providers + Router + Entry)

**Files:**
- Create: `apps/mobile/src/app/providers.tsx`
- Create: `apps/mobile/src/app/router.tsx`
- Create: `apps/mobile/src/app/index.tsx`
- Create: `apps/mobile/src/main.tsx`

- [ ] **Step 1: Create apps/mobile/src/app/providers.tsx**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" richColors />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Create apps/mobile/src/app/router.tsx**

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from '@/pages/home/ui/HomePage';
import { AddFoodPage } from '@/pages/add-food/ui/AddFoodPage';
import { ResultPage } from '@/pages/result/ui/ResultPage';
import { DiaryPage } from '@/pages/diary/ui/DiaryPage';

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/add', element: <AddFoodPage /> },
  { path: '/result', element: <ResultPage /> },
  { path: '/diary', element: <DiaryPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 3: Create apps/mobile/src/app/index.tsx**

```tsx
import { Providers } from './providers';
import { AppRouter } from './router';

export function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}
```

- [ ] **Step 4: Create apps/mobile/src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/index';
import './app/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/app/ apps/mobile/src/main.tsx
git commit -m "feat: wire app layer (providers, router, entry point)"
```

---

## Task 15: End-to-End Verification

- [ ] **Step 1: Install all dependencies from monorepo root**

```bash
# From D:/Project/Main/ai-food
pnpm install
```

Expected: all workspace packages linked, no errors.

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected output (all green):
```
✓ shared/lib/formatters.test.ts (5 tests)
✓ features/add-food/model/useImageStore.test.ts (3 tests)
✓ features/save-meal/model/useDiaryStore.test.ts (4 tests)
✓ features/analyze-food/model/useAnalyzeFood.test.ts (2 tests)
```

- [ ] **Step 3: Start both apps**

```bash
pnpm dev
```

Expected: Turbo starts both `apps/backend` (port 3001) and `apps/mobile` (port 5173).

- [ ] **Step 4: Test the full user flow**

Open `http://localhost:5173` in a browser and verify:

1. **Home page** loads with emerald header showing "0 kcal" and "No meals tracked today"
2. Tap the **green + FAB** → navigates to `/add`
3. **Add Food page** shows the image picker drop zone with Gallery and Camera buttons
4. Click **Gallery** → file picker opens → select any image
5. App navigates to `/result` immediately
6. **Result page** shows the food photo and the animated "Analyzing your food…" skeleton
7. After 1.5–3 seconds, the **NutritionCard** appears:
   - Title: "Grilled Chicken Salad"
   - Calories: "320 kcal"
   - Protein, Carbs, Fat, Fiber rows with color bars
   - Confidence badge: "89% match"
8. Tap **"Save to Diary"** → navigates back to Home
9. **Home page** now shows "320 kcal" in the header and the saved meal in the list
10. Tap **"View All"** → Diary page shows the meal grouped by today's date

- [ ] **Step 5: Verify backend independently**

```bash
curl -s http://localhost:3001/health
# Expected: {"status":"ok"}

curl -s -X POST http://localhost:3001/analyze-food
# Expected after 1.5–3s: {"result":{"foodName":"Grilled Chicken Salad",...},"processingTime":2100}
```

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete AI Food MVP — working monorepo with mock backend and FSD frontend"
```

---

## Self-Review Checklist

| Requirement | Task |
|---|---|
| Turborepo + pnpm monorepo | Task 1 |
| Shared TypeScript types package | Task 2 |
| Express mock POST /analyze-food with 1.5–3s delay | Task 3 |
| Vite + React + TypeScript frontend | Task 4 |
| TailwindCSS + shadcn/ui design system | Task 5 |
| Axios centralized API client | Task 6 |
| Zustand useImageStore (camera state) | Task 7 |
| Zustand useDiaryStore (persisted diary) | Task 7 |
| TanStack Query useAnalyzeFood hook | Task 8 |
| useSaveMeal — builds Meal from result | Task 9 |
| MealCard entity component | Task 10 |
| NutritionRow entity component | Task 10 |
| DailyHeader widget | Task 11 |
| MealList widget | Task 11 |
| NutritionCard widget | Task 11 |
| ImagePicker feature UI | Task 12 |
| Home / AddFood / Result / Diary pages | Task 13 |
| React Router v6 routing | Task 14 |
| FSD layer separation enforced | All tasks |
| Tests for stores, hook, formatters | Tasks 6–8 |
| `pnpm dev` starts both services | Task 15 |
