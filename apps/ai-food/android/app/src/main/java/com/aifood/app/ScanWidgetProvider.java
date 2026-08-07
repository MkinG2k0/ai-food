package com.aifood.app;

public final class ScanWidgetProvider extends AddFoodActionWidgetProvider {
    @Override
    protected String getAction() {
        return "scan";
    }

    @Override
    protected int getIconResId() {
        return R.drawable.ic_widget_camera;
    }

    @Override
    protected int getLabelResId() {
        return R.string.widget_action_scan;
    }

    @Override
    protected int getRequestCode() {
        return 1001;
    }
}
