# CONTEXT — describe meal foodType icons

## Locked decisions (user 2026-08-20)

1. **Classification source:** Same text-analyze XML response — add `foodType` field. No extra classify API call. Vision / camera / gallery paths MUST NOT request or require `foodType`.
2. **Icon style:** Match friends `MealThumb` pattern (`features/friends/model/mealDaypart.ts` + `FriendProfileMeals.tsx`):
   - Pastel tile: `rounded-2xl` + `bg-*-100`
   - Lucide outline icon: `h-7 w-7` + `text-*-700`
   - Not emoji; not photo thumbnail when meal came from «Описать»
3. **When to show:** Text-only describe meals (no `imageUri`). After AI returns `foodType`, MealCard / meal detail thumb use mapped icon instead of generic `Utensils` (or photo placeholder). Photo meals unchanged.

## Scope hints

- Gateway: extend **text** nutrition XML schema + TEXT_SYSTEM_PROMPT enum for `foodType` only.
- Client: parse `foodType` → persist on `Meal` (e.g. `iconKey` / `foodType`); map enum → Lucide + tile/icon classes (reuse friends visual language).
- Sync: include new field in diary sync payload (metadata, not blob).
- Do not change friends daypart logic unless extracting shared thumb primitive is clearly cheaper.

## Out of scope

- Separate classify endpoint
- Generating real images / AI icons
- Changing photo meal thumbnails
