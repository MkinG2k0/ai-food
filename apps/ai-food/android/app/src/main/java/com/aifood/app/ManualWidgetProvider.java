package com.aifood.app;

public final class ManualWidgetProvider extends AddFoodActionWidgetProvider {
    @Override
    protected String getAction() {
        return "manual";
    }

    @Override
    protected int getIconResId() {
        return R.drawable.ic_widget_keyboard;
    }

    @Override
    protected int getLabelResId() {
        return R.string.widget_action_manual;
    }

    @Override
    protected int getRequestCode() {
        return 1005;
    }
}
