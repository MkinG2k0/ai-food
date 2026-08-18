package com.aifood.app;

/** 1×1 home widget: diary logging streak. */
public class StreakDiaryWidgetProvider extends StreakCardWidgetProvider {

    private static final int REQUEST_OPEN = 2608191;

    @Override
    protected boolean isCalorie() {
        return false;
    }

    @Override
    protected int getLayoutResId() {
        return R.layout.widget_streak_card_diary;
    }

    @Override
    protected int getRequestCode() {
        return REQUEST_OPEN;
    }
}
