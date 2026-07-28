import type { CanonicalSnapshot } from "./types";

export type ContractAction =
  | "create_agent"
  | "accept_agent"
  | "open_access_case"
  | "adjudicate_case"
  | "retry_case"
  | "propose_case_cancel"
  | "accept_case_cancel"
  | "withdraw_credit"
  | "propose_close"
  | "accept_close";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function sameAddress(left: string | undefined, right: string | undefined) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

export function availableActions(
  snapshot: CanonicalSnapshot | null,
  account?: string
): ContractAction[] {
  if (!snapshot?.agent) return ["create_agent"];

  const { agent, case: caseRecord } = snapshot;
  const actions: ContractAction[] = [];
  const isOperator = sameAddress(account, agent.operator);
  const isUser = sameAddress(account, agent.user);
  const isParty = isOperator || isUser;

  if (agent.status === "DRAFT" && isUser) actions.push("accept_agent");
  if (
    agent.accepted &&
    !agent.active_case_id &&
    (agent.status === "ACTIVE" || agent.status === "PENDING_REVIEW")
  ) {
    actions.push("open_access_case");
  }
  if (caseRecord?.status === "OPEN") actions.push("adjudicate_case");
  if (
    caseRecord &&
    (caseRecord.status === "OPEN" || caseRecord.status === "RETRYABLE") &&
    (isOperator || sameAddress(account, caseRecord.opened_by))
  ) {
    if (
      caseRecord.cancel_proposed_by &&
      !sameAddress(caseRecord.cancel_proposed_by, ZERO_ADDRESS) &&
      !sameAddress(account, caseRecord.cancel_proposed_by)
    ) {
      actions.push("accept_case_cancel");
    } else {
      actions.push("propose_case_cancel");
    }
  }
  if (
    caseRecord?.status === "RETRYABLE" &&
    (isParty || sameAddress(account, caseRecord.opened_by))
  ) {
    actions.push("retry_case");
  }
  if (BigInt(snapshot.credit || "0") > 0n) actions.push("withdraw_credit");
  if (isParty && !agent.active_case_id && agent.status !== "CLOSED") {
    if (
      agent.close_proposed_by &&
      !sameAddress(agent.close_proposed_by, ZERO_ADDRESS) &&
      !sameAddress(account, agent.close_proposed_by)
    ) {
      actions.push("accept_close");
    } else {
      actions.push("propose_close");
    }
  }

  return actions;
}

export async function executeAndRefresh<T>({
  submit,
  refresh
}: {
  submit: () => Promise<string>;
  refresh: () => Promise<T>;
}) {
  const hash = await submit();
  const snapshot = await refresh();
  return { hash, snapshot };
}
