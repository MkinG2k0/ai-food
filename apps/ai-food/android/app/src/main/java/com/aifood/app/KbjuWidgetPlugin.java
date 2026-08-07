package com.aifood.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Capacitor bridge: JS {@code KbjuWidget.refresh()} → update KBJU rings widgets. */
@CapacitorPlugin(name = "KbjuWidget")
public class KbjuWidgetPlugin extends Plugin {

    @PluginMethod
    public void refresh(PluginCall call) {
        Context context = getContext();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, KbjuRingsWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);

        if (ids != null && ids.length > 0) {
            Intent intent = new Intent(context, KbjuRingsWidgetProvider.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            context.sendBroadcast(intent);
        }

        call.resolve();
    }
}
