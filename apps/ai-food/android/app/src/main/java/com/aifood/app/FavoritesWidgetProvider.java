package com.aifood.app;

public final class FavoritesWidgetProvider extends AddFoodActionWidgetProvider {
    @Override
    protected String getAction() {
        return "favorites";
    }

    @Override
    protected int getIconResId() {
        return R.drawable.ic_widget_star;
    }

    @Override
    protected int getLabelResId() {
        return R.string.widget_action_favorites;
    }

    @Override
    protected int getRequestCode() {
        return 1006;
    }
}
