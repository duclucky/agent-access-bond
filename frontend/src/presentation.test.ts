import { describe, expect, it } from "vitest";

import {
  accessEventTimestamp,
  formatGen,
  friendlyAction,
  friendlyCaseStatus,
  friendlyStatus,
  friendlyVerdict,
  friendlyVerdictTone,
  parseGen,
  shortAddress
} from "./presentation";

describe("product presentation", () => {
  it("formats wei balances as readable GEN amounts", () => {
    expect(formatGen("1000000000000000000")).toBe("1 GEN");
    expect(formatGen("100000000000000000")).toBe("0.1 GEN");
    expect(formatGen("0")).toBe("0 GEN");
    expect(parseGen("1.25")).toBe(1250000000000000000n);
  });

  it("shortens wallet addresses without losing identity", () => {
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234...5678"
    );
  });

  it("translates contract state into product language", () => {
    expect(friendlyStatus("QUARANTINED", false)).toEqual({
      label: "Access paused",
      summary: "This agent cannot take new work.",
      tone: "danger"
    });
    expect(friendlyVerdict("MATERIAL_VIOLATION")).toBe(
      "Policy breach confirmed"
    );
    expect(friendlyVerdictTone("MATERIAL_VIOLATION")).toBe("danger");
    expect(friendlyVerdictTone("COMPLIANT")).toBe("success");
    expect(friendlyVerdictTone("UNVERIFIABLE")).toBe("warning");
    expect(friendlyAction("propose_close")).toBe("Request closure");
    expect(friendlyCaseStatus("CANCELED")).toBe("Review cancelled");
  });

  it("shows the signed access timestamp when a verdict is available", () => {
    expect(
      accessEventTimestamp({
        case_id: "case-1",
        agent_id: "agent-1",
        event_id: "event-1",
        opened_by: "0x1111111111111111111111111111111111111111",
        target_url: "https://example.com/private",
        receipt_url: "https://example.com/receipt.json",
        challenge_bond: 1,
        status: "RESOLVED",
        attempt_count: 1,
        bond_settled: true,
        created_at: "2026-07-30T11:00:00Z",
        verdict: {
          verdict_id: "verdict-1",
          case_id: "case-1",
          agent_id: "agent-1",
          target_url: "https://example.com/private",
          applicability: "MATERIAL_VIOLATION",
          source_coverage: "SUFFICIENT",
          violation_type: "DISALLOWED_PATH",
          required_action: "QUARANTINE_AND_CREDIT",
          matched_fact_ids: [],
          rationale: "Policy breach.",
          previous_agent_status: "PENDING_REVIEW",
          new_agent_status: "QUARANTINED",
          user_credit_amount: 1,
          operator_credit_amount: 0,
          attempt: 1,
          event_id: "event-1",
          occurred_at: "2026-07-30T10:00:00Z",
          attestor_public_key: `0x04${"11".repeat(64)}`,
          policy_version: "v1",
          policy_url: "https://example.com/policy-v1.txt",
          policy_hash: `0x${"22".repeat(32)}`,
          robots_version: "v1",
          robots_url: "https://example.com/robots.txt?v=1",
          robots_hash: `0x${"33".repeat(32)}`,
          attestation_verified: true
        }
      })
    ).toBe("2026-07-30T10:00:00Z");
  });
});
