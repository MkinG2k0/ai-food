package com.aifood.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

/**
 * 4×1 home widget: both streak tracks for the current week (Mon→Sun).
 * Tap → {@code aifood://streak}.
 */
public class StreakWeekWidgetProvider extends AppWidgetProvider {

    private static final int REQUEST_OPEN = 2608193;

    private static final int[] LOG_DOTS = {
        R.id.widget_streak_log_d0,
        R.id.widget_streak_log_d1,
        R.id.widget_streak_log_d2,
        R.id.widget_streak_log_d3,
        R.id.widget_streak_log_d4,
        R.id.widget_streak_log_d5,
        R.id.widget_streak_log_d6,
    };

    private static final int[] CAL_DOTS = {
        R.id.widget_streak_cal_d0,
        R.id.widget_streak_cal_d1,
        R.id.widget_streak_cal_d2,
        R.id.widget_streak_cal_d3,
        R.id.widget_streak_cal_d4,
        R.id.widget_streak_cal_d5,
        R.id.widget_streak_cal_d6,
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        StreakWidgetSnapshot.Snapshot snapshot = StreakWidgetSnapshot.read(context);
        for (int appWidgetId : appWidgetIds) {
            appWidgetManager.updateAppWidget(appWidgetId, buildViews(context, snapshot));
        }
    }

    static RemoteViews buildViews(Context context, StreakWidgetSnapshot.Snapshot snapshot) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_streak_week);
        bindDots(views, LOG_DOTS, snapshot.loggingWeek, R.drawable.widget_streak_dot_logging);
        bindDots(views, CAL_DOTS, snapshot.calorieWeek, R.drawable.widget_streak_dot_calorie);
        views.setOnClickPendingIntent(
            R.id.widget_streak_week_root,
            StreakCardWidgetProvider.buildOpenStreakPendingIntent(context, REQUEST_OPEN)
        );
        return views;
    }

    private static void bindDots(RemoteViews views, int[] ids, boolean[] week, int filledRes) {
        for (int i = 0; i < ids.length; i++) {
            boolean filled = i < week.length && week[i];
            views.setImageViewResource(ids[i], filled ? filledRes : R.drawable.widget_streak_dot_empty);
        }
    }
}
