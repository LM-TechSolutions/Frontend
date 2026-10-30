import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

function figmaAssetResolver() {
  return {
    name: "figma-asset-resolver",
    resolveId(id) {
      if (id.startsWith("figma:asset/")) {
        const filename = id.replace("figma:asset/", "");
        return path.resolve(__dirname, "src/assets", filename);
      }
    },
  };
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
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Dev server runs on 3002 and proxies API + WebSocket traffic to the backend
  // on 3001 so the browser sees a single origin — session cookies and Socket.IO
  // "just work" without CORS issues.
  server: {
    port: 3002,
    strictPort: true,
    proxy: {
      "/v1": {
        target: "https://backend-api.tokuma.et",
        changeOrigin: true,
        secure: true,
      },
      "/api": {
        target: "https://backend-api.tokuma.et",
        changeOrigin: true,
        secure: true,
      },
      "/socket.io": {
        target: "https://backend-api.tokuma.et",
        changeOrigin: true,
        ws: true,
        secure: true,
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ["**/*.svg", "**/*.csv"],

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            if (id.includes("@gebeta/tiles") || id.includes("maplibre") || id.includes("leaflet")) {
              return "vendor-maps";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (id.includes("react-router") || id.includes("react-dom") || id.includes("react/")) {
              return "vendor-react";
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
