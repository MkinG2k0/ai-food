package com.aifood.app;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Opens Telegram chat with draft text via system Intent (WebView links drop ?text=). */
@CapacitorPlugin(name = "TelegramSupport")
public class TelegramSupportPlugin extends Plugin {

    private static final String[] TELEGRAM_PACKAGES = {
        "org.telegram.messenger",
        "org.telegram.messenger.web",
    };

    @PluginMethod
    public void openChatWithText(PluginCall call) {
        String username = call.getString("username");
        String text = call.getString("text", "");
        if (username == null || username.isEmpty()) {
            call.reject("username is required");
            return;
        }

        Uri webUri =
            new Uri.Builder()
                .scheme("https")
                .authority("t.me")
                .appendPath(username)
                .appendQueryParameter("text", text)
                .build();

        Uri tgUri =
            new Uri.Builder()
                .scheme("tg")
                .authority("resolve")
                .appendQueryParameter("domain", username)
                .appendQueryParameter("text", text)
                .build();

        if (openWithTelegramPackage(webUri) || openWithTelegramPackage(tgUri) || openGeneric(webUri)) {
            call.resolve();
            return;
        }

        call.reject("Telegram is not available");
    }

    private boolean openWithTelegramPackage(Uri uri) {
        for (String pkg : TELEGRAM_PACKAGES) {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.setPackage(pkg);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (intent.resolveActivity(getContext().getPackageManager()) != null) {
                getActivity().startActivity(intent);
                return true;
            }
        }
        return false;
    }

    private boolean openGeneric(Uri uri) {
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (intent.resolveActivity(getContext().getPackageManager()) != null) {
            getActivity().startActivity(intent);
            return true;
        }
        return false;
    }
}
