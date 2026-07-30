import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import type { PublicConfig } from "./config";
import { readCanonicalSnapshot } from "./contract";

vi.mock("./contract", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./contract")>()),
  createAgentAccessClients: vi.fn(() => ({
    readClient: {},
    writeClient: null,
    contractAddress: "0x37826aA6a75F033D67169b2F8D2616382Ca06522"
  })),
  readCanonicalSnapshot: vi.fn()
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

describe("live product UI", () => {
  it("starts as an empty contract-backed workspace instead of a fake agent directory", async () => {
    render(<App config={config} />);

    expect(
      screen.getByRole("heading", { name: /inspect agent bond/i })
    ).toBeVisible();
    expect(screen.queryByText("AGENT-8821")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(readCanonicalSnapshot).not.toHaveBeenCalled();
    });
  });

  it("exposes only user-facing product navigation", () => {
    render(<App config={config} />);

    expect(screen.getAllByRole("button", { name: "Dashboard" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Register Agent" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Review Cases" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Credits" }).length).toBeGreaterThan(0);

    expect(screen.queryByText("Integrator API")).not.toBeInTheDocument();
    expect(screen.queryByText("Settings & Role")).not.toBeInTheDocument();
    expect(screen.queryByText("Contract Repo")).not.toBeInTheDocument();
    expect(screen.queryByText("v1.0.4-GENLAYER")).not.toBeInTheDocument();
  });

  it("uses English application validation instead of localized browser prompts", async () => {
    render(<App config={config} />);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Register Agent" })[0]
    );
    const registerButton = screen.getByRole("button", {
      name: /create agent draft bond/i
    });
    expect(registerButton.closest("form")).toHaveAttribute("novalidate");

    await userEvent.click(registerButton);
    expect(
      screen.getByText("Please fill in all required agent identity and policy fields.")
    ).toBeVisible();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Review Cases" })[0]
    );
    await userEvent.click(
      screen.getByRole("button", { name: /submit evidence challenge/i })
    );
    const challengeButton = screen.getByRole("button", {
      name: /lock bond & open case/i
    });
    expect(challengeButton.closest("form")).toHaveAttribute("novalidate");

    await userEvent.click(challengeButton);
    expect(
      screen.getByText(
        "Enter the signed event ID, target URL, and public action receipt URL."
      )
    ).toBeVisible();
  });

  it("reads the searched agent from canonical contract views", async () => {
    vi.mocked(readCanonicalSnapshot).mockResolvedValueOnce({
      agent: {
        agent_id: "agent-fixture-policy-001",
        operator: "0xc495ef51618d03267a1f227afe5b27b38c748272",
        user: "0x45ad397c438397a702b53a7499a78d08961d39db",
        user_agent: "AgentAccessBot/1.0",
        origin: "https://raw.githubusercontent.com",
        policy_url: "https://raw.githubusercontent.com/duclucky/agent-access-bond/main/docs/evidence/public-fixtures/agent-policy.txt",
        attestor_public_key: `0x04${"11".repeat(64)}`,
        allowed_purpose: "public search research only",
        operator_bond: "1000000000000000000",
        minimum_challenge_bond: "100000000000000000",
        penalty_amount: "1000000000000000000",
        status: "QUARANTINED",
        accepted: true,
        active_case_id: "",
        case_count: "1",
        close_proposed_by: ""
      },
      case: null,
      verdict: null,
      credit: "0",
      accounting: {
        locked_operator_bonds: "1000000000000000000",
        locked_challenge_bonds: "0",
        withdrawable_credits: "0"
      },
      canExecute: false,
      readAt: "2026-07-28T00:00:00.000Z"
    });

    render(<App config={config} />);

    await userEvent.type(
      screen.getByPlaceholderText(/enter agent id/i),
      "agent-fixture-policy-001"
    );
    await userEvent.click(screen.getByRole("button", { name: /inspect/i }));

    await waitFor(() => {
      expect(readCanonicalSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          contractAddress: config.contractAddress,
          agentId: "agent-fixture-policy-001"
        })
      );
    });
    expect(
      await screen.findByRole("heading", { name: "agent-fixture-policy-001" })
    ).toBeVisible();
    expect(screen.getAllByText(/quarantined/i).length).toBeGreaterThan(0);
  });
});
