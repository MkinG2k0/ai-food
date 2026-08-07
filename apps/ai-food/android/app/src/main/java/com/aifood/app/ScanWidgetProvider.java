package com.aifood.app;

public final class ScanWidgetProvider extends AddFoodActionWidgetProvider {
    @Override
    protected String getAction() {
        return "scan";
    }

    @Override
    protected int getLayoutResId() {
        return R.layout.widget_preview_scan;
    }

    @Override
    protected int getRequestCode() {
        return 1001;
    }
}
