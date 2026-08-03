# Add Food Bottom Sheet + Text Description — Design

## Problem

The current "Add Food" flow is a dedicated `/add` page (`AddFoodPage.tsx`) with an inline
dashed-box photo picker (`ImagePicker.tsx`) and two buttons: Gallery / Camera. This is a full
page navigation just to pick an input source, and there is no way to log a meal without a
photo.

## Goals

1. Replace the `/add` page with a bottom sheet triggered by the "+" FAB on `HomePage`.
2. The sheet offers three input methods: **Gallery**, **Camera**, **Describe** (free-text).
3. Text descriptions are analyzed by the backend the same way photos are, returning the same
   `NutritionResult` shape, so the rest of the app (ResultPage, save-to-diary) needs minimal
   changes.

## Non-goals

- Combining photo + text in a single analysis request.
- Editing/deleting a saved meal's input method after the fact.
- Any change to the diary list, meal detail page, or onboarding.

## Frontend

### Entry point — `HomePage.tsx`

- Remove `navigate('/add')` from the FAB `onClick`.
- Add local `const [isAddOpen, setIsAddOpen] = useState(false)`.
- FAB `onClick={() => setIsAddOpen(true)}`.
- Render `<AddFoodSheet open={isAddOpen} onClose={() => setIsAddOpen(false)} />`.

### `shared/ui/bottom-sheet.tsx` (new)

Generic reusable primitive:

- Props: `{ open: boolean; onClose: () => void; children: ReactNode }`.
- Backdrop (`fixed inset-0 bg-black/40`) + panel sliding up from the bottom
  (`framer-motion` `AnimatePresence`/`motion.div`, already a dependency).
- Rounded top corners, drag-handle bar for visual affordance.
- Closes on backdrop click and on `Escape` keydown.
- No business logic — pure layout/animation primitive, reusable elsewhere later.

### `shared/ui/textarea.tsx` (new)

- shadcn-style textarea matching `button.tsx` conventions (`forwardRef`, `cn()`,
  Tailwind classes consistent with existing inputs).

### `features/add-food/ui/AddFoodSheet.tsx` (new, replaces `ImagePicker.tsx`)

- Props: `{ open: boolean; onClose: () => void }`.
- Internal state: `mode: 'menu' | 'describe'` (reset to `'menu'` when `open` becomes `false`).
- **Menu mode:** three rows, each icon + label:
  - "Choose from Gallery" (`ImageIcon`) → triggers hidden `<input type=file accept=image/*>`.
  - "Take Photo" (`Camera`) → triggers hidden `<input type=file accept=image/* capture=environment>`.
  - "Describe what you ate" (`PenLine` or similar) → switches to `describe` mode.
  - File-select handler (ported from old `ImagePicker.handleFileChange`): `setImage(file)` on
    the store, `onClose()`, `navigate('/result')`.
- **Describe mode:** back-chevron to menu, `Textarea` (autofocus, placeholder e.g.
  "e.g. Grilled chicken salad with rice"), primary button "Analyze" disabled when text is
  empty/whitespace. On submit: `setDescription(text.trim())`, `onClose()`,
  `navigate('/result')`.
- `ImagePicker.tsx` is deleted; its file-input logic is absorbed into `AddFoodSheet`.

### Removed

- `src/pages/add-food/` (whole directory: `AddFoodPage.tsx`, `index.ts`).
- `/add` route entry and `AddFoodPage` import in `src/app/router.tsx`.

## State — `useImageStore` (`features/add-food/model/useImageStore.ts`)

Extend in place (name unchanged to minimize churn — it remains the add-food feature's input
store):

```ts
interface ImageState {
  selectedImage: File | null;
  previewUrl: string | null;
  description: string | null;
  setImage: (file: File) => void;
  setDescription: (text: string) => void;
  clear: () => void;
}
```

- `setImage` unchanged (revokes previous preview URL, sets `selectedImage`/`previewUrl`).
- `setDescription(text)` sets `description`; does not touch image fields.
- `clear()` resets both image fields and `description` to `null`.
- Selecting one input method does not clear the other — but the UI only ever calls one setter
  per session since `AddFoodSheet` navigates away immediately after selection.

## API contract

### `src/shared/types/index.ts`

```ts
export interface AnalyzeFoodRequest {
  image?: File;
  description?: string;
}
```

(`AnalyzeFoodResponse`, `NutritionResult` unchanged.)

### `features/analyze-food/api/analyzeFoodApi.ts`

```ts
export async function analyzeFoodApi(
  input: { image: File | null; description: string | null }
): Promise<AnalyzeFoodResponse> {
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

### `features/analyze-food/model/useAnalyzeFood.ts`

```ts
export function useAnalyzeFood(input: { image: File | null; description: string | null }) {
  return useQuery<AnalyzeFoodResponse, Error>({
    queryKey: ['analyze-food', input.image?.name, input.image?.size, input.image?.lastModified, input.description],
    queryFn: () => analyzeFoodApi(input),
    enabled: input.image !== null || !!input.description,
    staleTime: 0,
    retry: 2,
    gcTime: 5 * 60 * 1000,
  });
}
```

## `ResultPage.tsx`

- Reads `selectedImage, previewUrl, description` from `useImageStore`.
- Guard: `if (!selectedImage && !description) navigate('/', { replace: true })` (was `/add`,
  now removed).
- `useAnalyzeFood({ image: selectedImage, description })`.
- Preview block: if `previewUrl` → `<img>` as today; else if `description` → a `Card` showing
  the entered text (e.g. label "You described:" + the text, styled consistent with the
  existing preview area).
- All `navigate('/add')` calls (header back button, error retry, "Retake" button) become
  `navigate('/')`.

## `useSaveMeal.ts`

No structural change: `imageUri` stays `undefined` when `selectedImage` is `null` (text-only
flow), which the `Meal` type already supports (`imageUri?: string`).

## Backend — (удалён из репо; раньше `apps/backend/src/routes/analyze-food.ts`)

- `uploadMiddleware` (multer `.single('image')`) is unchanged — it already parses non-file
  text fields into `req.body` on `multipart/form-data` requests even when no file part is
  present, so `req.body.description` is available whether or not `image` was sent.
- Route handler branches:
  1. `req.file` present → existing Vision flow, byte-for-byte unchanged (same
     `SYSTEM_PROMPT`, `image_url` message).
  2. No `req.file`, but `req.body.description` is a non-empty string → new text flow:
     - New `TEXT_SYSTEM_PROMPT`:
       ```
       You are a nutrition analysis assistant. The user will describe in free text what they
       ate. Estimate nutrition for the meal they describe and return ONLY a JSON object with
       these exact fields:
       {
         "foodName": string (name of the food in English),
         "calories": number (total kilocalories for a typical serving),
         "protein": number (grams),
         "carbs": number (grams),
         "fat": number (grams),
         "fiber": number (grams),
         "confidence": number (0.0 to 1.0, your confidence in the estimate)
       }
       Use typical serving sizes when the description is vague, and lower confidence
       accordingly. Do not include any text outside the JSON object.
       ```
     - `chat.completions.create` call with `messages: [{ role: 'system', content:
       TEXT_SYSTEM_PROMPT }, { role: 'user', content: req.body.description }]` (no
       `image_url` part), same `model` and `response_format`.
     - Same `NutritionResultSchema` parse/validate and `AnalyzeFoodResponse` shape as the
       image flow.
  3. Neither `req.file` nor `req.body.description` → `sendApiError(res, 400, 'INVALID_INPUT',
     'Please provide a photo or a description.')`.
- All other error handling (rate limit, timeout, OpenAI bad-request, zod validation failure)
  is shared between both branches, unchanged in behavior.
- `INVALID_IMAGE` code is kept for the OpenAI `BadRequestError` case (image specifically
  rejected by the model) and for the file-processing failure case; `INVALID_INPUT` is new and
  only used for the "nothing provided" guard.

## Error handling summary

| Scenario | Status | Code |
|---|---|---|
| No image and no description in request | 400 | `INVALID_INPUT` |
| OpenAI rejects the image content | 400 | `INVALID_IMAGE` |
| OpenAI rate limit | 429 | `RATE_LIMITED` |
| OpenAI timeout | 504 | `ANALYSIS_TIMEOUT` |
| Empty/invalid OpenAI response (either flow) | 500 | `ANALYSIS_FAILED` |

Frontend does not currently branch on `ApiError.code` (verified — no references in
`src`), so these are purely for backend logging/clarity; no frontend changes are
required to consume the new code.

## Testing notes for the implementation plan

- `useImageStore.test.ts` (existing) needs new cases for `setDescription`/`clear` covering
  `description`.
- No existing tests cover `ImagePicker.tsx`/`AddFoodPage.tsx` — none to update for removal
  found via search.
- Manual verification via preview tools: FAB opens sheet, Gallery/Camera still trigger native
  pickers, Describe → text → Analyze reaches ResultPage showing the typed text, backend text
  flow returns a valid `NutritionResult` (requires `OPENAI_API_KEY` in backend `.env`; if
  unavailable, mock/stub for local verification and note the gap explicitly).
