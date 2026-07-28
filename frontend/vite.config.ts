import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/genlayer-js")) return "genlayer";
          if (id.includes("node_modules/viem")) return "viem";
          if (id.includes("node_modules/lucide-react")) return "icons";
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/")
          ) {
            return "react";
          }
        }
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts"
  }
});
