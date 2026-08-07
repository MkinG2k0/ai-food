package com.aifood.app;

public final class GalleryWidgetProvider extends AddFoodActionWidgetProvider {
    @Override
    protected String getAction() {
        return "gallery";
    }

    @Override
    protected int getLayoutResId() {
        return R.layout.widget_preview_gallery;
    }

    @Override
    protected int getRequestCode() {
        return 1003;
    }
}
