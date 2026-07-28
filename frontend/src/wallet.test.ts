import { describe, expect, it, vi } from "vitest";

import {
  STUDIONET_CHAIN_ID,
  createMetaMaskConnectClient,
  connectStudionetWallet,
  type Eip1193Provider,
  type MetaMaskConnectClient
} from "./wallet";

const ACCOUNT = "0x2222222222222222222222222222222222222222" as const;

describe("connectStudionetWallet", () => {
  it("initializes the real MetaMask Connect client through Vite ESM interop", async () => {
    const client = await createMetaMaskConnectClient();

    expect(client).toMatchObject({
      connect: expect.any(Function),
      switchChain: expect.any(Function),
      getProvider: expect.any(Function)
    });
  });

  it("uses an injected provider without requesting the legacy GenLayer Snap", async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_requestAccounts") return [ACCOUNT];
      if (method === "wallet_switchEthereumChain") return null;
      throw new Error(`Unexpected method ${method}`);
    });
    const provider = { request } as Eip1193Provider;

    const result = await connectStudionetWallet({
      injectedProvider: provider,
      createFallbackClient: vi.fn()
    });

    expect(result).toEqual({
      account: ACCOUNT,
      provider,
      transport: "injected"
    });
    expect(request.mock.calls.map(([call]) => call.method)).toEqual([
      "eth_requestAccounts",
      "wallet_switchEthereumChain"
    ]);
    expect(request).not.toHaveBeenCalledWith(
      expect.objectContaining({ method: "wallet_getSnaps" })
    );
  });

  it("adds Studionet when an injected wallet reports an unknown chain", async () => {
    let switchAttempts = 0;
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_requestAccounts") return [ACCOUNT];
      if (method === "wallet_switchEthereumChain") {
        switchAttempts += 1;
        if (switchAttempts === 1) throw { code: 4902 };
        return null;
      }
      if (method === "wallet_addEthereumChain") return null;
      throw new Error(`Unexpected method ${method}`);
    });

    await connectStudionetWallet({
      injectedProvider: { request } as Eip1193Provider,
      createFallbackClient: vi.fn()
    });

    expect(request.mock.calls.map(([call]) => call.method)).toEqual([
      "eth_requestAccounts",
      "wallet_switchEthereumChain",
      "wallet_addEthereumChain",
      "wallet_switchEthereumChain"
    ]);
    expect(request.mock.calls[2]?.[0]).toMatchObject({
      params: [
        expect.objectContaining({
          chainId: STUDIONET_CHAIN_ID,
          rpcUrls: ["https://studio.genlayer.com/api"]
        })
      ]
    });
  });

  it("falls back to MetaMask Connect when no extension injects a provider", async () => {
    const provider = { request: vi.fn() } as Eip1193Provider;
    const connect = vi.fn(async () => ({
      accounts: [ACCOUNT],
      chainId: STUDIONET_CHAIN_ID
    }));
    const switchChain = vi.fn(async () => undefined);
    const fallbackClient: MetaMaskConnectClient = {
      connect,
      switchChain,
      getProvider: () => provider
    };

    const result = await connectStudionetWallet({
      createFallbackClient: vi.fn(async () => fallbackClient)
    });

    expect(connect).toHaveBeenCalledWith({
      chainIds: [STUDIONET_CHAIN_ID]
    });
    expect(switchChain).toHaveBeenCalledWith({
      chainId: STUDIONET_CHAIN_ID,
      chainConfiguration: expect.objectContaining({
        chainName: "GenLayer Studionet"
      })
    });
    expect(result).toEqual({
      account: ACCOUNT,
      provider,
      transport: "metamask-connect"
    });
  });
});
