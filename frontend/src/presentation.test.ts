import { describe, expect, it } from "vitest";

import {
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
});
