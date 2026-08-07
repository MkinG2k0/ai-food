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
 * 2×2 home-screen widget: today Ккал / Белки / Жиры / Углеводы rings.
 * Reads lean snapshot from Capacitor Preferences via {@link KbjuWidgetSnapshot}.
 */
public class KbjuRingsWidgetProvider extends AppWidgetProvider {

    private static final int REQUEST_OPEN_APP = 260807;

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        KbjuWidgetSnapshot.Snapshot snapshot = KbjuWidgetSnapshot.read(context);
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = buildViews(context, snapshot);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    static RemoteViews buildViews(Context context, KbjuWidgetSnapshot.Snapshot snapshot) {
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
}
