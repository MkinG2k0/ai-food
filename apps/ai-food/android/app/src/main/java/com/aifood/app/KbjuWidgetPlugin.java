package com.aifood.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Capacitor bridge: JS {@code KbjuWidget.refresh()} → update KBJU rings + weekly chart widgets. */
@CapacitorPlugin(name = "KbjuWidget")
public class KbjuWidgetPlugin extends Plugin {

    @PluginMethod
    public void refresh(PluginCall call) {
        Context context = getContext();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);

        notifyProvider(context, manager, KbjuRingsWidgetProvider.class);
        notifyProvider(context, manager, KbjuActivityRingsWidgetProvider.class);
        notifyProvider(context, manager, WeeklyCaloriesWidgetProvider.class);

        call.resolve();
    }

    private static void notifyProvider(
        Context context,
        AppWidgetManager manager,
        Class<?> providerClass
    ) {
        ComponentName component = new ComponentName(context, providerClass);
        int[] ids = manager.getAppWidgetIds(component);
        if (ids == null || ids.length == 0) {
            return;
        }
        Intent intent = new Intent(context, providerClass);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);
    }
}
