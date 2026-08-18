package com.aifood.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

/** Re-pushes all home widgets so theme-aware colors (values-night) apply. */
public final class WidgetThemeRefresh {

    private WidgetThemeRefresh() {}

    private static final Class<?>[] PROVIDERS = {
        AddFoodWidgetProvider.class,
        ScanWidgetProvider.class,
        ScanDescribeWidgetProvider.class,
        GalleryWidgetProvider.class,
        DescribeWidgetProvider.class,
        ManualWidgetProvider.class,
        FavoritesWidgetProvider.class,
        KbjuRingsWidgetProvider.class,
        KbjuActivityRingsWidgetProvider.class,
        WeeklyCaloriesWidgetProvider.class,
        StreakDiaryWidgetProvider.class,
        StreakCalorieWidgetProvider.class,
        StreakWeekWidgetProvider.class,
    };

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        for (Class<?> providerClass : PROVIDERS) {
            ComponentName component = new ComponentName(context, providerClass);
            int[] ids = manager.getAppWidgetIds(component);
            if (ids == null || ids.length == 0) {
                continue;
            }
            Intent intent = new Intent(context, providerClass);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            context.sendBroadcast(intent);
        }
    }
}
