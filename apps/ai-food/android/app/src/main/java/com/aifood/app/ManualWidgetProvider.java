package com.aifood.app;

public final class ManualWidgetProvider extends AddFoodActionWidgetProvider {
    @Override
    protected String getAction() {
        return "manual";
    }

    @Override
    protected int getLayoutResId() {
        return R.layout.widget_preview_manual;
    }

    @Override
    protected int getRequestCode() {
        return 1005;
    }
}
