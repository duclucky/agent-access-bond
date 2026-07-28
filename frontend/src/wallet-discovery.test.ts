import { afterEach, describe, expect, it, vi } from "vitest";

import {
  subscribeToInjectedWallets,
  type Eip1193Provider,
  type InjectedWallet
} from "./wallet";

function wallet(
  uuid: string,
  name: string,
  provider: Eip1193Provider
): InjectedWallet {
  return {
    info: {
      uuid,
      name,
      icon: "data:image/png;base64,AA==",
      rdns: `io.test.${name.toLowerCase()}`
    },
    provider
  };
}

afterEach(() => {
  Reflect.deleteProperty(window, "ethereum");
});

describe("subscribeToInjectedWallets", () => {
  it("discovers every EIP-6963 wallet announced by installed extensions", () => {
    const rabbyProvider = { request: vi.fn() } as Eip1193Provider;
    const metamaskProvider = { request: vi.fn() } as Eip1193Provider;
    const announced = [
      wallet("rabby-uuid", "Rabby", rabbyProvider),
      wallet("metamask-uuid", "MetaMask", metamaskProvider)
    ];
    const announce = () => {
      for (const detail of announced) {
        window.dispatchEvent(
          new CustomEvent("eip6963:announceProvider", { detail })
        );
      }
    };
    window.addEventListener("eip6963:requestProvider", announce);
    const onWallet = vi.fn();

    const unsubscribe = subscribeToInjectedWallets(onWallet);

    expect(onWallet.mock.calls.map(([item]) => item.info.name)).toEqual([
      "Rabby",
      "MetaMask"
    ]);
    unsubscribe();
    window.removeEventListener("eip6963:requestProvider", announce);
  });

  it("deduplicates announcements and adds a legacy provider only once", () => {
    const provider = { request: vi.fn() } as Eip1193Provider;
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: provider
    });
    const detail = wallet("wallet-uuid", "Browser Wallet", provider);
    const announce = () => {
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", { detail })
      );
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", { detail })
      );
    };
    window.addEventListener("eip6963:requestProvider", announce);
    const onWallet = vi.fn();

    const unsubscribe = subscribeToInjectedWallets(onWallet);

    expect(onWallet).toHaveBeenCalledTimes(1);
    expect(onWallet).toHaveBeenCalledWith(detail);
    unsubscribe();
    window.removeEventListener("eip6963:requestProvider", announce);
  });

  it("does not add a generic legacy proxy when an EIP-6963 wallet is announced", () => {
    const announcedProvider = { request: vi.fn() } as Eip1193Provider;
    const legacyProxy = { request: vi.fn() } as Eip1193Provider;
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: legacyProxy
    });
    const detail = wallet("okx-uuid", "OKX Wallet", announcedProvider);
    const announce = () => {
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", { detail })
      );
    };
    window.addEventListener("eip6963:requestProvider", announce);
    const onWallet = vi.fn();

    const unsubscribe = subscribeToInjectedWallets(onWallet);

    expect(onWallet).toHaveBeenCalledTimes(1);
    expect(onWallet).toHaveBeenCalledWith(detail);
    unsubscribe();
    window.removeEventListener("eip6963:requestProvider", announce);
  });
});
