/// <reference types="vite/client" />

import type { WalletProvider } from "./contract";
import type { Eip1193Provider } from "./wallet";

declare global {
  interface Window {
    ethereum?: WalletProvider & Eip1193Provider;
  }
}

export {};
