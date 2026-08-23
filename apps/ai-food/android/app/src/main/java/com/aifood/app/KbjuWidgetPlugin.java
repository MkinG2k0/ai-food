package com.aifood.app;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Capacitor bridge: widgets + Android notification permission helpers. */
@CapacitorPlugin(
    name = "KbjuWidget",
    permissions = {
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
    }
)
public class KbjuWidgetPlugin extends Plugin {

    static final String NOTIFICATIONS = "notifications";

    @PluginMethod
    public void refresh(PluginCall call) {
        WidgetThemeRefresh.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void checkPostNotifications(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", resolveGranted());
        ret.put("runtime", resolveRuntimeState());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPostNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject ret = new JSObject();
            ret.put("granted", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
            call.resolve(ret);
            return;
        }

        if (getPermissionState(NOTIFICATIONS) == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", resolveGranted());
            call.resolve(ret);
            return;
        }

        requestPermissionForAlias(NOTIFICATIONS, call, "postNotificationsCallback");
    }

    @PermissionCallback
    private void postNotificationsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", resolveGranted());
        call.resolve(ret);
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent intent = new Intent();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        } else {
            intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(intent);
        call.resolve();
    }

    private boolean resolveGranted() {
        if (!NotificationManagerCompat.from(getContext()).areNotificationsEnabled()) {
            return false;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return getPermissionState(NOTIFICATIONS) == PermissionState.GRANTED;
        }
        return true;
    }

    private String resolveRuntimeState() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            PermissionState state = getPermissionState(NOTIFICATIONS);
            if (state == PermissionState.GRANTED) {
                return "granted";
            }
            if (state == PermissionState.DENIED) {
                return "denied";
            }
            return "prompt";
        }
        return NotificationManagerCompat.from(getContext()).areNotificationsEnabled()
            ? "granted"
            : "denied";
    }
}
