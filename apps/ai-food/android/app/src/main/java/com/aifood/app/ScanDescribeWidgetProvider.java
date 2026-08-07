package com.aifood.app;

public final class ScanDescribeWidgetProvider extends AddFoodActionWidgetProvider {
    @Override
    protected String getAction() {
        return "scan-describe";
    }

    @Override
    protected int getIconResId() {
        return R.drawable.ic_widget_pen;
    }

    @Override
    protected int getLabelResId() {
        return R.string.widget_action_scan_describe;
    }

    @Override
    protected int getRequestCode() {
        return 1002;
    }
}
