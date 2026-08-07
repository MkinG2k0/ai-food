package com.aifood.app;

public final class GalleryWidgetProvider extends AddFoodActionWidgetProvider {
    @Override
    protected String getAction() {
        return "gallery";
    }

    @Override
    protected int getIconResId() {
        return R.drawable.ic_widget_gallery;
    }

    @Override
    protected int getLabelResId() {
        return R.string.widget_action_gallery;
    }

    @Override
    protected int getRequestCode() {
        return 1003;
    }
}
