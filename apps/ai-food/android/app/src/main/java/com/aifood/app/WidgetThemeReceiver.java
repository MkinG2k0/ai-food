package com.aifood.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * Refreshes widgets when the system enters/exits night mode.
 * Action strings are used instead of {@code UiModeManager} constants
 * (API 30+) so the project compiles on all supported compileSdk setups.
 */
public class WidgetThemeReceiver extends BroadcastReceiver {

    /** Same as UiModeManager.ACTION_ENTERING_NIGHT_MODE (API 30). */
    static final String ACTION_ENTERING_NIGHT_MODE = "android.app.action.ENTERING_NIGHT_MODE";
    /** Same as UiModeManager.ACTION_EXITING_NIGHT_MODE (API 30). */
    static final String ACTION_EXITING_NIGHT_MODE = "android.app.action.EXITING_NIGHT_MODE";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }
        // Night-mode broadcasts exist from API 30; ignore on older runtimes.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return;
        }
        String action = intent.getAction();
        if (ACTION_ENTERING_NIGHT_MODE.equals(action)
            || ACTION_EXITING_NIGHT_MODE.equals(action)) {
            WidgetThemeRefresh.refreshAll(context);
        }
    }
}
