package com.aifood.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Build;
import android.util.TypedValue;
import android.widget.RemoteViews;

/**
 * 2×2 Apple Fitness–style concentric KBJU activity rings widget.
 * One bitmap with four nested arcs (kcal → protein → fat → carbs).
 */
public class KbjuActivityRingsWidgetProvider extends AppWidgetProvider {

    /** Distinct from KbjuRingsWidgetProvider (260807). */
    private static final int REQUEST_OPEN_APP = 2608071;

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        KbjuWidgetSnapshot.Snapshot snapshot = KbjuWidgetSnapshot.read(context);
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = buildViews(context, snapshot);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    static RemoteViews buildViews(Context context, KbjuWidgetSnapshot.Snapshot snapshot) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_kbju_activity_rings);

        int sizePx = Math.round(
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                120f,
                context.getResources().getDisplayMetrics()
            )
        );

        int track = context.getResources().getColor(R.color.widget_kbju_track, null);
        int over = context.getResources().getColor(R.color.widget_kbju_over, null);
        int kcal = context.getResources().getColor(R.color.widget_kbju_kcal, null);
        int protein = context.getResources().getColor(R.color.widget_kbju_protein, null);
        int fat = context.getResources().getColor(R.color.widget_kbju_fat, null);
        int carbs = context.getResources().getColor(R.color.widget_kbju_carbs, null);

        Bitmap rings = drawConcentricRings(sizePx, snapshot, kcal, protein, fat, carbs, over, track);
        views.setImageViewBitmap(R.id.widget_kbju_activity_rings, rings);

        int remaining = (int) Math.max(0, Math.round(snapshot.goalKcal - snapshot.consumedKcal));
        views.setTextViewText(R.id.widget_kbju_activity_center, remaining + "\nккал");

        views.setOnClickPendingIntent(R.id.widget_kbju_activity_root, buildOpenAppPendingIntent(context));
        return views;
    }

    /**
     * Outer→inner: kcal, protein, fat, carbs. Thick ROUND-cap strokes; over-goal uses overColor.
     */
    static Bitmap drawConcentricRings(
        int sizePx,
        KbjuWidgetSnapshot.Snapshot snapshot,
        int kcalColor,
        int proteinColor,
        int fatColor,
        int carbsColor,
        int overColor,
        int trackColor
    ) {
        Bitmap bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);

        // Four rings: gap ≈ stroke; stroke ~14% of outer radius span per ring.
        float padding = sizePx * 0.06f;
        float outerRadius = (sizePx / 2f) - padding;
        float stroke = outerRadius * 0.14f;
        float gap = stroke * 1.15f;

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(stroke);
        paint.setStrokeCap(Paint.Cap.ROUND);

        float[] consumed = {
            (float) snapshot.consumedKcal,
            (float) snapshot.consumedProtein,
            (float) snapshot.consumedFat,
            (float) snapshot.consumedCarbs
        };
        float[] goals = {
            (float) snapshot.goalKcal,
            (float) snapshot.goalProtein,
            (float) snapshot.goalFat,
            (float) snapshot.goalCarbs
        };
        int[] fills = { kcalColor, proteinColor, fatColor, carbsColor };

        float cx = sizePx / 2f;
        float cy = sizePx / 2f;

        for (int i = 0; i < 4; i++) {
            float radius = outerRadius - i * gap;
            if (radius <= stroke) {
                break;
            }
            RectF oval = new RectF(cx - radius, cy - radius, cx + radius, cy + radius);

            paint.setColor(trackColor);
            canvas.drawArc(oval, -90f, 360f, false, paint);

            float safeGoal = goals[i] > 0f ? goals[i] : 1f;
            boolean over = consumed[i] > safeGoal;
            float progress = Math.min(1f, Math.max(0f, consumed[i] / safeGoal));
            float sweep = progress * 360f;
            if (sweep > 0f) {
                paint.setColor(over ? overColor : fills[i]);
                canvas.drawArc(oval, -90f, sweep, false, paint);
            }
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
}
