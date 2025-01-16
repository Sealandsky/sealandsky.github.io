import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  base: '/hanzi-stroke-order/',
  plugins: [vue()],
  optimizeDeps: {
    include: ['hanzi-writer', 'hanzi-writer-data/*']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  assetsInclude: ['**/*.json'],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    commonjsOptions: {
      include: [/hanzi-writer/, /hanzi-writer-data/, /node_modules/]
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'hanzi-writer': ['hanzi-writer'],
          'vue': ['vue']
        }
      }
    }
  }
}) 