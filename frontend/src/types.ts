export type AgentRecord = {
  agent_id: string;
  operator: string;
  user: string;
  user_agent: string;
  origin: string;
  policy_url: string;
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
