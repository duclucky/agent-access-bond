import {
  Activity,
  Banknote,
  Check,
  FileSearch,
  Gavel,
  HandCoins,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldOff,
  UserCheck,
  X
} from "lucide-react";

import type { CanonicalSnapshot } from "../types";
import type { ContractAction } from "../workspace";

export type ActionFields = {
  userAddress: string;
  userAgent: string;
  origin: string;
  policyUrl: string;
  allowedPurpose: string;
  operatorBond: string;
  penaltyAmount: string;
  minimumChallengeBond: string;
  caseId: string;
  targetUrl: string;
  receiptUrl: string;
  challengeBond: string;
  withdrawAmount: string;
};

const ACTION_LABELS: Record<ContractAction, string> = {
  create_agent: "Create agent",
  accept_agent: "Accept agent",
  open_access_case: "Open case",
  adjudicate_case: "Adjudicate",
  retry_case: "Retry case",
  withdraw_credit: "Withdraw",
  propose_close: "Propose close",
  accept_close: "Accept close"
};

const ACTION_ICONS: Record<ContractAction, typeof Check> = {
  create_agent: LockKeyhole,
  accept_agent: UserCheck,
  open_access_case: FileSearch,
  adjudicate_case: Gavel,
  retry_case: RotateCcw,
  withdraw_credit: HandCoins,
  propose_close: ShieldOff,
  accept_close: X
};

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "url";
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}

export function AgentWorkspace({
  agentId,
  onAgentIdChange,
  onRefresh,
  snapshot,
  loading,
  readError,
  actions,
  selectedAction,
  onActionChange,
  fields,
  onFieldChange,
  onSubmit,
  busy
}: {
  agentId: string;
  onAgentIdChange: (value: string) => void;
  onRefresh: () => void;
  snapshot: CanonicalSnapshot | null;
  loading: boolean;
  readError: string | null;
  actions: ContractAction[];
  selectedAction: ContractAction | null;
  onActionChange: (value: ContractAction) => void;
  fields: ActionFields;
  onFieldChange: (name: keyof ActionFields, value: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const agent = snapshot?.agent;
  const caseRecord = snapshot?.case;
  const verdict = snapshot?.verdict;

  return (
    <main className="workspace">
      <section className="lookup-band" aria-label="Agent lookup">
        <div>
          <p className="eyebrow">Canonical identity</p>
          <h1>{agent?.agent_id ?? "Agent workspace"}</h1>
        </div>
        <div className="lookup-control">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Agent ID"
            value={agentId}
            onChange={(event) => onAgentIdChange(event.target.value)}
          />
          <button
            className="icon-button"
            type="button"
            title="Refresh canonical state"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "spin" : undefined}
              aria-hidden="true"
            />
            <span className="sr-only">Refresh canonical state</span>
          </button>
        </div>
      </section>

      {readError ? <p className="read-error">{readError}</p> : null}

      <section className="state-band" aria-labelledby="state-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Canonical read</p>
            <h2 id="state-title">Agent state</h2>
          </div>
          <span className={`status-badge status-${agent?.status.toLowerCase() ?? "idle"}`}>
            <Activity size={14} aria-hidden="true" />
            {agent?.status ?? "Not loaded"}
          </span>
        </div>

        <dl className="metric-grid">
          <div>
            <dt>Execution</dt>
            <dd>{snapshot?.canExecute ? "Allowed" : "Blocked"}</dd>
          </div>
          <div>
            <dt>Operator bond</dt>
            <dd>{agent ? String(agent.operator_bond) : "—"} wei</dd>
          </div>
          <div>
            <dt>Wallet credit</dt>
            <dd>{snapshot?.credit ?? "0"} wei</dd>
          </div>
          <div>
            <dt>Cases</dt>
            <dd>{agent ? String(agent.case_count) : "—"}</dd>
          </div>
        </dl>

        {agent ? (
          <dl className="detail-grid">
            <div>
              <dt>Operator</dt>
              <dd><code>{agent.operator}</code></dd>
            </div>
            <div>
              <dt>Designated user</dt>
              <dd><code>{agent.user}</code></dd>
            </div>
            <div>
              <dt>User agent</dt>
              <dd>{agent.user_agent}</dd>
            </div>
            <div>
              <dt>Policy</dt>
              <dd><a href={agent.policy_url} target="_blank" rel="noreferrer">{agent.policy_url}</a></dd>
            </div>
          </dl>
        ) : null}
      </section>

      <div className="content-columns">
        <section className="evidence-panel" aria-labelledby="case-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Evidence case</p>
              <h2 id="case-title">{caseRecord?.case_id ?? "No case selected"}</h2>
            </div>
            {caseRecord ? (
              <span className={`status-badge status-${caseRecord.status.toLowerCase()}`}>
                {caseRecord.status}
              </span>
            ) : null}
          </div>

          {caseRecord ? (
            <dl className="stacked-details">
              <div><dt>Target</dt><dd><a href={caseRecord.target_url} target="_blank" rel="noreferrer">{caseRecord.target_url}</a></dd></div>
              <div><dt>Receipt</dt><dd><a href={caseRecord.receipt_url} target="_blank" rel="noreferrer">{caseRecord.receipt_url}</a></dd></div>
              <div><dt>Attempt</dt><dd>{String(caseRecord.attempt_count)}</dd></div>
              <div><dt>Bond settled</dt><dd>{caseRecord.bond_settled ? "Yes" : "No"}</dd></div>
            </dl>
          ) : (
            <p className="empty-state">No canonical case for this query.</p>
          )}

          {verdict ? (
            <div className="verdict-block">
              <div className="verdict-heading">
                <span className={`verdict-mark verdict-${verdict.applicability.toLowerCase()}`}>
                  {verdict.applicability === "MATERIAL_VIOLATION" ? <X size={17} /> : <Check size={17} />}
                </span>
                <div>
                  <strong>{verdict.applicability.replaceAll("_", " ")}</strong>
                  <span>{verdict.required_action.replaceAll("_", " ")}</span>
                </div>
              </div>
              <dl className="stacked-details compact">
                <div><dt>Coverage</dt><dd>{verdict.source_coverage}</dd></div>
                <div><dt>Violation</dt><dd>{verdict.violation_type}</dd></div>
                <div><dt>Matched facts</dt><dd>{verdict.matched_fact_ids}</dd></div>
              </dl>
              <p className="rationale">{verdict.rationale}</p>
            </div>
          ) : null}
        </section>

        <section className="action-panel" aria-labelledby="action-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Wallet command</p>
              <h2 id="action-title">Contract action</h2>
            </div>
            <Banknote size={20} aria-hidden="true" />
          </div>

          <div className="action-menu" role="tablist" aria-label="Available actions">
            {actions.map((action) => {
              const Icon = ACTION_ICONS[action];
              return (
                <button
                  key={action}
                  type="button"
                  role="tab"
                  aria-selected={selectedAction === action}
                  className={selectedAction === action ? "active" : undefined}
                  onClick={() => onActionChange(action)}
                >
                  <Icon size={15} aria-hidden="true" />
                  {ACTION_LABELS[action]}
                </button>
              );
            })}
          </div>

          {selectedAction ? (
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
              }}
            >
              {selectedAction === "create_agent" ? (
                <>
                  <Field label="Designated user" value={fields.userAddress} onChange={(value) => onFieldChange("userAddress", value)} />
                  <Field label="User agent" value={fields.userAgent} onChange={(value) => onFieldChange("userAgent", value)} />
                  <Field label="Origin" type="url" value={fields.origin} onChange={(value) => onFieldChange("origin", value)} />
                  <Field label="Policy URL" type="url" value={fields.policyUrl} onChange={(value) => onFieldChange("policyUrl", value)} />
                  <Field label="Allowed purpose" value={fields.allowedPurpose} onChange={(value) => onFieldChange("allowedPurpose", value)} />
                  <Field label="Operator bond (wei)" value={fields.operatorBond} onChange={(value) => onFieldChange("operatorBond", value)} />
                  <Field label="Penalty (wei)" value={fields.penaltyAmount} onChange={(value) => onFieldChange("penaltyAmount", value)} />
                  <Field label="Minimum challenge bond (wei)" value={fields.minimumChallengeBond} onChange={(value) => onFieldChange("minimumChallengeBond", value)} />
                </>
              ) : null}
              {selectedAction === "open_access_case" ? (
                <>
                  <Field label="Case ID" value={fields.caseId} onChange={(value) => onFieldChange("caseId", value)} />
                  <Field label="Target URL" type="url" value={fields.targetUrl} onChange={(value) => onFieldChange("targetUrl", value)} />
                  <Field label="Receipt URL" type="url" value={fields.receiptUrl} onChange={(value) => onFieldChange("receiptUrl", value)} />
                  <Field label="Challenge bond (wei)" value={fields.challengeBond} onChange={(value) => onFieldChange("challengeBond", value)} />
                </>
              ) : null}
              {selectedAction === "withdraw_credit" ? (
                <Field label="Amount (wei)" value={fields.withdrawAmount} onChange={(value) => onFieldChange("withdrawAmount", value)} />
              ) : null}
              {selectedAction === "adjudicate_case" || selectedAction === "retry_case" ? (
                <Field label="Case ID" value={fields.caseId} onChange={(value) => onFieldChange("caseId", value)} />
              ) : null}

              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? <RefreshCw className="spin" size={17} /> : <Check size={17} />}
                {busy ? "Awaiting finality" : ACTION_LABELS[selectedAction]}
              </button>
            </form>
          ) : (
            <p className="empty-state">No action is available for this wallet and state.</p>
          )}
        </section>
      </div>
    </main>
  );
}
