package com.aifood.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(KbjuWidgetPlugin.class);
        registerPlugin(TelegramSupportPlugin.class);
        super.onCreate(savedInstanceState);
        // Camera <video> preview must autoplay without a user gesture; otherwise
        // Android WebView leaves a giant Play overlay on a paused element.
        Bridge bridge = getBridge();
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
            }
        }
        // Ensure Capacitor sees the launch VIEW URI (widget deep link).
        Intent intent = getIntent();
        if (intent != null) {
            setIntent(intent);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Re-apply Material You / night colors after wallpaper or theme changes.
        WidgetThemeRefresh.refreshAll(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // singleTask: warm start from widget must refresh the Activity intent
        // so Capacitor App.getLaunchUrl / appUrlOpen receive the latest URI.
        setIntent(intent);
    }
}
