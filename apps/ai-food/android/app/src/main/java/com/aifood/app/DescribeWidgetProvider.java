package com.aifood.app;

public final class DescribeWidgetProvider extends AddFoodActionWidgetProvider {
    @Override
    protected String getAction() {
        return "describe";
    }

    @Override
    protected int getLayoutResId() {
        return R.layout.widget_preview_describe;
    }

    @Override
    protected int getRequestCode() {
        return 1004;
    }
}
