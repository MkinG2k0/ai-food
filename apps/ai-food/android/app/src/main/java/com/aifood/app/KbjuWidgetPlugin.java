package com.aifood.app;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Capacitor bridge: JS {@code KbjuWidget.refresh()} → update home widgets. */
@CapacitorPlugin(name = "KbjuWidget")
public class KbjuWidgetPlugin extends Plugin {

    @PluginMethod
    public void refresh(PluginCall call) {
        Context context = getContext();
        // Theme-aware colors come from values / values-night on each redraw.
        WidgetThemeRefresh.refreshAll(context);
        call.resolve();
    }
}
