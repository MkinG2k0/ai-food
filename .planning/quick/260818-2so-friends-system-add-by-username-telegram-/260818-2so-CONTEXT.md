# Quick Task Context — Friends System

**Locked decisions (do not revisit):**

1. **Photos:** Friends see meal names + KBJU only — NO photo upload to server. Setting `sharePhotosToFriends` (default ON) controls whether a photo placeholder/icon is shown in friend profile view; when OFF, text-only meal rows.

2. **Search:** Add friend by `@username` OR numeric **Telegram ID** (exact match).

3. **Notifications:** In-app bell with badge (on friends button + main screen left-of-settings) + Telegram bot DM on friend request (accept/decline in-app only).

4. **Auth:** Friends feature requires login (Telegram auth). No guest access.

5. **UI placement:**
   - Button left of settings on DailyHeader (main screen) → `/friends`
   - Friends page: sorted friends list by streak DESC, add-friend form, notifications bell
   - Friend detail: last 7 days meals + KBJU, daily targets, current weight, streak
   - Settings: toggle `sharePhotosToFriends` (default true)

6. **Data:** Meals already sync to server via `/user/meals/sync` — friend profile reads friend's meals from server (no photo blobs). Streak from `User.clientStreak.currentLength`. Weight from `WeightEntry` + `goalKg`. Targets from `nutritionProfile.targets`.
