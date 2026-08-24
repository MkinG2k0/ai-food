/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_AI_GATEWAY_URL: string;
  readonly VITE_AI_GATEWAY_API_KEY: string;
  readonly VITE_TELEGRAM_BOT_USERNAME?: string;
  readonly VITE_AUTH_MOCK?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
