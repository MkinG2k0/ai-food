# Quick Task Context — Calorie Goal Streak

**Locked decisions (do not revisit):**

## D-01 — Hit metric: calories only
Second streak uses **calories only**, not protein/fat/carbs. Macros are ignored for this streak.

## D-02 — Tolerance constant
Corridor width is a named exported constant, default **20%** (`0.20`), so it can be changed in one place later.

## D-03 — Bounds depend on profile `goal` (`lose` | `maintain` | `gain`)
Let `G` = daily calorie target, `P` = tolerance (D-02), `kcal` = day's consumed calories from ready meals.

- **gain** (набор массы): only **lower** bound. Hit if `kcal >= G * (1 - P)`. Overshooting is OK (example: G=2000, 1820 hits, 2500 also hits).
- **maintain** (баланс): **both** bounds. Hit if `G * (1 - P) <= kcal <= G * (1 + P)`.
- **lose** (похудение): only **upper** bound. Hit if `kcal <= G * (1 + P)` (example: G=2000 → not more than 2200). Undereating is OK **except empty days** (D-04).

## D-04 — Empty day never counts
A day with **no ready meal** (0 kcal / no logged meals) never counts as a calorie-streak hit, even on `lose` where 0 would pass the upper bound.

## D-05 — Today does not count until the local day is closed
Calorie streak evaluates only **closed local calendar days** (yesterday and older). **Today is never in the current calorie-streak length** while the local date is still today. (Logging streak still counts today as soon as a ready meal exists.)

## D-06 — Same streak sheet, stacked weeks
Keep the existing logging-streak UI. Add the calorie streak on the **same sheet**, as a **second week row stacked under the first** (not tabs). Distinguish visually (icon/label): logging vs calorie-goal. Reuse start/record/next-goal/protection patterns for the second streak without making the sheet unusable — two week bars + two stat rows or compact dual stats.

## D-07 — Friends: both numbers, list and profile
Show **both** streak lengths in the **friends list row** and on the **friend profile**. Keep existing logging-streak sort (DESC by logging streak) unless a tiny UI tweak is needed for two numbers. Do not replace the logging number.

## D-08 — Separate freeze pool
Calorie streak has its **own** freeze count / consumed dates / grant milestones (same 0..2 cap, same grant rules as logging: +1 at first 7/14/30/60/100). Logging freezes never cover a calorie miss and vice versa.

## D-09 — Sync for friends
The second streak must sync (extend existing `/user/streak` payload / `clientStreak`) so friends see the calorie-streak length from server, not only local device.

## UI notes
- Logging flame chip in DailyHeader stays the logging streak; calorie streak lives primarily on the sheet + friends. Optional small second indicator in the sheet header is OK; do not remove the existing flame chip.
- Russian copy. Distinguish labels: e.g. «Запись» vs «Норма» / «Ккал».
- FSD: extend `entities/streak` compute + `features/streak` persist/sheet + `features/streak-sync` + friends API/UI + `apps/ai-app` streak/friends parsers.

## Out of scope
- Protein/fat/carbs in the hit rule
- Tabs on the streak sheet
- Shared freeze pool
- Changing DailyBudgetSheet / nutrition rings
- Photo sharing
