import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useContract } from "../context/ContractContext";
import { DashboardView } from "./DashboardView";

vi.mock("../context/ContractContext", () => ({
  useContract: vi.fn()
}));

describe("DashboardView", () => {
  it("stays on the dashboard when a canonical inspect fails", async () => {
    const refreshAgent = vi.fn().mockResolvedValue(undefined);
    const onSelectAgent = vi.fn();
    vi.mocked(useContract).mockReturnValue({
      agents: [],
      accounting: {
        total_locked_operator_bonds: 0,
        total_active_challenge_bonds: 0,
        total_slashed_penalties: 0,
        total_claimed_user_credits: 0,
        contract_balance: 0
      },
      can_execute: vi.fn(),
      refreshAgent,
      loading: false,
      lastError: "Studionet is temporarily unavailable."
    } as unknown as ReturnType<typeof useContract>);

    render(
      <DashboardView
        onSelectAgent={onSelectAgent}
        onNavigate={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Enter Agent ID"), {
      target: { value: "agent-alpha" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Inspect" }));

    await waitFor(() => {
      expect(refreshAgent).toHaveBeenCalledWith("agent-alpha");
    });
    expect(onSelectAgent).not.toHaveBeenCalled();
  });
});
