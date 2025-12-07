/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  // أضف متغيرات البيئة الأخرى هنا إذا لزم الأمر
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}