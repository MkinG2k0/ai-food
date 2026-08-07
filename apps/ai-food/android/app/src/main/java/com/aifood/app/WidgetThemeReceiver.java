package com.aifood.app;

import android.app.UiModeManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Refreshes widgets when the system enters/exits night mode. */
public class WidgetThemeReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return;
        }
        String action = intent.getAction();
        if (UiModeManager.ACTION_ENTERING_NIGHT_MODE.equals(action)
            || UiModeManager.ACTION_EXITING_NIGHT_MODE.equals(action)) {
            WidgetThemeRefresh.refreshAll(context);
        }
    }
}
