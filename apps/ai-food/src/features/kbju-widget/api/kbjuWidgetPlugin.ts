import { registerPlugin } from '@capacitor/core';

export interface KbjuWidgetPlugin {
  refresh(): Promise<void>;
}

/** Native plugin: refreshes KBJU rings AppWidget. Web stub is a no-op. */
export const KbjuWidget = registerPlugin<KbjuWidgetPlugin>('KbjuWidget', {
  web: {
    async refresh() {
      /* no-op on web */
    },
  },
});
