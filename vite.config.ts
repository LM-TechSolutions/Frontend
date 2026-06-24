import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Dev server runs on 3001 (matches the backend's CORS + trusted origins) and
  // proxies API + WebSocket traffic to the backend on 3000, so the browser sees a
  // single origin — session cookies and Socket.IO "just work" without CORS issues.
  server: {
    port: 3001,
    strictPort: true,
    proxy: {
      '/v1': { target: 'http://localhost:3000', changeOrigin: true, cookieDomainRewrite: 'localhost' },
      '/api': { target: 'http://localhost:3000', changeOrigin: true, cookieDomainRewrite: 'localhost' },
      '/socket.io': { target: 'http://localhost:3000', changeOrigin: true, ws: true },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
