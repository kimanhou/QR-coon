import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // Needed for Docker
    port: 5173,
  },
  plugins: [react()],
});
