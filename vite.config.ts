import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5273, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        // Split the two heavy vendors so the app chunk stays small and the
        // charting and icon code can be cached independently.
        manualChunks: {
          recharts: ["recharts"],
          icons: ["@phosphor-icons/react"],
        },
      },
    },
  },
});
