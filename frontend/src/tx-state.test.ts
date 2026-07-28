import { describe, expect, it } from "vitest";

import { initialTxState, txReducer } from "./tx-state";

describe("txReducer", () => {
  it("tracks submitted, accepted, and finalized states", () => {
    const submitted = txReducer(initialTxState, {
      type: "submitted",
      operation: "accept_agent",
      hash: "0xabc"
    });
    const accepted = txReducer(submitted, { type: "accepted" });
    const finalized = txReducer(accepted, { type: "finalized" });

    expect(submitted.status).toBe("submitted");
    expect(accepted.status).toBe("accepted");
    expect(finalized.status).toBe("finalized");
    expect(finalized.hash).toBe("0xabc");
  });

  it("retains the operation when a failed transaction is retried", () => {
    const failed = txReducer(
      {
        ...initialTxState,
        operation: "adjudicate_case",
        hash: "0xold",
        status: "submitted"
      },
      { type: "failed", error: "Validator timeout" }
    );
    const retried = txReducer(failed, {
      type: "submitted",
      operation: failed.operation,
      hash: "0xnew"
    });

    expect(failed.status).toBe("failed");
    expect(retried).toMatchObject({
      operation: "adjudicate_case",
      hash: "0xnew",
      status: "submitted",
      error: null
    });
  });
});
