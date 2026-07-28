import { createEVMClient } from "@metamask/connect-evm";

export const STUDIONET_CHAIN_ID = "0xf22f" as const;
const STUDIONET_RPC_URL = "https://studio.genlayer.com/api";
const STUDIONET_EXPLORER_URL = "https://explorer-studio.genlayer.com";

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void
  ) => void;
  providers?: Eip1193Provider[];
};

export type Eip6963ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

export type InjectedWallet = {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
};

const STUDIONET_CHAIN_CONFIGURATION = {
  chainName: "GenLayer Studionet",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18
  },
  rpcUrls: [STUDIONET_RPC_URL],
  blockExplorerUrls: [STUDIONET_EXPLORER_URL]
};

export type MetaMaskConnectClient = {
  connect: (options: { chainIds: Array<`0x${string}`> }) => Promise<{
    accounts: Array<`0x${string}`>;
    chainId: `0x${string}`;
  }>;
  switchChain: (options: {
    chainId: `0x${string}`;
    chainConfiguration: typeof STUDIONET_CHAIN_CONFIGURATION;
  }) => Promise<void>;
  getProvider: () => Eip1193Provider;
};

function isInjectedWallet(value: unknown): value is InjectedWallet {
  if (!value || typeof value !== "object") return false;
  const detail = value as Partial<InjectedWallet>;
  return Boolean(
    detail.provider &&
      typeof detail.provider.request === "function" &&
      detail.info &&
      typeof detail.info.uuid === "string" &&
      detail.info.uuid.length > 0 &&
      typeof detail.info.name === "string" &&
      detail.info.name.length > 0 &&
      typeof detail.info.icon === "string" &&
      typeof detail.info.rdns === "string"
  );
}

export function subscribeToInjectedWallets(
  onWallet: (wallet: InjectedWallet) => void
) {
  const seenUuids = new Set<string>();
  const seenProviders = new Set<Eip1193Provider>();
  const announce = (wallet: InjectedWallet) => {
    if (
      seenUuids.has(wallet.info.uuid) ||
      seenProviders.has(wallet.provider)
    ) {
      return;
    }
    seenUuids.add(wallet.info.uuid);
    seenProviders.add(wallet.provider);
    onWallet(wallet);
  };
  const onAnnouncement = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (isInjectedWallet(detail)) announce(detail);
  };

  window.addEventListener("eip6963:announceProvider", onAnnouncement);
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  const legacy = window.ethereum as Eip1193Provider | undefined;
  const legacyProviders: Eip1193Provider[] =
    legacy?.providers && legacy.providers.length > 0
      ? legacy.providers
      : legacy
        ? [legacy]
        : [];
  legacyProviders.forEach((provider, index) => {
    announce({
      info: {
        uuid: `legacy-wallet-${index}`,
        name:
          legacyProviders.length === 1
            ? "Browser wallet"
            : `Browser wallet ${index + 1}`,
        icon: "",
        rdns: ""
      },
      provider
    });
  });

  return () => {
    window.removeEventListener("eip6963:announceProvider", onAnnouncement);
  };
}

function errorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return Number((error as { code?: unknown }).code);
}

async function switchInjectedProvider(provider: Eip1193Provider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIONET_CHAIN_ID }]
    });
  } catch (error) {
    if (errorCode(error) !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: STUDIONET_CHAIN_ID,
          ...STUDIONET_CHAIN_CONFIGURATION
        }
      ]
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIONET_CHAIN_ID }]
    });
  }
}

export async function createMetaMaskConnectClient(): Promise<MetaMaskConnectClient> {
  return (await createEVMClient({
    dapp: {
      name: "AgentAccessBond",
      url: window.location.origin
    },
    api: {
      supportedNetworks: {
        [STUDIONET_CHAIN_ID]: STUDIONET_RPC_URL
      }
    },
    ui: {
      headless: false,
      preferExtension: true,
      showInstallModal: true
    },
    analytics: {
      enabled: false
    }
  })) as MetaMaskConnectClient;
}

export async function connectStudionetWallet({
  injectedProvider,
  createFallbackClient = createMetaMaskConnectClient
}: {
  injectedProvider?: Eip1193Provider;
  createFallbackClient?: () => Promise<MetaMaskConnectClient>;
} = {}) {
  if (injectedProvider) {
    const accounts = (await injectedProvider.request({
      method: "eth_requestAccounts"
    })) as Array<`0x${string}`>;
    const account = accounts[0];
    if (!account) throw new Error("Wallet returned no account.");
    await switchInjectedProvider(injectedProvider);
    return {
      account,
      provider: injectedProvider,
      transport: "injected" as const
    };
  }

  const client = await createFallbackClient();
  const connection = await client.connect({
    chainIds: [STUDIONET_CHAIN_ID]
  });
  const account = connection.accounts[0];
  if (!account) throw new Error("MetaMask returned no account.");
  await client.switchChain({
    chainId: STUDIONET_CHAIN_ID,
    chainConfiguration: STUDIONET_CHAIN_CONFIGURATION
  });
  return {
    account,
    provider: client.getProvider(),
    transport: "metamask-connect" as const
  };
}
