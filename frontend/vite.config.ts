import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The package ships ESM but does not declare it, so Rollup otherwise
      // wraps the CommonJS entry without the named exports used by Connect.
      "@metamask/mobile-wallet-protocol-core": fileURLToPath(
        new URL(
          "../node_modules/@metamask/mobile-wallet-protocol-core/dist/index.mjs",
          import.meta.url
        )
      )
    }
  },
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
