import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "ui-vendor": [
            "@heroui/autocomplete",
            "@heroui/button",
            "@heroui/card",
            "@heroui/chip",
            "@heroui/input",
            "@heroui/modal",
          ],
          "icons-vendor": ["lucide-react"],
          "confetti-vendor": ["canvas-confetti"],
        },
      },
    },
    target: "es2020",
    minify: "esbuild",
    cssMinify: true,
    reportCompressedSize: false,
  },
  server: {
    proxy: {
      "/api/connect.json": {
        target: "https://usis-cdn.eniamza.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        secure: true,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
        },
      },
      "/api/courses.json": {
        target: "https://usis-cdn.eniamza.com",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/courses\.json/, "/connect.json"),
        secure: true,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
        },
      },
      "/api/course-data.json": {
        target: "https://usis-cdn.eniamza.com",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/course-data\.json/, "/connect.json"),
        secure: true,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
        },
      },
      // Proxy routine API calls to Vercel dev server in development
      // Note: Run `vercel dev` on port 3001 for local API testing
      "/api/routine": {
        target: "http://localhost:5174",
        changeOrigin: true,
        rewrite: (path) => path.replace(/\.json/, ""),
      },
    },
  },
});
