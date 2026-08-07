package com.aifood.app;

public final class DescribeWidgetProvider extends AddFoodActionWidgetProvider {
    @Override
    protected String getAction() {
        return "describe";
    }

    @Override
    protected int getIconResId() {
        return R.drawable.ic_widget_pen;
    }

    @Override
    protected int getLabelResId() {
        return R.string.widget_action_describe;
    }

    @Override
    protected int getRequestCode() {
        return 1004;
    }
}
