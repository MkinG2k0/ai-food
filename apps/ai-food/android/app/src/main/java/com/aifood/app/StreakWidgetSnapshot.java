package com.aifood.app;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Shared reader for Capacitor Preferences key {@code ai-food-widget-streak}
 * in group {@code CapacitorStorage}. Used by streak home widgets.
 */
final class StreakWidgetSnapshot {

    static final String PREFS_GROUP = "CapacitorStorage";
    static final String PREFS_KEY = "ai-food-widget-streak";

    private StreakWidgetSnapshot() {}

    static Snapshot read(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_GROUP, Context.MODE_PRIVATE);
        String raw = prefs.getString(PREFS_KEY, null);
        if (raw == null || raw.isEmpty()) {
            return Snapshot.empty();
        }

        try {
            JSONObject root = new JSONObject(raw);
            return new Snapshot(
                root.optInt("loggingLength", 0),
                root.optInt("calorieLength", 0),
                readWeek(root.optJSONArray("loggingWeek")),
                readWeek(root.optJSONArray("calorieWeek"))
            );
        } catch (Exception ignored) {
            return Snapshot.empty();
        }
    }

    private static boolean[] readWeek(JSONArray arr) {
        boolean[] week = new boolean[7];
        if (arr == null) return week;
        int n = Math.min(7, arr.length());
        for (int i = 0; i < n; i++) {
            Object value = arr.opt(i);
            if (value instanceof Boolean) {
                week[i] = (Boolean) value;
            } else if (value instanceof Number) {
                week[i] = ((Number) value).intValue() != 0;
            } else {
                week[i] = arr.optBoolean(i, false);
            }
        }
        return week;
    }

    /** Mirrors JS {@code streakDaysLabel}. */
    static String daysLabel(int count) {
        int mod10 = count % 10;
        int mod100 = count % 100;
        if (mod10 == 1 && mod100 != 11) return "день";
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
        return "дней";
    }

    static final class Snapshot {
        final int loggingLength;
        final int calorieLength;
        final boolean[] loggingWeek;
        final boolean[] calorieWeek;

        Snapshot(int loggingLength, int calorieLength, boolean[] loggingWeek, boolean[] calorieWeek) {
            this.loggingLength = loggingLength;
            this.calorieLength = calorieLength;
            this.loggingWeek = loggingWeek;
            this.calorieWeek = calorieWeek;
        }

        static Snapshot empty() {
            return new Snapshot(0, 0, new boolean[7], new boolean[7]);
        }
    }
}
