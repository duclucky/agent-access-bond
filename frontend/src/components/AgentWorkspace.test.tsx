import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CanonicalSnapshot } from "../types";
import { AgentWorkspace, type ActionFields } from "./AgentWorkspace";

const fields: ActionFields = {
  userAddress: "",
  userAgent: "AgentAccessBot/1.0",
  origin: "https://example.com",
  policyUrl: "https://example.com/policy",
  allowedPurpose: "research",
  operatorBond: "1000000000000000000",
  penaltyAmount: "100000000000000000",
  minimumChallengeBond: "100000000000000000",
  caseId: "case-1",
  targetUrl: "https://example.com/private",
  receiptUrl: "https://example.com/receipt",
  challengeBond: "100000000000000000",
  withdrawAmount: ""
};

const snapshot: CanonicalSnapshot = {
  agent: {
    agent_id: "agent-alpha",
    operator: "0x1111111111111111111111111111111111111111",
    user: "0x2222222222222222222222222222222222222222",
    user_agent: "AgentAccessBot/1.0",
    origin: "https://example.com",
    policy_url: "https://example.com/policy",
    allowed_purpose: "research",
    operator_bond: "1000000000000000000",
    minimum_challenge_bond: "100000000000000000",
    penalty_amount: "100000000000000000",
    status: "QUARANTINED",
    accepted: true,
    active_case_id: "",
    case_count: "1",
    close_proposed_by: "0x0000000000000000000000000000000000000000"
  },
  case: {
    case_id: "case-1",
    agent_id: "agent-alpha",
    opened_by: "0x2222222222222222222222222222222222222222",
    target_url: "https://example.com/private",
    receipt_url: "https://example.com/receipt",
    challenge_bond: "100000000000000000",
    status: "RESOLVED",
    attempt_count: "1",
    verdict_id: "verdict-1",
    bond_settled: true,
    cancel_proposed_by: "0x0000000000000000000000000000000000000000"
  },
  verdict: {
    verdict_id: "verdict-1",
    case_id: "case-1",
    agent_id: "agent-alpha",
    target_url: "https://example.com/private",
    applicability: "MATERIAL_VIOLATION",
    source_coverage: "SUFFICIENT",
    violation_type: "DISALLOWED_PATH",
    required_action: "QUARANTINE_AND_CREDIT",
    matched_fact_ids: "RECEIPT,ROBOTS_RULE,TARGET_PATH,USER_AGENT",
    rationale: "The access did not comply with the agent policy.",
    previous_agent_status: "ACTIVE",
    new_agent_status: "QUARANTINED",
    user_credit_amount: "100000000000000000",
    operator_credit_amount: "0",
    attempt: "1"
  },
  credit: "0",
  accounting: {
    locked_operator_bonds: "1000000000000000000",
    locked_challenge_bonds: "0",
    withdrawable_credits: "0"
  },
  canExecute: false,
  readAt: "2026-07-28T00:00:00.000Z"
};

afterEach(cleanup);

describe("AgentWorkspace product experience", () => {
  it("renders an operator dashboard shell instead of a judge-facing contract page", () => {
    render(
      <AgentWorkspace
        agentId="agent-alpha"
        onAgentIdChange={vi.fn()}
        onRefresh={vi.fn()}
        snapshot={snapshot}
        loading={false}
        readError={null}
        actions={["propose_close"]}
        selectedAction="propose_close"
        onActionChange={vi.fn()}
        fields={fields}
        onFieldChange={vi.fn()}
        onSubmit={vi.fn()}
        busy={false}
      />
    );

    expect(
      screen.getByRole("navigation", { name: "Product sections" })
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /Overview/ })).toBeVisible();
    expect(screen.getByRole("link", { name: /My Agents/ })).toBeVisible();
    expect(screen.getByRole("heading", { name: "AgentAccessBot/1.0" })).toBeVisible();
    expect(screen.getByText("Protection bond")).toBeVisible();
    expect(screen.getByText("Origin")).toBeVisible();
    expect(screen.getByRole("link", { name: /View official website/ })).toBeVisible();
  });

  it("leads with plain-language status and GEN balances", () => {
    render(
      <AgentWorkspace
        agentId="agent-alpha"
        onAgentIdChange={vi.fn()}
        onRefresh={vi.fn()}
        snapshot={snapshot}
        loading={false}
        readError={null}
        actions={["propose_close"]}
        selectedAction="propose_close"
        onActionChange={vi.fn()}
        fields={fields}
        onFieldChange={vi.fn()}
        onSubmit={vi.fn()}
        busy={false}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Access paused" })
    ).toBeVisible();
    expect(screen.getByText("1 GEN locked")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Request closure" })
    ).toBeEnabled();
    expect(screen.queryByText("Canonical read")).not.toBeInTheDocument();
  });

  it("keeps blockchain details collapsed by default", () => {
    const { container } = render(
      <AgentWorkspace
        agentId="agent-alpha"
        onAgentIdChange={vi.fn()}
        onRefresh={vi.fn()}
        snapshot={snapshot}
        loading={false}
        readError={null}
        actions={[]}
        selectedAction={null}
        onActionChange={vi.fn()}
        fields={fields}
        onFieldChange={vi.fn()}
        onSubmit={vi.fn()}
        busy={false}
      />
    );

    expect(
      screen.getByText("Policy breach confirmed")
    ).toBeInTheDocument();
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByText("Technical details")).toBeInTheDocument();
  });

  it("shows the latest review as a user timeline item", () => {
    render(
      <AgentWorkspace
        agentId="agent-alpha"
        onAgentIdChange={vi.fn()}
        onRefresh={vi.fn()}
        snapshot={snapshot}
        loading={false}
        readError={null}
        actions={[]}
        selectedAction={null}
        onActionChange={vi.fn()}
        fields={fields}
        onFieldChange={vi.fn()}
        onSubmit={vi.fn()}
        busy={false}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Access Reviews" })
    ).toBeVisible();
    expect(screen.getByText("Verdict: Policy breach confirmed")).toBeVisible();
    expect(screen.getByText("Review case-1")).toBeVisible();
  });

  it("uses text decimal inputs for GEN amounts so browser locale does not rewrite dots", () => {
    render(
      <AgentWorkspace
        agentId="agent-alpha"
        onAgentIdChange={vi.fn()}
        onRefresh={vi.fn()}
        snapshot={null}
        loading={false}
        readError={null}
        actions={["create_agent"]}
        selectedAction="create_agent"
        onActionChange={vi.fn()}
        fields={{ ...fields, minimumChallengeBond: "0.1" }}
        onFieldChange={vi.fn()}
        onSubmit={vi.fn()}
        busy={false}
      />
    );

    const minimumBond = screen.getByLabelText("Minimum review bond");
    expect(minimumBond).toHaveAttribute("type", "text");
    expect(minimumBond).toHaveAttribute("inputmode", "decimal");
    expect(minimumBond).toHaveValue("0.1");
  });
});
