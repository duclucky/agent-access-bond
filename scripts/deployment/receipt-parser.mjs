function normalizeExecutionResult(result) {
  if (!result || typeof result !== "object") {
    return null;
  }
  return {
    status: String(result.status ?? result.execution_status ?? "UNKNOWN"),
    returnData: result.returnData ?? result.return_data ?? null,
    error: result.error ?? result.error_message ?? null
  };
}

export function extractExecutionResult(receipt) {
  const normalized = normalizeExecutionResult(receipt?.executionResult);
  if (normalized) {
    return normalized;
  }

  const leaderReceipts = receipt?.consensus_data?.leader_receipt;
  if (Array.isArray(leaderReceipts)) {
    for (const leaderReceipt of leaderReceipts) {
      const raw = normalizeExecutionResult(leaderReceipt?.execution_result);
      if (raw) {
        return raw;
      }
    }
  }

  return {
    status: "UNKNOWN",
    returnData: null,
    error: "execution result not found"
  };
}

