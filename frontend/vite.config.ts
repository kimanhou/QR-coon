import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // Needed for Docker
    port: 5173,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        /* copy manifest logic here */
      },
    }),
  ],
  resolve: {
    alias: {
      db: path.resolve(__dirname, "./src/db.ts"),
      components: path.resolve(__dirname, "./src/components"),
      hooks: path.resolve(__dirname, "./src/hooks"),
      pages: path.resolve(__dirname, "./src/pages"),
      sass: path.resolve(__dirname, "./src/sass"),
      utils: path.resolve(__dirname, "./src/utils"),
    },
  },
});
