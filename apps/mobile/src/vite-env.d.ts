/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_AI_GATEWAY_URL: string;
  readonly VITE_AI_GATEWAY_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
