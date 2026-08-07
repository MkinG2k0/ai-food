package com.aifood.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Build;
import android.util.TypedValue;
import android.widget.RemoteViews;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * 2×2 home-screen widget: today Ккал / Белки / Жиры / Углеводы rings.
 * Reads lean snapshot from Capacitor Preferences group {@code CapacitorStorage}.
 */
public class KbjuRingsWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_GROUP = "CapacitorStorage";
    private static final String PREFS_KEY = "ai-food-widget-kbju";
    private static final int REQUEST_OPEN_APP = 260807;

    private static final double FALLBACK_KCAL = 2000;
    private static final double FALLBACK_PROTEIN = 150;
    private static final double FALLBACK_FAT = 70;
    private static final double FALLBACK_CARBS = 250;

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Snapshot snapshot = readSnapshot(context);
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = buildViews(context, snapshot);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    static RemoteViews buildViews(Context context, Snapshot snapshot) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_kbju_rings);

        int ringPx = Math.round(
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                48f,
                context.getResources().getDisplayMetrics()
            )
        );
        int track = context.getResources().getColor(R.color.widget_kbju_track, null);
        int over = context.getResources().getColor(R.color.widget_kbju_over, null);

        bindRing(
            views,
            R.id.widget_kbju_ring_kcal,
            R.id.widget_kbju_value_kcal,
            snapshot.consumedKcal,
            snapshot.goalKcal,
            context.getResources().getColor(R.color.widget_kbju_kcal, null),
            over,
            track,
            ringPx,
            false
        );
        bindRing(
            views,
            R.id.widget_kbju_ring_protein,
            R.id.widget_kbju_value_protein,
            snapshot.consumedProtein,
            snapshot.goalProtein,
            context.getResources().getColor(R.color.widget_kbju_protein, null),
            over,
            track,
            ringPx,
            true
        );
        bindRing(
            views,
            R.id.widget_kbju_ring_fat,
            R.id.widget_kbju_value_fat,
            snapshot.consumedFat,
            snapshot.goalFat,
            context.getResources().getColor(R.color.widget_kbju_fat, null),
            over,
            track,
            ringPx,
            true
        );
        bindRing(
            views,
            R.id.widget_kbju_ring_carbs,
            R.id.widget_kbju_value_carbs,
            snapshot.consumedCarbs,
            snapshot.goalCarbs,
            context.getResources().getColor(R.color.widget_kbju_carbs, null),
            over,
            track,
            ringPx,
            true
        );

        views.setOnClickPendingIntent(R.id.widget_kbju_root, buildOpenAppPendingIntent(context));
        return views;
    }

    private static void bindRing(
        RemoteViews views,
        int ringViewId,
        int valueViewId,
        double consumed,
        double goal,
        int fillColor,
        int overColor,
        int trackColor,
        int ringPx,
        boolean grams
    ) {
        double safeGoal = goal > 0 ? goal : 1;
        boolean over = consumed > safeGoal;
        float progress = (float) Math.min(1.0, Math.max(0.0, consumed / safeGoal));
        int color = over ? overColor : fillColor;
        views.setImageViewBitmap(ringViewId, drawRing(ringPx, progress, color, trackColor));

        int c = (int) Math.round(consumed);
        int g = (int) Math.round(goal);
        String text = grams ? (c + "/" + g + "г") : (c + "/" + g);
        views.setTextViewText(valueViewId, text);
    }

    static Bitmap drawRing(int sizePx, float progress, int fillColor, int trackColor) {
        Bitmap bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        float stroke = sizePx * 0.14f;
        RectF oval = new RectF(stroke, stroke, sizePx - stroke, sizePx - stroke);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(stroke);
        paint.setStrokeCap(Paint.Cap.ROUND);

        paint.setColor(trackColor);
        canvas.drawArc(oval, -90f, 360f, false, paint);

        float sweep = Math.min(1f, Math.max(0f, progress)) * 360f;
        if (sweep > 0f) {
            paint.setColor(fillColor);
            canvas.drawArc(oval, -90f, sweep, false, paint);
        }
        return bmp;
    }

    private static PendingIntent buildOpenAppPendingIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_MAIN);
        intent.addCategory(Intent.CATEGORY_LAUNCHER);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, REQUEST_OPEN_APP, intent, flags);
    }

    static Snapshot readSnapshot(Context context) {
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
