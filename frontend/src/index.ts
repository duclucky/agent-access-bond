export type AgentStatus = "DRAFT" | "ACTIVE" | "QUARANTINED" | "PENDING_REVIEW" | "CLOSED";

export function canExecuteFromStatus(status: AgentStatus): boolean {
  return status === "ACTIVE";
}

