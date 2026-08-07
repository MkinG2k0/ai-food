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
import android.net.Uri;
import android.os.Build;
import android.util.TypedValue;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;

/**
 * ~4×2 home-screen widget: weekly KBJU stacked calorie bars (Mon→Sun).
 * Reads lean snapshot from Capacitor Preferences group {@code CapacitorStorage}.
 * Tap → {@code aifood://stats}.
 */
public class WeeklyCaloriesWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_GROUP = "CapacitorStorage";
    private static final String PREFS_KEY = "ai-food-widget-week-kcal";
    private static final int REQUEST_OPEN_STATS = 2608071;

    private static final double KCAL_PROTEIN = 4;
    private static final double KCAL_CARBS = 4;
    private static final double KCAL_FAT = 9;
    private static final double FALLBACK_GOAL = 2000;

    private static final String[] DAY_LABELS = {"Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"};

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Snapshot snapshot = readSnapshot(context);
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = buildViews(context, snapshot);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    static RemoteViews buildViews(Context context, Snapshot snapshot) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_weekly_calories);

        views.setTextViewText(R.id.widget_week_kcal_range, formatRangeLabel(snapshot.weekStart));
        views.setTextViewText(R.id.widget_week_kcal_summary, formatSummary(snapshot));

        int widthPx = Math.round(
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                280f,
                context.getResources().getDisplayMetrics()
            )
        );
        int heightPx = Math.round(
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                96f,
                context.getResources().getDisplayMetrics()
            )
        );

        int carbsColor = context.getResources().getColor(R.color.widget_kbju_carbs, null);
        int fatColor = context.getResources().getColor(R.color.widget_kbju_fat, null);
        int proteinColor = context.getResources().getColor(R.color.widget_kbju_protein, null);
        int goalColor = context.getResources().getColor(R.color.widget_week_kcal_goal_line, null);
        int labelColor = context.getResources().getColor(R.color.widget_week_kcal_muted, null);
        int emptyColor = context.getResources().getColor(R.color.widget_kbju_track, null);

        views.setImageViewBitmap(
            R.id.widget_week_kcal_chart,
            drawChart(
                widthPx,
                heightPx,
                snapshot,
                carbsColor,
                fatColor,
                proteinColor,
                goalColor,
                labelColor,
                emptyColor
            )
        );

        views.setOnClickPendingIntent(R.id.widget_week_kcal_root, buildOpenStatsPendingIntent(context));
        return views;
    }

    static Bitmap drawChart(
        int widthPx,
        int heightPx,
        Snapshot snapshot,
        int carbsColor,
        int fatColor,
        int proteinColor,
        int goalColor,
        int labelColor,
        int emptyColor
    ) {
        Bitmap bmp = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);

        float labelH = heightPx * 0.22f;
        float plotTop = heightPx * 0.04f;
        float plotBottom = heightPx - labelH;
        float plotHeight = Math.max(1f, plotBottom - plotTop);
        float padX = widthPx * 0.02f;
        float usableW = widthPx - 2f * padX;

        double dataMax = 0;
        for (DayPoint day : snapshot.days) {
            dataMax = Math.max(dataMax, barHeightKcal(day));
        }
        double chartMax = niceChartMax(dataMax, snapshot.goalKcal > 0 ? snapshot.goalKcal : null);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        if (snapshot.goalKcal > 0 && chartMax > 0) {
            float goalY = plotTop + (float) ((chartMax - snapshot.goalKcal) / chartMax) * plotHeight;
            goalY = Math.min(plotBottom, Math.max(plotTop, goalY));
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(Math.max(1f, widthPx * 0.003f));
            paint.setColor(goalColor);
            paint.setPathEffect(new android.graphics.DashPathEffect(new float[]{8f, 6f}, 0));
            canvas.drawLine(padX, goalY, widthPx - padX, goalY, paint);
            paint.setPathEffect(null);
        }

        float slotW = usableW / 7f;
        float barW = slotW * 0.45f;
        float radius = barW * 0.45f;

        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        textPaint.setColor(labelColor);
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(labelH * 0.55f);

        for (int i = 0; i < 7; i++) {
            DayPoint day = i < snapshot.days.length ? snapshot.days[i] : DayPoint.zero();
            float centerX = padX + slotW * i + slotW * 0.5f;
            float left = centerX - barW * 0.5f;
            float right = centerX + barW * 0.5f;

            double heightKcal = barHeightKcal(day);
            if (heightKcal <= 0 || chartMax <= 0) {
                paint.setStyle(Paint.Style.FILL);
                paint.setColor(emptyColor);
                float stubH = Math.max(2f, plotHeight * 0.02f);
                canvas.drawRoundRect(
                    new RectF(left, plotBottom - stubH, right, plotBottom),
                    radius,
                    radius,
                    paint
                );
            } else {
                float barH = (float) Math.max(plotHeight * 0.025, (heightKcal / chartMax) * plotHeight);
                float top = plotBottom - barH;

                double macroCarbs = day.carbs * KCAL_CARBS;
                double macroFat = day.fat * KCAL_FAT;
                double macroProtein = day.protein * KCAL_PROTEIN;
                double macroTotal = macroCarbs + macroFat + macroProtein;

                paint.setStyle(Paint.Style.FILL);
                if (macroTotal > 0) {
                    // Stack bottom → top: carbs, fat, protein (draw bottom-up)
                    float y = plotBottom;
                    double[] segs = {macroCarbs, macroFat, macroProtein};
                    int[] colors = {carbsColor, fatColor, proteinColor};
                    for (int s = 0; s < 3; s++) {
                        if (segs[s] <= 0) continue;
                        float segH = (float) (segs[s] / macroTotal) * barH;
                        float segTop = y - segH;
                        paint.setColor(colors[s]);
                        canvas.drawRect(left, segTop, right, y, paint);
                        y = segTop;
                    }
                } else {
                    paint.setColor(carbsColor);
                    canvas.drawRoundRect(new RectF(left, top, right, plotBottom), radius, radius, paint);
                }
            }

            String label = DAY_LABELS[i];
            canvas.drawText(label, centerX, heightPx - labelH * 0.25f, textPaint);
        }

        return bmp;
    }

    static double barHeightKcal(DayPoint day) {
        double fromMacros =
            day.protein * KCAL_PROTEIN + day.carbs * KCAL_CARBS + day.fat * KCAL_FAT;
        if (fromMacros > 0) return fromMacros;
        return day.calories;
    }

    /** Mirrors JS {@code niceChartMax} in chartScale.ts */
    static double niceChartMax(double dataMax, Double goal) {
        double goalVal = goal != null ? goal : 0;
        double peak = Math.max(dataMax, Math.max(goalVal, 100));
        double rough = peak * 1.08;
        double magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
        double normalized = rough / magnitude;
        double nice;
        if (normalized <= 1.25) nice = 1.25;
        else if (normalized <= 2) nice = 2;
        else if (normalized <= 2.5) nice = 2.5;
        else if (normalized <= 5) nice = 5;
        else nice = 10;
        return nice * magnitude;
    }

    private static String formatRangeLabel(String weekStart) {
        Calendar start = parseLocalDate(weekStart);
        if (start == null) return "";
        Calendar end = (Calendar) start.clone();
        end.add(Calendar.DAY_OF_MONTH, 6);

        SimpleDateFormat fmt = new SimpleDateFormat("d MMM", new Locale("ru", "RU"));
        fmt.setTimeZone(TimeZone.getDefault());
        String a = fmt.format(start.getTime()).replace(".", "").trim();
        String b = fmt.format(end.getTime()).replace(".", "").trim();
        return a + " · " + b;
    }

    private static String formatSummary(Snapshot snapshot) {
        int logged = 0;
        double sum = 0;
        for (DayPoint day : snapshot.days) {
            if (day.calories > 0) {
                logged++;
                sum += day.calories;
            }
        }
        if (logged == 0) {
            return "Нет данных за период";
        }
        long avg = Math.round(sum / logged);
        return avg + " ккал · среднее за день";
    }

    private static PendingIntent buildOpenStatsPendingIntent(Context context) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("aifood://stats"));
        intent.setClass(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, REQUEST_OPEN_STATS, intent, flags);
    }

    static Snapshot readSnapshot(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_GROUP, Context.MODE_PRIVATE);
        String raw = prefs.getString(PREFS_KEY, null);
        if (raw == null || raw.isEmpty()) {
            return Snapshot.empty();
        }

        try {
            JSONObject root = new JSONObject(raw);
            String weekStart = root.optString("weekStart", "");
            double goalKcal = root.optDouble("goalKcal", FALLBACK_GOAL);
            JSONArray daysArr = root.optJSONArray("days");
            DayPoint[] days = new DayPoint[7];
            for (int i = 0; i < 7; i++) {
                days[i] = DayPoint.zero();
            }
            if (daysArr != null) {
                int n = Math.min(7, daysArr.length());
                for (int i = 0; i < n; i++) {
                    JSONObject d = daysArr.optJSONObject(i);
                    if (d == null) continue;
                    days[i] = new DayPoint(
                        d.optString("date", ""),
                        d.optDouble("calories", 0),
                        d.optDouble("protein", 0),
                        d.optDouble("carbs", 0),
                        d.optDouble("fat", 0)
                    );
                }
            }
            if (weekStart.isEmpty() && days[0].date.length() > 0) {
                weekStart = days[0].date;
            }
            return new Snapshot(weekStart, goalKcal, days);
        } catch (Exception ignored) {
            return Snapshot.empty();
        }
    }

    private static Calendar parseLocalDate(String ymd) {
        if (ymd == null || ymd.length() < 10) return null;
        try {
            String[] parts = ymd.substring(0, 10).split("-");
            Calendar cal = Calendar.getInstance(TimeZone.getDefault());
            cal.set(Calendar.YEAR, Integer.parseInt(parts[0]));
            cal.set(Calendar.MONTH, Integer.parseInt(parts[1]) - 1);
            cal.set(Calendar.DAY_OF_MONTH, Integer.parseInt(parts[2]));
            cal.set(Calendar.HOUR_OF_DAY, 0);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            return cal;
        } catch (Exception e) {
            return null;
        }
    }

    static final class DayPoint {
        final String date;
        final double calories;
        final double protein;
        final double carbs;
        final double fat;

        DayPoint(String date, double calories, double protein, double carbs, double fat) {
            this.date = date;
            this.calories = calories;
            this.protein = protein;
            this.carbs = carbs;
            this.fat = fat;
        }

        static DayPoint zero() {
            return new DayPoint("", 0, 0, 0, 0);
        }
    }

    static final class Snapshot {
        final String weekStart;
        final double goalKcal;
        final DayPoint[] days;

        Snapshot(String weekStart, double goalKcal, DayPoint[] days) {
            this.weekStart = weekStart;
            this.goalKcal = goalKcal;
            this.days = days;
        }

        static Snapshot empty() {
            DayPoint[] days = new DayPoint[7];
            for (int i = 0; i < 7; i++) {
                days[i] = DayPoint.zero();
            }
            return new Snapshot("", FALLBACK_GOAL, days);
        }
    }
}
