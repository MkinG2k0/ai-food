package com.aifood.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Ensure Capacitor sees the launch VIEW URI (widget deep link).
        Intent intent = getIntent();
        if (intent != null) {
            setIntent(intent);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // singleTask: warm start from widget must refresh the Activity intent
        // so Capacitor App.getLaunchUrl / appUrlOpen receive the latest URI.
        setIntent(intent);
    }
}
