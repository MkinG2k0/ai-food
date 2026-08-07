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
 * Shared 1×1 home-screen widget base for a single AddFood action.
 * Deep-link contract twin: JS {@code parseAddFoodDeepLink} / {@code aifood://add/<action>}.
 * Subclasses supply a filled layout (icon+label) used for both home and widget-picker preview.
 */
public abstract class AddFoodActionWidgetProvider extends AppWidgetProvider {

    protected abstract String getAction();

    protected abstract int getLayoutResId();

    protected abstract int getRequestCode();

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), getLayoutResId());
            views.setOnClickPendingIntent(
                R.id.widget_action_root,
                buildActionPendingIntent(context, getAction(), getRequestCode())
            );
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private static PendingIntent buildActionPendingIntent(Context context, String action, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("aifood://add/" + action));
        intent.setClass(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }
}
