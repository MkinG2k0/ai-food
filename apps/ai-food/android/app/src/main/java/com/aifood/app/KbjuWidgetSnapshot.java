package com.aifood.app;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Shared reader for Capacitor Preferences key {@code ai-food-widget-kbju}
 * in group {@code CapacitorStorage}. Used by KBJU home widgets.
 */
final class KbjuWidgetSnapshot {

    static final String PREFS_GROUP = "CapacitorStorage";
    static final String PREFS_KEY = "ai-food-widget-kbju";

    private static final double FALLBACK_KCAL = 2000;
    private static final double FALLBACK_PROTEIN = 150;
    private static final double FALLBACK_FAT = 70;
    private static final double FALLBACK_CARBS = 250;

    private KbjuWidgetSnapshot() {}

    static Snapshot read(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_GROUP, Context.MODE_PRIVATE);
        String raw = prefs.getString(PREFS_KEY, null);
        String today = localDateToday();

        Snapshot empty = Snapshot.fallbackGoals(today);
        if (raw == null || raw.isEmpty()) {
            return empty.withZeroConsumed();
        }

        try {
            JSONObject root = new JSONObject(raw);
            String date = root.optString("date", "");
            JSONObject goals = root.optJSONObject("goals");
            JSONObject consumed = root.optJSONObject("consumed");

            double goalKcal = goals != null ? goals.optDouble("kcal", FALLBACK_KCAL) : FALLBACK_KCAL;
            double goalProtein = goals != null ? goals.optDouble("protein", FALLBACK_PROTEIN) : FALLBACK_PROTEIN;
            double goalFat = goals != null ? goals.optDouble("fat", FALLBACK_FAT) : FALLBACK_FAT;
            double goalCarbs = goals != null ? goals.optDouble("carbs", FALLBACK_CARBS) : FALLBACK_CARBS;

            boolean stale = date.isEmpty() || !today.equals(date);
            double consumedKcal = 0;
            double consumedProtein = 0;
            double consumedFat = 0;
            double consumedCarbs = 0;
            if (!stale && consumed != null) {
                consumedKcal = consumed.optDouble("kcal", 0);
                consumedProtein = consumed.optDouble("protein", 0);
                consumedFat = consumed.optDouble("fat", 0);
                consumedCarbs = consumed.optDouble("carbs", 0);
            }

            return new Snapshot(
                date.isEmpty() ? today : date,
                consumedKcal,
                consumedProtein,
                consumedFat,
                consumedCarbs,
                goalKcal,
                goalProtein,
                goalFat,
                goalCarbs
            );
        } catch (Exception ignored) {
            return empty.withZeroConsumed();
        }
    }

    private static String localDateToday() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        sdf.setTimeZone(TimeZone.getDefault());
        return sdf.format(new Date());
    }

    static final class Snapshot {
        final String date;
        final double consumedKcal;
        final double consumedProtein;
        final double consumedFat;
        final double consumedCarbs;
        final double goalKcal;
        final double goalProtein;
        final double goalFat;
        final double goalCarbs;

        Snapshot(
            String date,
            double consumedKcal,
            double consumedProtein,
            double consumedFat,
            double consumedCarbs,
            double goalKcal,
            double goalProtein,
            double goalFat,
            double goalCarbs
        ) {
            this.date = date;
            this.consumedKcal = consumedKcal;
            this.consumedProtein = consumedProtein;
            this.consumedFat = consumedFat;
            this.consumedCarbs = consumedCarbs;
            this.goalKcal = goalKcal;
            this.goalProtein = goalProtein;
            this.goalFat = goalFat;
            this.goalCarbs = goalCarbs;
        }

        static Snapshot fallbackGoals(String date) {
            return new Snapshot(
                date,
                0,
                0,
                0,
                0,
                FALLBACK_KCAL,
                FALLBACK_PROTEIN,
                FALLBACK_FAT,
                FALLBACK_CARBS
            );
        }

        Snapshot withZeroConsumed() {
            return new Snapshot(
                date,
                0,
                0,
                0,
                0,
                goalKcal,
                goalProtein,
                goalFat,
                goalCarbs
            );
        }
    }
}
