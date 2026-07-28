import { describe, expect, it } from "vitest";

import { loadPublicConfig } from "./config";

const ADDRESS = "0x1111111111111111111111111111111111111111";

describe("loadPublicConfig", () => {
  it("accepts a complete Studionet configuration", () => {
    expect(
      loadPublicConfig({
        VITE_GENLAYER_NETWORK: "studionet",
        VITE_GENLAYER_CONTRACT_ADDRESS: ADDRESS,
        VITE_GENLAYER_EXPLORER_URL: "https://explorer.example"
      })
    ).toEqual({
      network: "studionet",
      contractAddress: ADDRESS,
      explorerUrl: "https://explorer.example"
    });
  });

  it("rejects an invalid contract address", () => {
    expect(() =>
      loadPublicConfig({
        VITE_GENLAYER_NETWORK: "studionet",
        VITE_GENLAYER_CONTRACT_ADDRESS: "not-an-address",
        VITE_GENLAYER_EXPLORER_URL: "https://explorer.example"
      })
    ).toThrow("valid contract address");
  });

  it("rejects a non-Studionet network", () => {
    expect(() =>
      loadPublicConfig({
        VITE_GENLAYER_NETWORK: "localnet",
        VITE_GENLAYER_CONTRACT_ADDRESS: ADDRESS,
        VITE_GENLAYER_EXPLORER_URL: "https://explorer.example"
      })
    ).toThrow("studionet");
  });
});
