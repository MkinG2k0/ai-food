package com.aifood.app;

public final class ScanDescribeWidgetProvider extends AddFoodActionWidgetProvider {
    @Override
    protected String getAction() {
        return "scan-describe";
    }

    @Override
    protected int getLayoutResId() {
        return R.layout.widget_preview_scan_describe;
    }

    @Override
    protected int getRequestCode() {
        return 1002;
    }
}
