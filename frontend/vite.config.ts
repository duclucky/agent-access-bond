import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
const mobileWalletProtocolCore = resolve(
  dirname(
    require.resolve("@metamask/mobile-wallet-protocol-core/package.json")
  ),
  "dist/index.mjs"
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // The package ships ESM but does not declare it, so Rollup otherwise
      // wraps the CommonJS entry without the named exports used by Connect.
      "@metamask/mobile-wallet-protocol-core": mobileWalletProtocolCore
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
