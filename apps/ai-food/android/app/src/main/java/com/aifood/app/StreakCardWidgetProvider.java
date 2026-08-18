package com.aifood.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * Shared 1×1 streak card (diary or calorie). Tap → {@code aifood://streak}.
 */
public abstract class StreakCardWidgetProvider extends AppWidgetProvider {

    protected abstract boolean isCalorie();

    protected abstract int getLayoutResId();

    protected abstract int getRequestCode();

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        StreakWidgetSnapshot.Snapshot snapshot = StreakWidgetSnapshot.read(context);
        for (int appWidgetId : appWidgetIds) {
            appWidgetManager.updateAppWidget(appWidgetId, buildViews(context, snapshot));
        }
    }

    RemoteViews buildViews(Context context, StreakWidgetSnapshot.Snapshot snapshot) {
        RemoteViews views = new RemoteViews(context.getPackageName(), getLayoutResId());
        boolean calorie = isCalorie();
        int length = calorie ? snapshot.calorieLength : snapshot.loggingLength;

        views.setImageViewResource(
            R.id.widget_streak_card_icon,
            calorie ? R.drawable.ic_widget_target : R.drawable.ic_widget_flame
        );
        views.setTextViewText(R.id.widget_streak_card_value, String.valueOf(length));
        views.setTextViewText(
            R.id.widget_streak_card_title,
            context.getString(
                calorie ? R.string.widget_streak_calorie_title_short : R.string.widget_streak_diary_title
            )
        );
        views.setOnClickPendingIntent(
            R.id.widget_streak_card_root,
            buildOpenStreakPendingIntent(context, getRequestCode())
        );
        return views;
    }

    static PendingIntent buildOpenStreakPendingIntent(Context context, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("aifood://streak"));
        intent.setClass(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }
}
