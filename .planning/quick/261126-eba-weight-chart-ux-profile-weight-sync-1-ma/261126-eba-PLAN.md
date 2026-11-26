---
phase: 261126-eba-weight-chart-ux-profile-weight-sync-1-ma
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ai-food/src/features/stats/model/useWeightStore.ts
  - apps/ai-food/src/features/stats/model/useWeightStore.test.ts
  - apps/ai-food/src/features/weight-sync/model/weightSyncMerge.ts
  - apps/ai-food/src/features/weight-sync/model/weightSyncMerge.test.ts
  - apps/ai-food/src/features/weight-sync/model/syncWeightHistory.ts
  - apps/ai-food/src/features/weight-sync/model/syncWeightHistory.test.ts
  - apps/ai-food/src/features/stats/model/weightProgress.ts
  - apps/ai-food/src/features/stats/ui/WeightTrendChart.tsx
  - apps/ai-food/src/features/stats/ui/WeightEntryDetailSheet.tsx
  - apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx
  - apps/ai-food/src/features/stats/index.ts
  - apps/ai-food/src/pages/settings/ui/SettingsPage.tsx
  - apps/ai-food/src/features/auth/model/clearLocalUserDataOnSignOut.ts
autonomous: true
requirements:
  - D-01
  - D-02
  - D-03
  - D-04

estimate:
  tokens: 28000
  raw_tokens: 28000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "User can tap a fact weight point on the stats chart and see exact kg and Russian date (D-01)."
    - "From that detail UI, user can confirm-delete the entry; chart and local store update immediately (D-02)."
    - "Delete sends a weight sync tombstone via existing POST /user/weights/sync deletes[] when logged in (D-03)."
    - "Settings profile row «Вес» shows latestWeightKg(entries) by date, not a stale onboarding profile.weight alone (D-04)."
  artifacts:
    - path: apps/ai-food/src/features/stats/model/useWeightStore.ts
      provides: "recordPendingDelete + pendingDeletes mirrored from diary tombstone pattern"
    - path: apps/ai-food/src/features/stats/ui/WeightEntryDetailSheet.tsx
      provides: "BottomSheet with kg, date, and delete confirm flow"
    - path: apps/ai-food/src/features/weight-sync/model/syncWeightHistory.ts
      provides: "Forwards pendingDeletes to syncWeightsApi and clears them after success"
    - path: apps/ai-food/src/pages/settings/ui/SettingsPage.tsx
      provides: "Displays latest logged weight for the Вес row"
  key_links:
    - from: WeightTrendChart circle hit target
      to: WeightEntryDetailSheet
      via: "onPointSelect(entryId) from WeightProgressCard (D-01)"
    - from: recordPendingDelete
      to: syncWeightsApi deletes[]
      via: "queueWeightSync after local removal (D-03)"
    - from: useWeightStore.entries
      to: SettingsPage Вес row and profile.weight
      via: "latestWeightKg + updateProfile on log/delete (D-04)"
---

<objective>
Make own-weight chart points inspectable and deletable, wire delete through existing weight sync tombstones, and make Settings «Вес» reflect the latest logged entry (D-01–D-04).

Purpose: Fix mistaken logs and stale profile weight without redesigning friends/report charts.
Output: Tappable chart detail + confirm delete + store/sync tombstones + Settings/profile current weight from log.
</objective>

<execution_context>
@C:/Users/mk/.cursor/gsd-core/workflows/execute-plan.md
@C:/Users/mk/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/261126-eba-weight-chart-ux-profile-weight-sync-1-ma/META.json
@apps/ai-food/src/features/stats/ui/WeightTrendChart.tsx
@apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx
@apps/ai-food/src/features/stats/model/useWeightStore.ts
@apps/ai-food/src/features/weight-sync/model/syncWeightHistory.ts
@apps/ai-food/src/features/weight-sync/model/weightSyncMerge.ts
@apps/ai-food/src/features/weight-sync/api/syncWeightsApi.ts
@apps/ai-food/src/features/delete-meal/ui/DeleteMealConfirmSheet.tsx
@apps/ai-food/src/entities/meal/model/useDiaryStore.ts
@apps/ai-food/src/pages/settings/ui/SettingsPage.tsx
@apps/ai-food/src/features/onboarding/model/syncNutritionProfileToServer.ts

## Locked decisions (from quick planning context)

- D-01: Tap a fact chart point → show exact kg + date using existing BottomSheet / confirm UI patterns (Russian copy).
- D-02: From that detail (or equivalent), user can delete the entry after confirm (match DeleteMealConfirmSheet style, not a new design system).
- D-03: Delete updates chart, local weight store, and gateway sync via existing `deletes[]` / tombstones on `/user/weights/sync`.
- D-04: Settings/profile current weight must reflect latest logged entry by date (`latestWeightKg`), not stale onboarding-only `profile.weight`.

## Out of scope

- FriendWeightChart / NutritionReportWeightChart (separate components; do not share unless already importing WeightTrendChart).
- Recalculating calorie targets / micronutrient API on every weight log (only keep `profile.weight` + display in sync; do not reopen onboarding).
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>End-to-end weight delete through store and sync tombstones</name>
  <files>apps/ai-food/src/features/stats/model/useWeightStore.ts, apps/ai-food/src/features/stats/model/useWeightStore.test.ts, apps/ai-food/src/features/weight-sync/model/weightSyncMerge.ts, apps/ai-food/src/features/weight-sync/model/weightSyncMerge.test.ts, apps/ai-food/src/features/weight-sync/model/syncWeightHistory.ts, apps/ai-food/src/features/weight-sync/model/syncWeightHistory.test.ts, apps/ai-food/src/features/auth/model/clearLocalUserDataOnSignOut.ts</files>
  <behavior>
    - recordPendingDelete(id) removes the entry locally, appends { id, clientUpdatedAt } to pendingDeletes (replacing same id), and does not leave the entry in entries.
    - buildWeightSyncPayload / syncWeightHistory includes pendingDeletes in syncWeightsApi deletes and still upserts remaining entries for mode full.
    - After a successful sync response, pendingDeletes for tombstoned ids are cleared; applyWeightSyncResponse still drops tombstone ids from entries.
    - clearLocalUserDataOnSignOut resets pendingDeletes to [].
  </behavior>
  <action>
    Mirror the diary tombstone pattern (useDiaryStore.recordPendingDelete + syncDiaryMeals) for weight (D-03). Add persisted `pendingDeletes: { id; clientUpdatedAt }[]` and `recordPendingDelete(id)` on useWeightStore; keep addEntry behavior unchanged. Extend weightSyncMerge.buildWeightSyncPayload to return deletes from pendingDeletes (full mode: all pending; optional entryIds filter for targeted delete sync). Change syncWeightHistory to pass those deletes into syncWeightsApi (stop hardcoding deletes: []) and clear pendingDeletes that appear in response.tombstones (or all posted deletes that succeeded). Update clearLocalUserDataOnSignOut weight reset to include pendingDeletes: []. Extend existing Vitest files for store + merge + syncWeightHistory; no new npm packages.
  </action>
  <verify>
    <automated>pnpm --filter ai-food test -- src/features/stats/model/useWeightStore.test.ts src/features/weight-sync/model/weightSyncMerge.test.ts src/features/weight-sync/model/syncWeightHistory.test.ts</automated>
  </verify>
  <done>
    One happy-path delete removes a local WeightEntry and posts it on the existing weights sync deletes contract; pendingDeletes clear after successful tombstone response (D-03).
  </done>
</task>

<task type="auto">
  <name>Tappable chart point detail sheet with confirm delete</name>
  <files>apps/ai-food/src/features/stats/model/weightProgress.ts, apps/ai-food/src/features/stats/ui/WeightTrendChart.tsx, apps/ai-food/src/features/stats/ui/WeightEntryDetailSheet.tsx, apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx, apps/ai-food/src/features/stats/index.ts</files>
  <action>
    Per D-01/D-02, extend WeightChartPoint with optional id (string) so fact points carry the WeightEntry id. In WeightProgressCard windowPoints mapping, pass e.id. In WeightTrendChart, when interactive is true, enlarge hit targets on fact circles (larger invisible hit circle or pointer handler) and call optional onPointSelect(point) on tap without treating a short tap as pan (only fire select when pan lock never engaged / movement under the existing ~8px threshold). Do not make ideal/plan points tappable.

    Add WeightEntryDetailSheet (BottomSheet) showing kg with one decimal, Russian date (ru-RU), primary destructive «Удалить» that opens an inline confirm block or a second BottomSheet matching DeleteMealConfirmSheet copy style («Удалить запись веса?» / irreversible). On confirm: recordPendingDelete(id), queueWeightSync({ mode: 'full' }), close sheets. Wire selection state in WeightProgressCard only (own stats). Export the new sheet from stats index if other slices need it; keep Friend charts untouched.
  </action>
  <verify>
    <automated>pnpm --filter ai-food type-check</automated>
  </verify>
  <done>
    Own WeightTrendChart fact points open a Russian detail sheet with kg/date and confirm-delete that uses recordPendingDelete + queueWeightSync (D-01, D-02, D-03).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Settings and profile.weight follow latest logged weight</name>
  <files>apps/ai-food/src/pages/settings/ui/SettingsPage.tsx, apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx, apps/ai-food/src/features/onboarding/model/useProfileStore.ts</files>
  <behavior>
    - Settings «Вес» row displays latestWeightKg(weightEntries, profile.weight) with one-decimal formatting consistent with the chart card.
    - After addEntry or recordPendingDelete in WeightProgressCard, profile.weight is updated to the new latestWeightKg (fallback unchanged if log empty) and syncNutritionProfileToServer runs when a profile exists.
  </behavior>
  <action>
    Per D-04, stop rendering raw profile.weight alone in SettingsPage: subscribe to useWeightStore.entries and show latestWeightKg(entries, profile.weight) ?? profile.weight. In WeightProgressCard onSave for LogWeightSheet and after confirm delete, after mutating the weight store, set profile.weight via useProfileStore.updateProfile({ ...profile, weight: nextKg }) when profile is non-null and nextKg is finite, then syncNutritionProfileToServer(). Prefer a tiny local helper inside the card or a one-liner shared function — do not invent a new feature slice. Do not change EditProfileSheet field semantics beyond the fact that profile.weight stays current when the log changes. Add or extend a focused test only if an existing Settings/WeightProgress test file is the natural home; otherwise rely on store latestWeightKg tests already covering the numeric source of truth.
  </action>
  <verify>
    <automated>pnpm --filter ai-food test -- src/features/stats/model/useWeightStore.test.ts &amp;&amp; pnpm --filter ai-food type-check</automated>
  </verify>
  <done>
    Settings «Вес» and profile.weight stay aligned with the latest dated weight log entry after log and delete (D-04).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client → Gateway `/user/weights/sync` | Authenticated user token; deletes[] tombstones must be scoped to caller |
| Chart UI → local store | Tap/delete is device-local until sync |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261126-eba-01 | Tampering | syncWeightHistory deletes | medium | mitigate | Only delete ids already owned in local store; server already scopes by user token (existing weightSync) |
| T-261126-eba-02 | Repudiation | accidental delete | low | mitigate | Confirm BottomSheet before recordPendingDelete (D-02) |
| T-261126-eba-03 | Information Disclosure | WeightEntryDetailSheet | low | accept | Same data already on-device in the chart; no new network leak |
| T-261126-eba-SC | Tampering | npm installs | high | accept | No new packages in this plan |
</threat_model>

<verification>
- Store/sync tests pass for recordPendingDelete + deletes payload.
- type-check clean for ai-food.
- Manual smoke (executor or human): Stats → tap point → see kg/date → delete → chart updates; Settings → Вес matches latest log.
</verification>

<success_criteria>
- Tappable own-weight fact points show exact kg + date (D-01).
- Confirm-delete removes entry locally and syncs tombstone when logged in (D-02, D-03).
- Settings «Вес» equals latestWeightKg by date (D-04).
</success_criteria>

<output>
Create `.planning/quick/261126-eba-weight-chart-ux-profile-weight-sync-1-ma/261126-eba-SUMMARY.md` when done
</output>
