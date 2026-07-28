export type PublicConfig = {
  network: "studionet";
  contractAddress: `0x${string}`;
  explorerUrl: string;
};

type PublicEnv = {
  VITE_GENLAYER_NETWORK?: string;
  VITE_GENLAYER_CONTRACT_ADDRESS?: string;
  VITE_GENLAYER_EXPLORER_URL?: string;
};

export function loadPublicConfig(env: PublicEnv): PublicConfig {
  if (env.VITE_GENLAYER_NETWORK !== "studionet") {
    throw new Error("VITE_GENLAYER_NETWORK must be studionet");
  }

  const contractAddress = env.VITE_GENLAYER_CONTRACT_ADDRESS ?? "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) {
    throw new Error("VITE_GENLAYER_CONTRACT_ADDRESS must be a valid contract address");
  }

  const explorerUrl = env.VITE_GENLAYER_EXPLORER_URL ?? "";
  let parsedExplorer: URL;
  try {
    parsedExplorer = new URL(explorerUrl);
  } catch {
    throw new Error("VITE_GENLAYER_EXPLORER_URL must be a valid URL");
  }
  if (parsedExplorer.protocol !== "https:") {
    throw new Error("VITE_GENLAYER_EXPLORER_URL must use https");
  }

  return {
    network: "studionet",
    contractAddress: contractAddress as `0x${string}`,
    explorerUrl: parsedExplorer.toString().replace(/\/$/, "")
  };
}
