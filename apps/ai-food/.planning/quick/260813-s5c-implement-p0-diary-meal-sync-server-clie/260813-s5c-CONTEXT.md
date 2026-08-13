# CONTEXT — 260813-s5c P0 diary meal sync

## Locked decisions (user 2026-08-13)

1. **Upsert on meal UI exit** — push meal to server when leaving meal detail / item-edit flow (`/meal/:id` and related edit screens). Do **NOT** sync on every field change while editing.
2. **Immediate sync on add** — after `addMeal` (save from scan/manual/barcode/favorite).
3. **Immediate sync on confirm-delete** — after user confirms delete.
4. **Full sync after login / auth hydrate** when `X-User-Token` is present.
5. **Guests** — local Preferences only; no diary sync without auth.
6. Follow `docs/USER-DATA-SYNC.md`: bulk `POST /user/meals/sync`, LWW on `clientUpdatedAt`, soft-delete, no photo blob upload, no subscription gate.

## Out of scope

Favorites, weight, settings, micronutrientTargets sync, image blob storage.
