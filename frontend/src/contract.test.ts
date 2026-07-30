import { describe, expect, it, vi } from "vitest";

import {
  readCanonicalSnapshot,
  submitWriteAndFinalize
} from "./contract";

const CONTRACT = "0x1111111111111111111111111111111111111111";
const ACCOUNT = "0x2222222222222222222222222222222222222222";

describe("readCanonicalSnapshot", () => {
  it("reads the active case, verdict, credit, and accounting from the contract", async () => {
    const readContract = vi.fn(async ({ functionName }: { functionName: string }) => {
      const values: Record<string, unknown> = {
        get_agent: {
          agent_id: "agent-alpha",
          status: "QUARANTINED",
          active_case_id: "case-1"
        },
        get_agent_case_ids: ["case-1"],
        get_case: {
          case_id: "case-1",
          status: "RESOLVED",
          verdict_id: "verdict-case-1-1"
        },
        get_verdict: {
          verdict_id: "verdict-case-1-1",
          applicability: "MATERIAL_VIOLATION"
        },
        get_credit: "100",
        get_accounting: {
          locked_operator_bonds: "400",
          locked_challenge_bonds: "0",
          withdrawable_credits: "100"
        },
        can_execute: false
      };
      return values[functionName];
    });

    const snapshot = await readCanonicalSnapshot({
      client: { readContract } as never,
      contractAddress: CONTRACT,
      agentId: "agent-alpha",
      account: ACCOUNT
    });

    expect(snapshot.agent?.status).toBe("QUARANTINED");
    expect(snapshot.case?.case_id).toBe("case-1");
    expect(snapshot.verdict?.applicability).toBe("MATERIAL_VIOLATION");
    expect(snapshot.caseHistory?.map((item) => item.case.case_id)).toEqual([
      "case-1"
    ]);
    expect(snapshot.credit).toBe("100");
    expect(snapshot.canExecute).toBe(false);
  });

  it("reads a known resolved case after the agent clears active_case_id", async () => {
    const readContract = vi.fn(async ({ functionName }: { functionName: string }) => {
      const values: Record<string, unknown> = {
        get_agent: {
          agent_id: "agent-alpha",
          status: "QUARANTINED",
          active_case_id: ""
        },
        get_agent_case_ids: ["case-1"],
        get_case: {
          case_id: "case-1",
          status: "RESOLVED",
          verdict_id: "verdict-case-1-1"
        },
        get_verdict: {
          verdict_id: "verdict-case-1-1",
          applicability: "MATERIAL_VIOLATION"
        },
        get_accounting: {},
        can_execute: false
      };
      return values[functionName];
    });

    const snapshot = await readCanonicalSnapshot({
      client: { readContract } as never,
      contractAddress: CONTRACT,
      agentId: "agent-alpha",
      caseId: "case-1"
    });

    expect(snapshot.case?.status).toBe("RESOLVED");
    expect(snapshot.verdict?.verdict_id).toBe("verdict-case-1-1");
  });

  it("restores every resolved case and verdict without a local case index", async () => {
    const readContract = vi.fn(
      async ({
        functionName,
        args
      }: {
        functionName: string;
        args: string[];
      }) => {
        if (functionName === "get_agent") {
          return {
            agent_id: "agent-alpha",
            status: "QUARANTINED",
            active_case_id: "",
            case_count: "2"
          };
        }
        if (functionName === "get_agent_case_ids") return ["case-1", "case-2"];
        if (functionName === "get_case") {
          return {
            case_id: args[0],
            status: "RESOLVED",
            verdict_id: `verdict-${args[0]}-1`
          };
        }
        if (functionName === "get_verdict") {
          return {
            verdict_id: args[0],
            applicability: "MATERIAL_VIOLATION"
          };
        }
        if (functionName === "get_accounting") return {};
        if (functionName === "can_execute") return false;
        return "0";
      }
    );

    const snapshot = await readCanonicalSnapshot({
      client: { readContract } as never,
      contractAddress: CONTRACT,
      agentId: "agent-alpha"
    });

    expect(snapshot.caseHistory?.map((item) => item.case.case_id)).toEqual([
      "case-1",
      "case-2"
    ]);
    expect(snapshot.caseHistory?.map((item) => item.verdict?.verdict_id)).toEqual([
      "verdict-case-1-1",
      "verdict-case-2-1"
    ]);
  });
});

describe("submitWriteAndFinalize", () => {
  it("emits submitted, accepted, and finalized before returning the hash", async () => {
    const statuses: string[] = [];
    const writeClient = {
      writeContract: vi.fn(async () => "0xabc")
    };
    const readClient = {
      request: vi
        .fn()
        .mockResolvedValueOnce("PENDING")
        .mockResolvedValueOnce("ACCEPTED")
        .mockResolvedValueOnce("FINALIZED")
    };

    const hash = await submitWriteAndFinalize({
      writeClient: writeClient as never,
      readClient: readClient as never,
      address: CONTRACT,
      functionName: "accept_agent",
      args: ["agent-alpha"],
      value: 0n,
      pollIntervalMs: 0,
      onStatus: (status) => statuses.push(status)
    });

    expect(hash).toBe("0xabc");
    expect(statuses).toEqual(["submitted", "accepted", "finalized"]);
  });

  it("keeps polling when Studionet has not indexed a submitted hash yet", async () => {
    const statuses: string[] = [];
    const writeClient = {
      writeContract: vi.fn(async () => "0xabc")
    };
    const readClient = {
      request: vi
        .fn()
        .mockRejectedValueOnce(new Error("Transaction not found: 0xabc"))
        .mockResolvedValueOnce("ACCEPTED")
        .mockResolvedValueOnce("FINALIZED")
    };

    await expect(
      submitWriteAndFinalize({
        writeClient: writeClient as never,
        readClient: readClient as never,
        address: CONTRACT,
        functionName: "create_agent",
        args: ["agent-alpha"],
        value: 100n,
        pollIntervalMs: 0,
        onStatus: (status) => statuses.push(status)
      })
    ).resolves.toBe("0xabc");

    expect(statuses).toEqual(["submitted", "accepted", "finalized"]);
  });

  it("throws a terminal consensus failure without reporting finalization", async () => {
    const statuses: string[] = [];
    const writeClient = {
      writeContract: vi.fn(async () => "0xdef")
    };
    const readClient = {
      request: vi.fn(async () => "VALIDATORS_TIMEOUT")
    };

    await expect(
      submitWriteAndFinalize({
        writeClient: writeClient as never,
        readClient: readClient as never,
        address: CONTRACT,
        functionName: "adjudicate_case",
        args: ["case-1"],
        value: 0n,
        pollIntervalMs: 0,
        onStatus: (status) => statuses.push(status)
      })
    ).rejects.toThrow("VALIDATORS_TIMEOUT");
    expect(statuses).toEqual(["submitted"]);
  });
});
