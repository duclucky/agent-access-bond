import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RegisterAgentView } from "./RegisterAgentView";

const registerAgent = vi.fn().mockResolvedValue("agent-created");

vi.mock("../context/ContractContext", () => ({
  useContract: () => ({
    registerAgent,
    transactionState: { status: "idle" },
    wallet: {
      isConnected: true,
      address: "0x1111111111111111111111111111111111111111"
    }
  })
}));

afterEach(() => {
  cleanup();
  registerAgent.mockClear();
});

describe("RegisterAgentView", () => {
  it("does not prefill the beneficiary address with a sample wallet", () => {
    render(<RegisterAgentView onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByPlaceholderText("0x...")).toHaveValue("");
  });

  it("requires and submits the immutable runner attestor public key", async () => {
    render(<RegisterAgentView onSuccess={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("https://api.my-domain.com"), {
      target: { value: "https://example.com" }
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. AAB-IndexerBot/1.0"), {
      target: { value: "AgentAccessBot/1.0" }
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        "https://github.com/my-org/policies/agent-policy.md"
      ),
      { target: { value: "https://example.com/policy/v1.txt" } }
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        /Describe the exact scope, permitted paths/i
      ),
      { target: { value: "Read public pages only" } }
    );
    const attestorKey = `0x04${"11".repeat(64)}`;
    fireEvent.change(
      screen.getByPlaceholderText("0x04... uncompressed secp256k1 public key"),
      { target: { value: attestorKey } }
    );

    fireEvent.click(
      screen.getByRole("button", { name: /create agent draft bond/i })
    );

    await waitFor(() => {
      expect(registerAgent).toHaveBeenCalledWith(
        expect.objectContaining({ attestor_public_key: attestorKey })
      );
    });
  });
});
