import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AccessCase, AgentBond } from "../types";
import { ReviewCasesView } from "./ReviewCasesView";

const { useContractMock } = vi.hoisted(() => ({
  useContractMock: vi.fn()
}));

vi.mock("../context/ContractContext", () => ({
  useContract: () => useContractMock()
}));

const OPERATOR = "0x1111111111111111111111111111111111111111";
const OPENER = "0x2222222222222222222222222222222222222222";

function accessCase(overrides: Partial<AccessCase> = {}): AccessCase {
  return {
    case_id: "case-1",
    agent_id: "agent-alpha",
    event_id: "event-1",
    opened_by: OPENER,
    target_url: "https://example.com/private",
    receipt_url: "https://example.com/receipt.json",
    challenge_bond: 10,
    status: "OPEN",
    attempt_count: 0,
    bond_settled: false,
    created_at: "2026-07-30T10:00:00Z",
    ...overrides
  };
}

function agent(caseRecord: AccessCase): AgentBond {
  return {
    agent_id: "agent-alpha",
    operator: OPERATOR,
    user: "0x3333333333333333333333333333333333333333",
    user_agent: "AgentAccessBot/1.0",
    origin: "https://example.com",
    policy_url: "https://example.com/policy/v1.txt",
    attestor_public_key: `0x04${"11".repeat(64)}`,
    allowed_purpose: "Read public pages",
    operator_bond: 100,
    minimum_challenge_bond: 10,
    penalty_amount: 25,
    status: "PENDING_REVIEW",
    accepted: true,
    active_case_id: caseRecord.case_id,
    case_count: 1,
    cases: [caseRecord],
    created_at: "2026-07-30T09:00:00Z"
  };
}

function renderCase(caseRecord: AccessCase, walletAddress: string) {
  const retryCase = vi.fn().mockResolvedValue(undefined);
  const proposeCaseCancel = vi.fn().mockResolvedValue(undefined);
  const acceptCaseCancel = vi.fn().mockResolvedValue(undefined);
  const currentAgent = agent(caseRecord);
  useContractMock.mockReturnValue({
    agents: [currentAgent],
    wallet: { isConnected: true, address: walletAddress },
    transactionState: { status: "idle" },
    openChallenge: vi.fn(),
    adjudicateCase: vi.fn(),
    retryCase,
    proposeCaseCancel,
    acceptCaseCancel,
    get_agent: () => currentAgent
  });
  render(<ReviewCasesView onSelectAgent={vi.fn()} />);
  fireEvent.click(
    screen.getByRole("button", {
      name: caseRecord.status === "OPEN" ? /review & adjudicate/i : /view verdict/i
    })
  );
  return { retryCase, proposeCaseCancel, acceptCaseCancel };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ReviewCasesView recovery actions", () => {
  it("lets a case party retry a RETRYABLE review", async () => {
    const methods = renderCase(accessCase({ status: "RETRYABLE" }), OPENER);

    fireEvent.click(screen.getByRole("button", { name: /retry review/i }));

    await waitFor(() => {
      expect(methods.retryCase).toHaveBeenCalledWith("case-1");
    });
  });

  it("lets the operator request cancellation of an unresolved case", async () => {
    const methods = renderCase(accessCase(), OPERATOR);

    fireEvent.click(
      screen.getByRole("button", { name: /request case cancellation/i })
    );

    await waitFor(() => {
      expect(methods.proposeCaseCancel).toHaveBeenCalledWith("case-1");
    });
  });

  it("lets the other party confirm a pending cancellation", async () => {
    const methods = renderCase(
      accessCase({ cancel_proposed_by: OPERATOR }),
      OPENER
    );

    fireEvent.click(
      screen.getByRole("button", { name: /confirm case cancellation/i })
    );

    await waitFor(() => {
      expect(methods.acceptCaseCancel).toHaveBeenCalledWith("case-1");
    });
  });
});

