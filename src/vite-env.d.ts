/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND?: 'mock' | 'appwrite'
  readonly VITE_APPWRITE_ENDPOINT?: string
  readonly VITE_APPWRITE_PROJECT_ID?: string
  readonly VITE_APPWRITE_DATABASE_ID?: string
  readonly VITE_APPWRITE_BUCKET_ID?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SITE_URL?: string
  readonly VITE_BASE_PATH?: string
  readonly VITE_SUPPORT_EMAIL?: string
  readonly VITE_SUPPORT_PHONE?: string
  readonly VITE_SOCIAL_TELEGRAM?: string
  readonly VITE_SOCIAL_VK?: string
  readonly VITE_SOCIAL_INSTAGRAM?: string
  readonly VITE_MARKETPLACE_WB?: string
  readonly VITE_MARKETPLACE_OZON?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
