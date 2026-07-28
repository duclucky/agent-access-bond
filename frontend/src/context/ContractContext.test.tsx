import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicConfig } from "../config";
import {
  createAgentAccessClients,
  readCanonicalSnapshot,
  submitWriteAndFinalize
} from "../contract";
import {
  connectStudionetWallet,
  getAuthorizedStudionetAccount,
  subscribeToInjectedWallets
} from "../wallet";
import { rememberAgentId } from "../local-agent-index";
import { ContractProvider, useContract } from "./ContractContext";

vi.mock("../contract", () => ({
  createAgentAccessClients: vi.fn(),
  readCanonicalSnapshot: vi.fn(),
  submitWriteAndFinalize: vi.fn()
}));

vi.mock("../wallet", () => ({
  requestInjectedWallets: vi.fn(),
  subscribeToInjectedWallets: vi.fn(() => () => undefined),
  connectStudionetWallet: vi.fn(),
  getAuthorizedStudionetAccount: vi.fn()
}));

const config: PublicConfig = {
  network: "studionet",
  contractAddress: "0x37826aA6a75F033D67169b2F8D2616382Ca06522",
  explorerUrl: "https://explorer-studio.genlayer.com"
};

function TransactionProbe() {
  const { connectWallet, registerAgent, transactionState } = useContract();
  return (
    <>
      <button type="button" onClick={connectWallet}>
        Connect
      </button>
      <button
        type="button"
        onClick={() =>
          void registerAgent({
            origin: "https://example.com",
            user_agent: "AgentAccessBot/1.0",
            user: "0x45ad397c438397a702b53a7499a78d08961d39db",
            policy_url: "https://example.com/policy.txt",
            allowed_purpose: "Read public pages",
            operator_bond: 100,
            minimum_challenge_bond: 10,
            penalty_amount: 25
          })
        }
      >
        Register
      </button>
      <output>{`${transactionState.status}:${transactionState.operation}:${transactionState.hash}`}</output>
    </>
  );
}

function StateProbe() {
  const { wallet, agents } = useContract();
  return (
    <>
      <output aria-label="wallet-address">{wallet.address}</output>
      <ul>
        {agents.map((agent) => (
          <li key={agent.agent_id}>{agent.agent_id}</li>
        ))}
      </ul>
    </>
  );
}

describe("ContractProvider transaction lifecycle", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("restores an authorized injected wallet and reloads remembered agents from canonical state", async () => {
    const provider = { request: vi.fn() };
    rememberAgentId("agent-reload", "0xc495ef51618d03267a1f227afe5b27b38c748272");
    vi.mocked(subscribeToInjectedWallets).mockImplementation((onWallet) => {
      onWallet({
        info: {
          uuid: "wallet-1",
          name: "Browser Wallet",
          icon: "",
          rdns: "io.test.wallet"
        },
        provider
      });
      return () => undefined;
    });
    vi.mocked(getAuthorizedStudionetAccount).mockResolvedValue(
      "0xc495ef51618d03267a1f227afe5b27b38c748272"
    );
    vi.mocked(createAgentAccessClients).mockReturnValue({
      readClient: {} as never,
      writeClient: {} as never,
      contractAddress: config.contractAddress
    });
    vi.mocked(readCanonicalSnapshot).mockResolvedValue({
      agent: {
        agent_id: "agent-reload",
        operator: "0xc495ef51618d03267a1f227afe5b27b38c748272",
        user: "0x45ad397c438397a702b53a7499a78d08961d39db",
        user_agent: "AgentAccessBot/1.0",
        origin: "https://example.com",
        policy_url: "https://example.com/policy.txt",
        allowed_purpose: "Read public pages",
        operator_bond: "100000000000000000000",
        minimum_challenge_bond: "10000000000000000000",
        penalty_amount: "25000000000000000000",
        status: "DRAFT",
        accepted: false,
        active_case_id: "",
        case_count: "0",
        close_proposed_by: "0x0000000000000000000000000000000000000000"
      },
      case: null,
      verdict: null,
      credit: "0",
      accounting: {
        locked_operator_bonds: "100000000000000000000",
        locked_challenge_bonds: "0",
        withdrawable_credits: "0"
      },
      canExecute: false,
      readAt: "2026-07-29T00:00:00.000Z"
    });

    render(
      <ContractProvider config={config}>
        <StateProbe />
      </ContractProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("wallet-address")).toHaveTextContent(
        "0xc495ef51618d03267a1f227afe5b27b38c748272"
      );
      expect(screen.getByText("agent-reload")).toBeVisible();
    });
    expect(getAuthorizedStudionetAccount).toHaveBeenCalledWith(provider);
    expect(readCanonicalSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: "agent-reload" })
    );
  });

  it("publishes the finalized create-agent transaction to the UI", async () => {
    vi.mocked(createAgentAccessClients).mockReturnValue({
      readClient: {} as never,
      writeClient: {} as never,
      contractAddress: config.contractAddress
    });
    vi.mocked(connectStudionetWallet).mockResolvedValue({
      account: "0xc495ef51618d03267a1f227afe5b27b38c748272",
      provider: {} as never,
      transport: "metamask-connect"
    });
    vi.mocked(submitWriteAndFinalize).mockImplementation(async ({ onStatus }) => {
      onStatus("submitted", "0xabc");
      onStatus("accepted", "0xabc");
      onStatus("finalized", "0xabc");
      return "0xabc";
    });
    vi.mocked(readCanonicalSnapshot).mockResolvedValue({
      agent: null,
      case: null,
      verdict: null,
      credit: "0",
      accounting: {
        locked_operator_bonds: "0",
        locked_challenge_bonds: "0",
        withdrawable_credits: "0"
      },
      canExecute: false,
      readAt: "2026-07-28T00:00:00.000Z"
    });

    render(
      <ContractProvider config={config}>
        <TransactionProbe />
      </ContractProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    fireEvent.click(
      screen.getByRole("button", { name: "MetaMask mobile or QR" })
    );
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Connect wallet" })
      ).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "finalized:create_agent:0xabc"
      );
    });
  });
});
