/// <reference types="vite/client" />

import type { WalletProvider } from "./contract";

declare global {
  interface Window {
    ethereum?: WalletProvider & {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, listener: (...args: unknown[]) => void) => void;
      removeListener?: (
        event: string,
        listener: (...args: unknown[]) => void
      ) => void;
    };
  }
}

export {};
