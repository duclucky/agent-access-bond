import { describe, expect, it, vi } from "vitest";

import {
  availableActions,
  canOpenAccessCase,
  closureAction,
  executeAndRefresh
} from "./workspace";
import type { CanonicalSnapshot } from "./types";

const OPERATOR = "0x1111111111111111111111111111111111111111";
const USER = "0x2222222222222222222222222222222222222222";

function snapshot(overrides: Partial<CanonicalSnapshot> = {}): CanonicalSnapshot {
  return {
    agent: {
      agent_id: "agent-alpha",
      operator: OPERATOR,
      user: USER,
      user_agent: "AgentAccessBot/1.0",
      origin: "https://example.com",
      policy_url: "https://example.com/policy",
      attestor_public_key: `0x04${"11".repeat(64)}`,
      allowed_purpose: "research",
      operator_bond: "500",
      minimum_challenge_bond: "10",
      penalty_amount: "100",
      status: "ACTIVE",
      accepted: true,
      active_case_id: "",
      case_count: "0",
      close_proposed_by: "0x0000000000000000000000000000000000000000"
    },
    case: null,
    verdict: null,
    credit: "0",
    accounting: {
      locked_operator_bonds: "500",
      locked_challenge_bonds: "0",
      withdrawable_credits: "0"
    },
    canExecute: true,
    readAt: "2026-07-28T00:00:00.000Z",
    ...overrides
  };
}

describe("availableActions", () => {
  it("derives operator and challenge actions from canonical ACTIVE state", () => {
    expect(availableActions(snapshot(), OPERATOR)).toEqual(
      expect.arrayContaining(["open_access_case", "propose_close"])
    );
    expect(availableActions(snapshot(), OPERATOR)).not.toContain("accept_agent");
  });

  it("enables adjudication only while a case is OPEN", () => {
    const openCase = snapshot({
      agent: {
        ...snapshot().agent!,
        active_case_id: "case-1"
      },
      case: {
        case_id: "case-1",
        agent_id: "agent-alpha",
        event_id: "event-1",
        opened_by: USER,
        target_url: "https://example.com/private",
        receipt_url: "https://example.com/receipt",
        challenge_bond: "10",
        status: "OPEN",
        attempt_count: "0",
        verdict_id: "",
        bond_settled: false,
        cancel_proposed_by: "0x0000000000000000000000000000000000000000"
      },
      canExecute: false
    });

    expect(availableActions(openCase, OPERATOR)).toContain("adjudicate_case");
    expect(availableActions(openCase, OPERATOR)).toContain("propose_case_cancel");
    expect(availableActions(openCase, OPERATOR)).not.toContain("retry_case");
  });

  it("lets the other case party accept a pending cancellation", () => {
    const base = snapshot();
    const pendingCancel = snapshot({
      agent: {
        ...base.agent!,
        active_case_id: "case-1"
      },
      case: {
        case_id: "case-1",
        agent_id: "agent-alpha",
        event_id: "event-1",
        opened_by: USER,
        target_url: "https://example.com/private",
        receipt_url: "https://example.com/receipt",
        challenge_bond: "10",
        status: "OPEN",
        attempt_count: "0",
        verdict_id: "",
        bond_settled: false,
        cancel_proposed_by: OPERATOR
      },
      canExecute: false
    });

    expect(availableActions(pendingCancel, USER)).toContain("accept_case_cancel");
    expect(availableActions(pendingCancel, USER)).not.toContain(
      "propose_case_cancel"
    );
  });
});

describe("closureAction", () => {
  it("does not let the proposing party accept its own closure request", () => {
    const agent = {
      ...snapshot().agent!,
      close_proposed_by: OPERATOR
    };

    expect(closureAction(agent, OPERATOR)).toBeNull();
    expect(closureAction(agent, USER)).toBe("accept_close");
  });

  it("offers a closure proposal only to a connected agent party", () => {
    const agent = snapshot().agent!;

    expect(closureAction(agent, OPERATOR)).toBe("propose_close");
    expect(closureAction(agent, USER)).toBe("propose_close");
    expect(
      closureAction(agent, "0x3333333333333333333333333333333333333333")
    ).toBeNull();
  });
});

describe("canOpenAccessCase", () => {
  it("matches the contract status and active-case preconditions", () => {
    const activeAgent = snapshot().agent!;

    expect(canOpenAccessCase(activeAgent)).toBe(true);
    expect(
      canOpenAccessCase({ ...activeAgent, status: "PENDING_REVIEW" })
    ).toBe(true);
    expect(canOpenAccessCase({ ...activeAgent, status: "QUARANTINED" })).toBe(
      false
    );
    expect(canOpenAccessCase({ ...activeAgent, accepted: false })).toBe(false);
    expect(
      canOpenAccessCase({ ...activeAgent, active_case_id: "case-1" })
    ).toBe(false);
  });
});

describe("executeAndRefresh", () => {
  it("refreshes canonical state only after the write finalizes", async () => {
    const order: string[] = [];
    const submit = vi.fn(async () => {
      order.push("finalized");
      return "0xabc";
    });
    const refresh = vi.fn(async () => {
      order.push("refreshed");
      return snapshot();
    });

    const result = await executeAndRefresh({ submit, refresh });

    expect(result.hash).toBe("0xabc");
    expect(order).toEqual(["finalized", "refreshed"]);
  });

  it("does not refresh after a failed write", async () => {
    const refresh = vi.fn(async () => snapshot());

    await expect(
      executeAndRefresh({
        submit: async () => {
          throw new Error("Signature rejected");
        },
        refresh
      })
    ).rejects.toThrow("Signature rejected");
    expect(refresh).not.toHaveBeenCalled();
  });
});
