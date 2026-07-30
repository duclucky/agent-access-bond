export type AgentRecord = {
  agent_id: string;
  operator: string;
  user: string;
  user_agent: string;
  origin: string;
  policy_url: string;
  attestor_public_key: string;
  allowed_purpose: string;
  operator_bond: string | number;
  minimum_challenge_bond: string | number;
  penalty_amount: string | number;
  status: string;
  accepted: boolean;
  active_case_id: string;
  case_count: string | number;
  close_proposed_by: string;
};

export type CaseRecord = {
  case_id: string;
  agent_id: string;
  event_id: string;
  opened_by: string;
  target_url: string;
  receipt_url: string;
  challenge_bond: string | number;
  status: string;
  attempt_count: string | number;
  verdict_id: string;
  bond_settled: boolean;
  cancel_proposed_by: string;
};

export type VerdictRecord = {
  verdict_id: string;
  case_id: string;
  agent_id: string;
  target_url: string;
  applicability: string;
  source_coverage: string;
  violation_type: string;
  required_action: string;
  matched_fact_ids: string;
  rationale: string;
  previous_agent_status: string;
  new_agent_status: string;
  user_credit_amount: string | number;
  operator_credit_amount: string | number;
  attempt: string | number;
  event_id: string;
  occurred_at: string;
  attestor_public_key: string;
  policy_version: string;
  policy_url: string;
  policy_hash: string;
  robots_version: string;
  robots_url: string;
  robots_hash: string;
  attestation_verified: boolean;
};

export type AccountingRecord = {
  locked_operator_bonds: string | number;
  locked_challenge_bonds: string | number;
  withdrawable_credits: string | number;
};

export type CanonicalSnapshot = {
  agent: AgentRecord | null;
  case: CaseRecord | null;
  verdict: VerdictRecord | null;
  credit: string;
  accounting: AccountingRecord;
  canExecute: boolean;
  readAt: string;
};

export type AgentStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PENDING_REVIEW"
  | "QUARANTINED"
  | "CLOSED";

export type CaseStatus = "OPEN" | "RETRYABLE" | "RESOLVED" | "CANCELED";

export type ApplicabilityClass =
  | "MATERIAL_VIOLATION"
  | "COMPLIANT"
  | "UNVERIFIABLE";

export type ViolationType =
  | "DISALLOWED_PATH"
  | "USER_AGENT_MISMATCH"
  | "POLICY_SCOPE_BREACH"
  | "RECEIPT_INSUFFICIENT"
  | "NONE";

export interface Verdict {
  verdict_id: string;
  case_id: string;
  agent_id: string;
  target_url: string;
  applicability: ApplicabilityClass;
  source_coverage: string;
  violation_type: ViolationType;
  required_action: string;
  matched_fact_ids: string[];
  rationale: string;
  previous_agent_status: AgentStatus;
  new_agent_status: AgentStatus;
  user_credit_amount: number;
  operator_credit_amount: number;
  attempt: number;
  event_id: string;
  occurred_at: string;
  attestor_public_key: string;
  policy_version: string;
  policy_url: string;
  policy_hash: string;
  robots_version: string;
  robots_url: string;
  robots_hash: string;
  attestation_verified: boolean;
}

export interface AccessCase {
  case_id: string;
  agent_id: string;
  event_id: string;
  opened_by: string;
  target_url: string;
  receipt_url: string;
  challenge_bond: number;
  status: CaseStatus;
  attempt_count: number;
  verdict_id?: string;
  verdict?: Verdict;
  bond_settled: boolean;
  cancel_proposed_by?: string;
  created_at: string;
  description?: string;
}

export interface AgentBond {
  agent_id: string;
  operator: string;
  user: string;
  user_agent: string;
  origin: string;
  policy_url: string;
  attestor_public_key: string;
  allowed_purpose: string;
  operator_bond: number;
  minimum_challenge_bond: number;
  penalty_amount: number;
  status: AgentStatus;
  accepted: boolean;
  active_case_id?: string;
  case_count: number;
  close_proposed_by?: string;
  cases: AccessCase[];
  created_at: string;
}

export interface WalletState {
  isConnected: boolean;
  address: string;
  balanceGEN: number;
  network: string;
  role: "operator" | "user" | "challenger" | "integrator";
}

export interface AccountingSummary {
  total_locked_operator_bonds: number;
  total_active_challenge_bonds: number;
  total_slashed_penalties: number;
  total_claimed_user_credits: number;
  contract_balance: number;
}
