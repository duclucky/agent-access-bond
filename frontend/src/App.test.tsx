import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicConfig } from "./config";
import { App } from "./App";
import { readCanonicalSnapshot } from "./contract";

vi.mock("./contract", () => ({
  createAgentAccessClients: vi.fn(() => ({
    readClient: {},
    writeClient: null
  })),
  readCanonicalSnapshot: vi.fn(),
  submitWriteAndFinalize: vi.fn()
}));

vi.mock("./wallet", () => ({
  connectStudionetWallet: vi.fn(),
  subscribeToInjectedWallets: vi.fn(() => () => undefined)
}));

const config: PublicConfig = {
  network: "studionet",
  contractAddress: "0x37826aA6a75F033D67169b2F8D2616382Ca06522",
  explorerUrl: "https://explorer-studio.genlayer.com"
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("App startup", () => {
  it("does not auto-load the public fixture agent on first render", async () => {
    render(<App config={config} />);

    expect(screen.getByPlaceholderText("Enter Agent ID")).toHaveValue("");
    expect(
      screen.getByRole("heading", { name: /inspect agent bond/i })
    ).toBeVisible();
    expect(screen.queryByText("agent-fixture-policy-001")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(readCanonicalSnapshot).not.toHaveBeenCalled();
    });
  });
});
