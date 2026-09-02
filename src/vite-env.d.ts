/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_KINDI_AI_ENABLED?: string;
  readonly VITE_GEOGRAPHY_TILE_URL?: string;
  readonly VITE_GEOGRAPHY_LABEL_TILE_URL?: string;
  readonly VITE_GEOGRAPHY_TILE_ATTRIBUTION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __LAST_LAYOUT_DURATION__?: number;
  __LAST_LAYOUT_CACHED__?: boolean;
}
