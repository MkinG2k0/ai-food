package com.aifood.app;

/** 1×1 home widget: calorie-norm streak. */
public class StreakCalorieWidgetProvider extends StreakCardWidgetProvider {

    private static final int REQUEST_OPEN = 2608192;

    @Override
    protected boolean isCalorie() {
        return true;
    }

    @Override
    protected int getLayoutResId() {
        return R.layout.widget_streak_card_calorie;
    }

    @Override
    protected int getRequestCode() {
        return REQUEST_OPEN;
    }
}
