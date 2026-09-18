import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// MANILI — Vite config.
// base задаётся через VITE_BASE_PATH: '/' для кастомного домена manili-event.ru,
// '/shop/' если раздача идёт с github.io/<repo>/.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          // Отдельные чанки для библиотек: они меняются реже кода приложения,
          // поэтому браузер переиспользует их между релизами (ТЗ §30).
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('react-router') || id.includes('@remix-run')) return 'router'
            if (id.includes('react-dom') || id.includes('scheduler') || /node_modules\/react\//.test(id)) {
              return 'react'
            }
            if (id.includes('appwrite')) return 'appwrite'
            return 'vendor'
          },
        },
      },
    },
  }
})
