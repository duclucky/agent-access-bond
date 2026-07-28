import type { ContractAction } from "./workspace";

const GEN_DECIMALS = 18;
const GEN_BASE = 10n ** BigInt(GEN_DECIMALS);

export type ProductTone = "success" | "warning" | "danger" | "neutral";

export function formatGenValue(value: string | number | bigint) {
  const wei = BigInt(value);
  const integer = wei / GEN_BASE;
  const fraction = (wei % GEN_BASE)
    .toString()
    .padStart(GEN_DECIMALS, "0")
    .replace(/0+$/, "");
  return fraction ? `${integer}.${fraction}` : integer.toString();
}

export function formatGen(value: string | number | bigint) {
  const exact = formatGenValue(value);
  const [integer, fraction = ""] = exact.split(".");
  const grouped = BigInt(integer).toLocaleString("en-US");
  if (!fraction) return `${grouped} GEN`;
  const visible = fraction.slice(0, 6).replace(/0+$/, "");
  return visible
    ? `${grouped}.${visible} GEN`
    : BigInt(value) > 0n
      ? "<0.000001 GEN"
      : "0 GEN";
}

export function parseGen(value: string) {
  const normalized = value.trim().replaceAll(",", "");
  if (!/^\d+(?:\.\d{0,18})?$/.test(normalized)) {
    throw new Error("Enter a valid GEN amount with up to 18 decimal places.");
  }
  const [integer, fraction = ""] = normalized.split(".");
  return (
    BigInt(integer) * GEN_BASE +
    BigInt(fraction.padEnd(GEN_DECIMALS, "0") || "0")
  );
}

export function shortAddress(value: string) {
  return value.length > 14
    ? `${value.slice(0, 6)}...${value.slice(-4)}`
    : value;
}

export function friendlyStatus(
  status: string | undefined,
  canExecute: boolean
): { label: string; summary: string; tone: ProductTone } {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Protected and active",
        summary: canExecute
          ? "This agent can take new work."
          : "This agent is temporarily unable to take new work.",
        tone: "success"
      };
    case "PENDING_REVIEW":
      return {
        label: "Review in progress",
        summary: "New work is paused while the access report is reviewed.",
        tone: "warning"
      };
    case "QUARANTINED":
      return {
        label: "Access paused",
        summary: "This agent cannot take new work.",
        tone: "danger"
      };
    case "CLOSED":
      return {
        label: "Protection closed",
        summary: "This protection agreement is no longer active.",
        tone: "neutral"
      };
    case "DRAFT":
      return {
        label: "Waiting for approval",
        summary: "The designated user must approve this protection agreement.",
        tone: "warning"
      };
    default:
      return {
        label: "Choose an agent",
        summary: "Enter an agent ID to view its protection status.",
        tone: "neutral"
      };
  }
}

const ACTION_LABELS: Record<ContractAction, string> = {
  create_agent: "Register agent",
  accept_agent: "Approve protection",
  open_access_case: "Report an access",
  adjudicate_case: "Start review",
  retry_case: "Retry review",
  propose_case_cancel: "Request cancellation",
  accept_case_cancel: "Confirm cancellation",
  withdraw_credit: "Withdraw balance",
  propose_close: "Request closure",
  accept_close: "Confirm closure"
};

export function friendlyAction(action: ContractAction) {
  return ACTION_LABELS[action];
}

export function actionDescription(action: ContractAction) {
  const descriptions: Record<ContractAction, string> = {
    create_agent: "Set up a bonded protection agreement for a web agent.",
    accept_agent: "Approve the agent policy and activate its protection.",
    open_access_case: "Submit a public receipt for independent review.",
    adjudicate_case: "Ask GenLayer validators to review the public evidence.",
    retry_case: "Run the review again after a temporary evidence failure.",
    propose_case_cancel: "Ask the other party to cancel this unresolved review.",
    accept_case_cancel: "Confirm cancellation and release the review bond.",
    withdraw_credit: "Move your available contract balance back to your wallet.",
    propose_close: "Ask the other party to close this protection agreement.",
    accept_close: "Confirm closure and release the remaining bond."
  };
  return descriptions[action];
}

export function friendlyVerdict(applicability: string) {
  switch (applicability) {
    case "MATERIAL_VIOLATION":
      return "Policy breach confirmed";
    case "COMPLIANT":
      return "No policy breach found";
    case "UNVERIFIABLE":
      return "Evidence could not be verified";
    default:
      return applicability.replaceAll("_", " ").toLowerCase();
  }
}

export function friendlyVerdictTone(applicability: string): ProductTone {
  switch (applicability) {
    case "MATERIAL_VIOLATION":
      return "danger";
    case "COMPLIANT":
      return "success";
    case "UNVERIFIABLE":
      return "warning";
    default:
      return "neutral";
  }
}

export function verdictSummary(applicability: string) {
  switch (applicability) {
    case "MATERIAL_VIOLATION":
      return "The agent was paused and the bond was distributed according to the protection policy.";
    case "COMPLIANT":
      return "The agent remains eligible to operate and the review is complete.";
    case "UNVERIFIABLE":
      return "No penalty was applied because the available evidence was insufficient.";
    default:
      return "The review has finished.";
  }
}

export function friendlyCaseStatus(status: string) {
  const labels: Record<string, string> = {
    OPEN: "Ready for review",
    RETRYABLE: "Review needs attention",
    RESOLVED: "Review complete",
    CANCELLED: "Review cancelled"
  };
  return labels[status] ?? status.replaceAll("_", " ").toLowerCase();
}

export function urlLabel(value: string) {
  try {
    const url = new URL(value);
    const path = url.pathname === "/" ? "" : url.pathname;
    return `${url.hostname}${path}`;
  } catch {
    return value;
  }
}
