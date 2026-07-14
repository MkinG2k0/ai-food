# Add Food Bottom Sheet + Text Description Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/add` page with a bottom sheet (triggered by the Home "+" FAB) offering Gallery / Camera / Describe (free-text) input, and teach the backend to analyze a text description the same way it analyzes a photo.

**Architecture:** A new generic `BottomSheet` primitive in `shared/ui` hosts a new `AddFoodSheet` feature component that owns the existing gallery/camera file-input logic plus a new textarea-based describe mode. The add-food store gains a `description` field alongside `selectedImage`/`previewUrl`. `analyzeFoodApi`/`useAnalyzeFood` and the backend `/analyze-food` route are extended to accept either an image file or a text description and return the same `NutritionResult` shape either way. The `/add` route and `AddFoodPage` are deleted.

**Tech Stack:** React 18 + TypeScript, Zustand, TanStack Query, react-router-dom, framer-motion (already a dependency), Tailwind + `cva`/`cn()` (shadcn pattern), Express + multer + OpenAI SDK + Zod on the backend, Vitest + Testing Library (frontend) / Vitest + supertest (backend).

## Global Constraints

- Cross-slice imports MUST go through `index.ts` barrels (no deep imports like `@/features/add-food/ui/AddFoodSheet`).
- FSD layer order (high → low): `app → pages → widgets → features → entities → shared`. No same-layer cross-imports between features.
- Named function exports for components — no default exports (except Express routers, which stay `export default router`).
- 2-space indentation, single quotes, semicolons, trailing commas in multiline literals — match existing files.
- New shared UI primitives follow the shadcn pattern already used in `button.tsx`/`card.tsx`: `React.forwardRef`, `displayName`, `cn()` from `@/shared/lib`.
- Zustand stores hold client/UI state only; TanStack Query owns server state. Diary data stays local-only.
- API calls only through TanStack Query hooks (`useAnalyzeFood`), never ad-hoc fetches in components.
- OpenAI API key stays backend-only; never exposed to the client bundle.

---

### Task 1: Extend `useImageStore` with `description`

**Files:**
- Modify: `apps/mobile/src/features/add-food/model/useImageStore.ts`
- Modify: `apps/mobile/src/features/add-food/model/useImageStore.test.ts`

**Interfaces:**
- Produces: `useImageStore` state shape `{ selectedImage: File | null; previewUrl: string | null; description: string | null; setImage: (file: File) => void; setDescription: (text: string) => void; clear: () => void }`. All later tasks (`AddFoodSheet`, `ResultPage`, `useSaveMeal`) read/write these exact fields.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `apps/mobile/src/features/add-food/model/useImageStore.test.ts` with:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImageStore } from './useImageStore';

describe('useImageStore', () => {
  beforeEach(() => {
    useImageStore.setState({ selectedImage: null, previewUrl: null, description: null });
  });

  it('starts with no image and no description', () => {
    const { result } = renderHook(() => useImageStore());
    expect(result.current.selectedImage).toBeNull();
    expect(result.current.previewUrl).toBeNull();
    expect(result.current.description).toBeNull();
  });

  it('sets image and creates a blob preview URL', () => {
    const { result } = renderHook(() => useImageStore());
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });

    act(() => result.current.setImage(file));

    expect(result.current.selectedImage).toBe(file);
    expect(result.current.previewUrl).toMatch(/^blob:/);
  });

  it('sets description without touching image fields', () => {
    const { result } = renderHook(() => useImageStore());

    act(() => result.current.setDescription('cheeseburger with fries'));

    expect(result.current.description).toBe('cheeseburger with fries');
    expect(result.current.selectedImage).toBeNull();
    expect(result.current.previewUrl).toBeNull();
  });

  it('clears image, preview URL, and description', () => {
    const { result } = renderHook(() => useImageStore());
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });

    act(() => result.current.setImage(file));
    act(() => result.current.setDescription('cheeseburger'));
    act(() => result.current.clear());

    expect(result.current.selectedImage).toBeNull();
    expect(result.current.previewUrl).toBeNull();
    expect(result.current.description).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @ai-food/mobile test -- useImageStore.test.ts`
Expected: FAIL — `result.current.setDescription is not a function` (and `description` undefined instead of `null`).

- [ ] **Step 3: Implement `setDescription` and the `description` field**

Replace the full contents of `apps/mobile/src/features/add-food/model/useImageStore.ts` with:

```ts
import { create } from 'zustand';

interface ImageState {
  selectedImage: File | null;
  previewUrl: string | null;
  description: string | null;
  setImage: (file: File) => void;
  setDescription: (text: string) => void;
  clear: () => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  selectedImage: null,
  previewUrl: null,
  description: null,
  setImage: (file) => {
    const prev = get().previewUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ selectedImage: file, previewUrl: URL.createObjectURL(file) });
  },
  setDescription: (text) => {
    set({ description: text });
  },
  clear: () => {
    const prev = get().previewUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ selectedImage: null, previewUrl: null, description: null });
  },
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @ai-food/mobile test -- useImageStore.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/add-food/model/useImageStore.ts apps/mobile/src/features/add-food/model/useImageStore.test.ts
git commit -m "feat(add-food): add description field to useImageStore"
```

---

### Task 2: `shared/ui/textarea.tsx`

**Files:**
- Create: `apps/mobile/src/shared/ui/textarea.tsx`
- Modify: `apps/mobile/src/shared/ui/index.ts`

**Interfaces:**
- Consumes: `cn` from `@/shared/lib` (already exported, see `apps/mobile/src/shared/lib/index.ts:1`).
- Produces: `Textarea` component, `TextareaProps` type — a `forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>` that `AddFoodSheet` (Task 4) renders directly.

- [ ] **Step 1: Create the component**

Create `apps/mobile/src/shared/ui/textarea.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/shared/lib';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export { Textarea };
```

- [ ] **Step 2: Add to the barrel**

In `apps/mobile/src/shared/ui/index.ts`, add after the `Badge` export line:

```ts
export { Textarea, type TextareaProps } from './textarea';
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @ai-food/mobile type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/shared/ui/textarea.tsx apps/mobile/src/shared/ui/index.ts
git commit -m "feat(shared-ui): add Textarea component"
```

---

### Task 3: `shared/ui/bottom-sheet.tsx`

**Files:**
- Create: `apps/mobile/src/shared/ui/bottom-sheet.tsx`
- Modify: `apps/mobile/src/shared/ui/index.ts`

**Interfaces:**
- Consumes: `cn` from `@/shared/lib`; `framer-motion`'s `motion` and `AnimatePresence` (already in `apps/mobile/package.json` dependencies — verified via `grep "framer-motion" apps/mobile/package.json`).
- Produces: `BottomSheet` component with props `{ open: boolean; onClose: () => void; children: React.ReactNode }`. Task 4 (`AddFoodSheet`) renders its content inside this.

- [ ] **Step 1: Create the component**

Create `apps/mobile/src/shared/ui/bottom-sheet.tsx`:

```tsx
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-lg rounded-t-2xl bg-background p-4 pb-6 shadow-lg"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Add to the barrel**

In `apps/mobile/src/shared/ui/index.ts`, add:

```ts
export { BottomSheet } from './bottom-sheet';
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @ai-food/mobile type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/shared/ui/bottom-sheet.tsx apps/mobile/src/shared/ui/index.ts
git commit -m "feat(shared-ui): add BottomSheet component"
```

---

### Task 4: `AddFoodSheet` — replace `ImagePicker`

**Files:**
- Create: `apps/mobile/src/features/add-food/ui/AddFoodSheet.tsx`
- Delete: `apps/mobile/src/features/add-food/ui/ImagePicker.tsx`
- Modify: `apps/mobile/src/features/add-food/index.ts`

**Interfaces:**
- Consumes: `useImageStore` (Task 1) — `setImage`, `setDescription`; `BottomSheet` (Task 3), `Button`, `Textarea` (Task 2) from `@/shared/ui`; `useNavigate` from `react-router-dom`.
- Produces: `AddFoodSheet` component with props `{ open: boolean; onClose: () => void }`. Task 5 (`HomePage`) renders it.

- [ ] **Step 1: Create `AddFoodSheet.tsx`**

Create `apps/mobile/src/features/add-food/ui/AddFoodSheet.tsx`:

```tsx
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ImageIcon, PenLine } from 'lucide-react';
import { BottomSheet, Button, Textarea } from '@/shared/ui';
import { useImageStore } from '../model/useImageStore';

interface AddFoodSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AddFoodSheet({ open, onClose }: AddFoodSheetProps) {
  const navigate = useNavigate();
  const setImage = useImageStore((s) => s.setImage);
  const setDescription = useImageStore((s) => s.setDescription);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'menu' | 'describe'>('menu');
  const [text, setText] = useState('');

  function handleClose() {
    setMode('menu');
    setText('');
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      e.target.value = '';
      handleClose();
      navigate('/result');
    }
  }

  function handleDescribeSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setDescription(trimmed);
    handleClose();
    navigate('/result');
  }

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {mode === 'menu' && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-accent"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImageIcon className="h-5 w-5 text-emerald-600" />
            <span className="font-medium text-foreground">Choose from Gallery</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-accent"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-5 w-5 text-emerald-600" />
            <span className="font-medium text-foreground">Take Photo</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-accent"
            onClick={() => setMode('describe')}
          >
            <PenLine className="h-5 w-5 text-emerald-600" />
            <span className="font-medium text-foreground">Describe what you ate</span>
          </button>
        </div>
      )}

      {mode === 'describe' && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="flex items-center gap-2 self-start text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setMode('menu')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <Textarea
            autoFocus
            placeholder="e.g. Grilled chicken salad with rice"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button disabled={!text.trim()} onClick={handleDescribeSubmit}>
            Analyze
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Delete `ImagePicker.tsx`**

```bash
rm apps/mobile/src/features/add-food/ui/ImagePicker.tsx
```

- [ ] **Step 3: Update the barrel**

Replace the full contents of `apps/mobile/src/features/add-food/index.ts` with:

```ts
export { AddFoodSheet } from './ui/AddFoodSheet';
export { useImageStore } from './model/useImageStore';
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @ai-food/mobile type-check`
Expected: errors referencing `ImagePicker` in `apps/mobile/src/pages/add-food/ui/AddFoodPage.tsx` (this file is deleted in Task 6 — that's expected at this point). No other errors should reference `AddFoodSheet.tsx` itself.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/add-food/ui/AddFoodSheet.tsx apps/mobile/src/features/add-food/index.ts
git rm apps/mobile/src/features/add-food/ui/ImagePicker.tsx
git commit -m "feat(add-food): replace ImagePicker with AddFoodSheet (gallery/camera/describe)"
```

---

### Task 5: Wire `AddFoodSheet` into `HomePage`

**Files:**
- Modify: `apps/mobile/src/pages/home/ui/HomePage.tsx`

**Interfaces:**
- Consumes: `AddFoodSheet` from `@/features/add-food` (Task 4).

- [ ] **Step 1: Update `HomePage.tsx`**

Replace the full contents of `apps/mobile/src/pages/home/ui/HomePage.tsx` with:

```tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AddFoodSheet } from '@/features/add-food';
import { DailyHeader } from '@/widgets/daily-header';
import { MealList } from '@/widgets/meal-list';
import { Button } from '@/shared/ui';
import { getWeekDays, isSameDay } from '@/shared/lib';

export function HomePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);

  function handleWeekChange(delta: 1 | -1) {
    const newOffset = weekOffset + delta;
    setWeekOffset(newOffset);
    const newWeekDays = getWeekDays(newOffset);
    const stillInWeek = newWeekDays.some((d) => isSameDay(d, selectedDate));
    if (!stillInWeek) setSelectedDate(newWeekDays[0]);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DailyHeader
        selectedDate={selectedDate}
        weekOffset={weekOffset}
        onDaySelect={setSelectedDate}
        onWeekChange={handleWeekChange}
      />
      <main className="flex-1 px-4 py-4 pb-24">
        <MealList selectedDate={selectedDate} />
      </main>
      <div className="fixed bottom-6 right-6">
        <Button
          size="icon"
          className="rounded-full h-14 w-14 shadow-lg"
          onClick={() => setIsAddOpen(true)}
          aria-label="Add food"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
      <AddFoodSheet open={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @ai-food/mobile type-check`
Expected: same pre-existing errors from Task 4 Step 4 (referencing the not-yet-deleted `AddFoodPage.tsx`/`/add` route), no new errors from `HomePage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/pages/home/ui/HomePage.tsx
git commit -m "feat(home): open AddFoodSheet from the + FAB instead of navigating to /add"
```

---

### Task 6: Remove `/add` route and `AddFoodPage`

**Files:**
- Delete: `apps/mobile/src/pages/add-food/ui/AddFoodPage.tsx`
- Delete: `apps/mobile/src/pages/add-food/index.ts`
- Modify: `apps/mobile/src/app/router.tsx`

**Interfaces:**
- None produced — this is a pure removal task.

- [ ] **Step 1: Delete the page directory**

```bash
rm -rf apps/mobile/src/pages/add-food
```

- [ ] **Step 2: Update the router**

Replace the full contents of `apps/mobile/src/app/router.tsx` with:

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from '@/pages/home';
import { ResultPage } from '@/pages/result';
import { DiaryPage } from '@/pages/diary';
import { OnboardingPage } from '@/pages/onboarding';
import { MealDetailPage } from '@/pages/meal-detail';
import { ProfileGuard } from './ProfileGuard';

const router = createBrowserRouter([
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/', element: <ProfileGuard><HomePage /></ProfileGuard> },
  { path: '/result', element: <ProfileGuard><ResultPage /></ProfileGuard> },
  { path: '/diary', element: <ProfileGuard><DiaryPage /></ProfileGuard> },
  { path: '/meal/:id', element: <ProfileGuard><MealDetailPage /></ProfileGuard> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @ai-food/mobile type-check`
Expected: no errors. Deleting `AddFoodPage.tsx` also removes the "ImagePicker not exported" error introduced in Task 4 Step 4, since the only file referencing it is gone. `ResultPage.tsx`'s `navigate('/add')` calls are plain strings — react-router doesn't type-check route paths, so they compile fine even though `/add` no longer resolves to anything at runtime. That broken navigation is fixed in Task 9.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/app/router.tsx
git rm -r apps/mobile/src/pages/add-food
git commit -m "refactor(router): remove /add route and AddFoodPage"
```

---

### Task 7: `shared-types` — `AnalyzeFoodRequest` accepts image or description

**Files:**
- Modify: `packages/shared-types/src/index.ts:29-31`

**Interfaces:**
- Produces: `AnalyzeFoodRequest { image?: File; description?: string }`. Task 8 (`analyzeFoodApi`) uses this type as its input shape (informally — see note in Task 8).

- [ ] **Step 1: Update the type**

In `packages/shared-types/src/index.ts`, replace:

```ts
export interface AnalyzeFoodRequest {
  image: File;
}
```

with:

```ts
export interface AnalyzeFoodRequest {
  image?: File;
  description?: string;
}
```

- [ ] **Step 2: Type-check the whole workspace**

Run: `pnpm type-check`
Expected: no errors (this type isn't imported anywhere else yet — verified via `grep -rn "AnalyzeFoodRequest" apps/` returning no matches at the time of writing this plan).

- [ ] **Step 3: Commit**

```bash
git add packages/shared-types/src/index.ts
git commit -m "feat(shared-types): AnalyzeFoodRequest accepts image or description"
```

---

### Task 8: `analyzeFoodApi` + `useAnalyzeFood` accept image or description

**Files:**
- Modify: `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts`
- Modify: `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts`
- Modify: `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.test.ts` (existing file, not covered by the original spec — found during baseline verification; calls the old single-argument `useAnalyzeFood(image)` / `analyzeFoodApi(file)` signatures and must be updated in this task or it will fail after Step 1-2)

**Interfaces:**
- Consumes: `AnalyzeFoodResponse` from `@ai-food/shared-types` (unchanged).
- Produces: `analyzeFoodApi(input: { image: File | null; description: string | null }): Promise<AnalyzeFoodResponse>` and `useAnalyzeFood(input: { image: File | null; description: string | null })`. Task 9 (`ResultPage`) calls `useAnalyzeFood({ image: selectedImage, description })`.

- [ ] **Step 1: Update `analyzeFoodApi.ts`**

Replace the full contents of `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts` with:

```ts
import { apiClient } from '@/shared/api';
import type { AnalyzeFoodResponse } from '@ai-food/shared-types';

interface AnalyzeFoodInput {
  image: File | null;
  description: string | null;
}

export async function analyzeFoodApi(input: AnalyzeFoodInput): Promise<AnalyzeFoodResponse> {
  const formData = new FormData();
  if (input.image) {
    formData.append('image', input.image);
  } else if (input.description) {
    formData.append('description', input.description);
  }

  const response = await apiClient.post<AnalyzeFoodResponse>('/analyze-food', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}
```

- [ ] **Step 2: Update `useAnalyzeFood.ts`**

Replace the full contents of `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts` with:

```ts
import { useQuery } from '@tanstack/react-query';
import { analyzeFoodApi } from '../api/analyzeFoodApi';
import type { AnalyzeFoodResponse } from '@ai-food/shared-types';

interface UseAnalyzeFoodInput {
  image: File | null;
  description: string | null;
}

export function useAnalyzeFood(input: UseAnalyzeFoodInput) {
  return useQuery<AnalyzeFoodResponse, Error>({
    queryKey: [
      'analyze-food',
      input.image?.name,
      input.image?.size,
      input.image?.lastModified,
      input.description,
    ],
    queryFn: () => analyzeFoodApi(input),
    enabled: input.image !== null || !!input.description,
    staleTime: 0,
    retry: 2,
    gcTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 3: Update `useAnalyzeFood.test.ts`**

Replace the full contents of `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.test.ts` with:

```ts
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
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useAnalyzeFood', () => {
  beforeEach(() => {
    vi.mocked(analyzeFoodApiModule.analyzeFoodApi).mockResolvedValue(mockResponse);
  });

  it('is in idle state when image and description are both null', () => {
    const { result } = renderHook(() => useAnalyzeFood({ image: null, description: null }), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('fetches nutrition data when image is provided', async () => {
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });
    const { result } = renderHook(() => useAnalyzeFood({ image: file, description: null }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(analyzeFoodApiModule.analyzeFoodApi).toHaveBeenCalledWith({
      image: file,
      description: null,
    });
  });

  it('fetches nutrition data when only a description is provided', async () => {
    const { result } = renderHook(
      () => useAnalyzeFood({ image: null, description: 'a cheeseburger with fries' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(analyzeFoodApiModule.analyzeFoodApi).toHaveBeenCalledWith({
      image: null,
      description: 'a cheeseburger with fries',
    });
  });
});
```

- [ ] **Step 4: Run the analyze-food tests to verify they pass**

Run: `pnpm --filter @ai-food/mobile test -- useAnalyzeFood.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Type-check**

Run: `pnpm --filter @ai-food/mobile type-check`
Expected: errors now surface only from `apps/mobile/src/pages/result/ui/ResultPage.tsx` calling `useAnalyzeFood(selectedImage)` with the old single-argument signature — fixed in Task 9.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts apps/mobile/src/features/analyze-food/model/useAnalyzeFood.test.ts
git commit -m "feat(analyze-food): accept image or text description in the analyze request"
```

---

### Task 9: `ResultPage` supports the text-description flow

**Files:**
- Modify: `apps/mobile/src/pages/result/ui/ResultPage.tsx`

**Interfaces:**
- Consumes: `useImageStore` (Task 1) — `selectedImage`, `previewUrl`, `description`; `useAnalyzeFood({ image, description })` (Task 8).

- [ ] **Step 1: Update `ResultPage.tsx`**

Replace the full contents of `apps/mobile/src/pages/result/ui/ResultPage.tsx` with:

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useImageStore } from '@/features/add-food';
import { useAnalyzeFood } from '@/features/analyze-food';
import { useSaveMeal } from '@/features/save-meal';
import { NutritionCard } from '@/widgets/nutrition-card';
import { Button, Card, CardContent, Skeleton } from '@/shared/ui';

export function ResultPage() {
  const navigate = useNavigate();
  const { selectedImage, previewUrl, description } = useImageStore();
  const { data, isLoading, isError } = useAnalyzeFood({ image: selectedImage, description });
  const saveMeal = useSaveMeal();

  useEffect(() => {
    if (!selectedImage && !description) navigate('/', { replace: true });
  }, [selectedImage, description, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 py-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
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

        {!previewUrl && description && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">You described:</p>
              <p className="mt-1 text-foreground">{description}</p>
            </CardContent>
          </Card>
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
              onClick={() => navigate('/')}
            >
              Start Over
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
                onClick={() => navigate('/')}
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

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @ai-food/mobile type-check`
Expected: no errors anywhere in `apps/mobile`.

- [ ] **Step 3: Run the full mobile test suite**

Run: `pnpm --filter @ai-food/mobile test`
Expected: all existing tests pass (including the Task 1 `useImageStore` tests).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/pages/result/ui/ResultPage.tsx
git commit -m "feat(result): show description text and support text-only analysis flow"
```

---

### Task 10: Backend — text-description analysis branch

**Files:**
- Modify: `apps/backend/src/routes/analyze-food.ts`
- Modify: `apps/backend/src/routes/analyze-food.test.ts`

**Interfaces:**
- Produces: `POST /analyze-food` accepts either a multipart `image` file field (existing Vision flow, unchanged) or a multipart `description` text field (new text flow), both returning `AnalyzeFoodResponse`. Requests with neither now return `400 INVALID_INPUT` instead of `400 INVALID_IMAGE`.

- [ ] **Step 1: Write the failing tests**

In `apps/backend/src/routes/analyze-food.test.ts`, first update the existing "no file" test — replace:

```ts
  // ERR-03a: No file attached returns 400 INVALID_IMAGE
  it('ERR-03a: returns 400 with code INVALID_IMAGE when no image file attached', async () => {
    vi.mocked(OpenAI).mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    }) as unknown as OpenAI);

    const app = buildApp();

    const response = await request(app).post('/').set('Content-Type', 'multipart/form-data');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_IMAGE');
  });
```

with:

```ts
  // ERR-03a: Neither image nor description returns 400 INVALID_INPUT
  it('ERR-03a: returns 400 with code INVALID_INPUT when neither image nor description provided', async () => {
    vi.mocked(OpenAI).mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    }) as unknown as OpenAI);

    const app = buildApp();

    const response = await request(app).post('/').set('Content-Type', 'multipart/form-data');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_INPUT');
  });
```

Then append these two new test cases at the end of the `describe('POST /analyze-food', ...)` block, right before the final closing `});`:

```ts

  // AI-03: Text description returns 200 with the same NutritionResult shape as image analysis
  it('AI-03: returns 200 with a valid NutritionResult when only a description is provided', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: VALID_NUTRITION_JSON,
          },
        },
      ],
    });

    vi.mocked(OpenAI).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }) as unknown as OpenAI);

    const app = buildApp();

    const response = await request(app)
      .post('/')
      .field('description', 'a cheeseburger with fries');

    expect(response.status).toBe(200);
    const body = response.body as AnalyzeFoodResponse;
    expect(typeof body.result.foodName).toBe('string');
    expect(typeof body.processingTime).toBe('number');

    // The text flow must not send an image_url content part
    const call = mockCreate.mock.calls[0][0];
    const userMessage = call.messages.find((m: { role: string }) => m.role === 'user');
    expect(userMessage.content).toBe('a cheeseburger with fries');
  });

  // AI-04: Image takes precedence when both image and description are somehow provided
  it('AI-04: uses the image flow when both an image and a description are provided', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: VALID_NUTRITION_JSON,
          },
        },
      ],
    });

    vi.mocked(OpenAI).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }) as unknown as OpenAI);

    const app = buildApp();

    const response = await request(app)
      .post('/')
      .field('description', 'a cheeseburger with fries')
      .attach('image', FAKE_IMAGE, { filename: 'food.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(200);
    const call = mockCreate.mock.calls[0][0];
    const userMessage = call.messages.find((m: { role: string }) => m.role === 'user');
    expect(Array.isArray(userMessage.content)).toBe(true);
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `pnpm --filter @ai-food/backend test`
Expected: FAIL — `ERR-03a` fails because the route still returns `INVALID_IMAGE`; `AI-03` and `AI-04` fail because a description-only request currently returns 400.

- [ ] **Step 3: Implement the branch in `analyze-food.ts`**

Replace the full contents of `apps/backend/src/routes/analyze-food.ts` with:

```ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { z } from 'zod';
import type { AnalyzeFoodResponse, ApiError } from '@ai-food/shared-types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30_000,
  });
}

const NutritionResultSchema = z.object({
  foodName: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  confidence: z.number().min(0).max(1),
});

const IMAGE_SYSTEM_PROMPT = `You are a nutrition analysis assistant. Analyze the food in the image and return ONLY a JSON object with these exact fields:
{
  "foodName": string (name of the food in English),
  "calories": number (total kilocalories for a typical serving),
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "confidence": number (0.0 to 1.0, your confidence in the estimate)
}
Do not include any text outside the JSON object.`;

const TEXT_SYSTEM_PROMPT = `You are a nutrition analysis assistant. The user will describe in free text what they ate. Estimate nutrition for the meal they describe and return ONLY a JSON object with these exact fields:
{
  "foodName": string (name of the food in English),
  "calories": number (total kilocalories for a typical serving),
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "confidence": number (0.0 to 1.0, your confidence in the estimate)
}
Use typical serving sizes when the description is vague, and lower confidence accordingly. Do not include any text outside the JSON object.`;

function sendApiError(res: Response, status: number, code: string, message: string): void {
  const body: ApiError = { message, code, status };
  res.status(status).json(body);
}

// Wrap multer to convert its errors (e.g. missing boundary) into INVALID_INPUT responses
function uploadMiddleware(req: Request, res: Response, next: (err?: unknown) => void): void {
  upload.single('image')(req, res, (err) => {
    if (err) {
      sendApiError(res, 400, 'INVALID_INPUT', 'Please provide a photo or a description.');
      return;
    }
    next();
  });
}

router.post('/', uploadMiddleware, async (req: Request, res: Response) => {
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';

  if (!req.file && !description) {
    sendApiError(res, 400, 'INVALID_INPUT', 'Please provide a photo or a description.');
    return;
  }

  try {
    const startTime = Date.now();
    const completion = req.file
      ? await getOpenAIClient().chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: IMAGE_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
                  },
                },
                { type: 'text', text: 'Analyze this food image and return the nutrition data as JSON.' },
              ],
            },
          ],
        })
      : await getOpenAIClient().chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: TEXT_SYSTEM_PROMPT },
            { role: 'user', content: description },
          ],
        });
    const processingTime = Date.now() - startTime;

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      console.error('OpenAI returned empty content');
      sendApiError(res, 500, 'ANALYSIS_FAILED', 'Analysis returned empty response.');
      return;
    }

    let parsed;
    try {
      parsed = NutritionResultSchema.parse(JSON.parse(rawContent));
    } catch (validationError) {
      console.error('Zod/JSON parse error:', validationError);
      sendApiError(res, 500, 'ANALYSIS_FAILED', 'Analysis response did not match expected schema.');
      return;
    }

    const response: AnalyzeFoodResponse = { result: parsed, processingTime };
    res.json(response);
  } catch (error) {
    console.error('OpenAI API error:', error);

    if (error instanceof OpenAI.RateLimitError) {
      sendApiError(res, 429, 'RATE_LIMITED', 'OpenAI rate limit exceeded. Please try again later.');
      return;
    }
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      sendApiError(res, 504, 'ANALYSIS_TIMEOUT', 'Analysis timed out. Please try again.');
      return;
    }
    if (error instanceof OpenAI.BadRequestError) {
      sendApiError(res, 400, 'INVALID_IMAGE', 'The image could not be processed. Please try a different photo.');
      return;
    }
    sendApiError(res, 500, 'ANALYSIS_FAILED', 'Analysis failed. Please try again.');
  }
});

export default router;
```

Note: when both `req.file` and `description` are present, the image branch runs (matches Task 10 Step 1's `AI-04` test) — the frontend never sends both, but this is deterministic behavior if it ever happens.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @ai-food/backend test`
Expected: PASS (all 6 tests: AI-01, AI-02, ERR-03a through ERR-03d, plus new AI-03, AI-04 — 8 total).

- [ ] **Step 5: Type-check**

Run: `pnpm --filter @ai-food/backend type-check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/routes/analyze-food.ts apps/backend/src/routes/analyze-food.test.ts
git commit -m "feat(backend): analyze a text food description when no image is provided"
```

---

### Task 11: Full workspace verification

**Files:** none (verification only).

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: all tests pass across `apps/mobile` and `apps/backend`.

- [ ] **Step 2: Run full type-check**

Run: `pnpm type-check`
Expected: no errors across all workspaces.

- [ ] **Step 3: Manual verification via preview tools**

Start both dev servers (`mobile` on :5173, `backend` on :3001 — reuse `.claude/launch.json` configs already present). Using the preview browser tools:
1. Load `/`, confirm the "+" FAB opens the bottom sheet (no navigation to `/add` — that route no longer exists).
2. Click "Choose from Gallery" — confirm the hidden file input is triggered (can't complete a real OS file picker in headless preview, but confirm the sheet closes and no console errors appear when a `File` is programmatically dispatched via `preview_eval`, mirroring the approach used earlier in this session for the meal-card click).
3. Reopen the sheet, click "Describe what you ate" — confirm the textarea view appears, "Analyze" is disabled when empty, type text, click "Analyze" — confirm navigation to `/result` and that the typed text renders in the "You described:" card.
4. On `/result` with a description-only meal, confirm `isLoading`/`isError`/success states all render sensibly (backend calls will hit the real `/analyze-food` endpoint — if `OPENAI_API_KEY` isn't configured in `apps/backend/.env` for this environment, expect and document an `isError` state here rather than treating it as a regression; the backend unit tests in Task 10 already cover the branch logic with mocked OpenAI).
5. Confirm `preview_console_logs` and `preview_logs` (mobile + backend) show no new errors.

- [ ] **Step 4: Report results**

Summarize pass/fail for each check above. If `OPENAI_API_KEY` is missing and the text flow can't be verified end-to-end against the real API, state that explicitly rather than claiming full success.
