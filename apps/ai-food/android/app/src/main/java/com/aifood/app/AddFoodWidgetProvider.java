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
 * Home-screen quick actions mirroring AddFoodSheet.
 * Deep-link contract twin: JS {@code parseAddFoodDeepLink} / {@code aifood://add/<action>}.
 */
public class AddFoodWidgetProvider extends AppWidgetProvider {

    private static final String[] ACTIONS = {
        "scan",
        "scan-describe",
        "gallery",
        "describe",
        "manual",
        "favorites"
    };

    private static final int[] BUTTON_IDS = {
        R.id.btn_scan,
        R.id.btn_scan_describe,
        R.id.btn_gallery,
        R.id.btn_describe,
        R.id.btn_manual,
        R.id.btn_favorites
    };

    /** Offset from 1×1 widget request codes (1001–1006) to avoid PendingIntent collisions. */
    private static final int REQUEST_CODE_BASE = 2001;

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_add_food);

            for (int i = 0; i < ACTIONS.length; i++) {
                views.setOnClickPendingIntent(
                    BUTTON_IDS[i],
                    buildActionPendingIntent(context, ACTIONS[i], REQUEST_CODE_BASE + i)
                );
            }

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
