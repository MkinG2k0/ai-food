package com.aifood.app;

public final class FavoritesWidgetProvider extends AddFoodActionWidgetProvider {
    @Override
    protected String getAction() {
        return "favorites";
    }

    @Override
    protected int getLayoutResId() {
        return R.layout.widget_preview_favorites;
    }

    @Override
    protected int getRequestCode() {
        return 1006;
    }
}
