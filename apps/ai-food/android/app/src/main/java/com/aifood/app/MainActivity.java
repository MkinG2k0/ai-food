package com.aifood.app;

import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private int lastNightMode = Configuration.UI_MODE_NIGHT_UNDEFINED;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(KbjuWidgetPlugin.class);
        super.onCreate(savedInstanceState);
        // Ensure Capacitor sees the launch VIEW URI (widget deep link).
        Intent intent = getIntent();
        if (intent != null) {
            setIntent(intent);
        }
        lastNightMode = currentNightMode();
    }

    @Override
    protected void onResume() {
        super.onResume();
        int nightMode = currentNightMode();
        if (lastNightMode != Configuration.UI_MODE_NIGHT_UNDEFINED
            && nightMode != lastNightMode) {
            WidgetThemeRefresh.refreshAll(this);
        }
        lastNightMode = nightMode;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // singleTask: warm start from widget must refresh the Activity intent
        // so Capacitor App.getLaunchUrl / appUrlOpen receive the latest URI.
        setIntent(intent);
    }

    private int currentNightMode() {
        return getResources().getConfiguration().uiMode
            & Configuration.UI_MODE_NIGHT_MASK;
    }
}
