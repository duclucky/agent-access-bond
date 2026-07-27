import assert from "node:assert/strict";
import test from "node:test";

import { extractExecutionResult } from "../../scripts/deployment/receipt-parser.mjs";

test("extracts execution result from normalized SDK receipt", () => {
  const result = extractExecutionResult({
    executionResult: {
      status: "ACCEPTED",
      returnData: "0x1234",
      error: null
    }
  });

  assert.deepEqual(result, {
    status: "ACCEPTED",
    returnData: "0x1234",
    error: null
  });
});

test("extracts execution result from raw Studio leader receipt", () => {
  const result = extractExecutionResult({
    consensus_data: {
      leader_receipt: [
        {
          execution_result: {
            status: "FINALIZED",
            return_data: "0xabcd"
          }
        }
      ]
    }
  });

  assert.deepEqual(result, {
    status: "FINALIZED",
    returnData: "0xabcd",
    error: null
  });
});

test("returns unknown for malformed receipt without dumping raw payload", () => {
  const result = extractExecutionResult({ node_config: { sensitive: "fixture" } });

  assert.deepEqual(result, {
    status: "UNKNOWN",
    returnData: null,
    error: "execution result not found"
  });
});
