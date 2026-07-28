import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RegisterAgentView } from "./RegisterAgentView";

vi.mock("../context/ContractContext", () => ({
  useContract: () => ({
    registerAgent: vi.fn(),
    transactionState: { status: "idle" },
    wallet: {
      isConnected: true,
      address: "0x1111111111111111111111111111111111111111"
    }
  })
}));

afterEach(cleanup);

describe("RegisterAgentView", () => {
  it("does not prefill the beneficiary address with a sample wallet", () => {
    render(<RegisterAgentView onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByPlaceholderText("0x...")).toHaveValue("");
  });
});
