import {
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileSearch,
  Gavel,
  HandCoins,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  X
} from "lucide-react";

import {
  actionDescription,
  formatGen,
  friendlyAction,
  friendlyCaseStatus,
  friendlyStatus,
  friendlyVerdict,
  friendlyVerdictTone,
  shortAddress,
  urlLabel,
  verdictSummary
} from "../presentation";
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

const ACTION_ICONS: Record<ContractAction, typeof Check> = {
  create_agent: LockKeyhole,
  accept_agent: UserCheck,
  open_access_case: FileSearch,
  adjudicate_case: Gavel,
  retry_case: RotateCcw,
  propose_case_cancel: ShieldOff,
  accept_case_cancel: X,
  withdraw_credit: HandCoins,
  propose_close: ShieldOff,
  accept_close: Check
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  suffix,
  hint
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "url" | "number";
  suffix?: string;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-shell">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          step={type === "number" ? "any" : undefined}
          min={type === "number" ? "0" : undefined}
          required
        />
        {suffix ? <strong>{suffix}</strong> : null}
      </span>
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function ActionFieldsForm({
  action,
  fields,
  onFieldChange
}: {
  action: ContractAction;
  fields: ActionFields;
  onFieldChange: (name: keyof ActionFields, value: string) => void;
}) {
  if (action === "create_agent") {
    return (
      <>
        <Field
          label="Designated user wallet"
          value={fields.userAddress}
          onChange={(value) => onFieldChange("userAddress", value)}
        />
        <Field
          label="Agent name sent to websites"
          value={fields.userAgent}
          onChange={(value) => onFieldChange("userAgent", value)}
        />
        <Field
          label="Protected website"
          type="url"
          value={fields.origin}
          onChange={(value) => onFieldChange("origin", value)}
        />
        <Field
          label="Policy URL"
          type="url"
          value={fields.policyUrl}
          onChange={(value) => onFieldChange("policyUrl", value)}
        />
        <Field
          label="Allowed purpose"
          value={fields.allowedPurpose}
          onChange={(value) => onFieldChange("allowedPurpose", value)}
        />
        <Field
          label="Protection bond"
          type="number"
          suffix="GEN"
          value={fields.operatorBond}
          onChange={(value) => onFieldChange("operatorBond", value)}
        />
        <Field
          label="Breach penalty"
          type="number"
          suffix="GEN"
          value={fields.penaltyAmount}
          onChange={(value) => onFieldChange("penaltyAmount", value)}
        />
        <Field
          label="Minimum review bond"
          type="number"
          suffix="GEN"
          value={fields.minimumChallengeBond}
          onChange={(value) => onFieldChange("minimumChallengeBond", value)}
        />
      </>
    );
  }

  if (action === "open_access_case") {
    return (
      <>
        <Field
          label="Review reference"
          value={fields.caseId}
          onChange={(value) => onFieldChange("caseId", value)}
        />
        <Field
          label="Accessed URL"
          type="url"
          value={fields.targetUrl}
          onChange={(value) => onFieldChange("targetUrl", value)}
        />
        <Field
          label="Public receipt URL"
          type="url"
          value={fields.receiptUrl}
          onChange={(value) => onFieldChange("receiptUrl", value)}
        />
        <Field
          label="Review bond"
          type="number"
          suffix="GEN"
          value={fields.challengeBond}
          onChange={(value) => onFieldChange("challengeBond", value)}
          hint="Returned or settled according to the final review."
        />
      </>
    );
  }

  if (action === "withdraw_credit") {
    return (
      <Field
        label="Amount to withdraw"
        type="number"
        suffix="GEN"
        value={fields.withdrawAmount}
        onChange={(value) => onFieldChange("withdrawAmount", value)}
      />
    );
  }

  if (
    action === "adjudicate_case" ||
    action === "retry_case" ||
    action === "propose_case_cancel" ||
    action === "accept_case_cancel"
  ) {
    return (
      <Field
        label="Review reference"
        value={fields.caseId}
        onChange={(value) => onFieldChange("caseId", value)}
      />
    );
  }

  return null;
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
  busy,
  walletConnected = true
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
  walletConnected?: boolean;
}) {
  const agent = snapshot?.agent;
  const caseRecord = snapshot?.case;
  const verdict = snapshot?.verdict;
  const status = friendlyStatus(agent?.status, snapshot?.canExecute ?? false);
  const StatusIcon =
    status.tone === "success"
      ? ShieldCheck
      : status.tone === "danger"
        ? CircleAlert
        : Clock3;

  return (
    <main className="workspace">
      <section className="lookup-band" aria-label="Find an agent">
        <div className="page-title">
          <p className="eyebrow">Agent protection</p>
          <h1>{agent?.agent_id ?? "Find an agent"}</h1>
        </div>
        <label className="lookup-field">
          <span>Agent ID</span>
          <span className="lookup-control">
            <Search size={18} aria-hidden="true" />
            <input
              value={agentId}
              onChange={(event) => onAgentIdChange(event.target.value)}
            />
            <button
              className="icon-button"
              type="button"
              title="Refresh agent"
              aria-label="Refresh agent"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw
                size={18}
                className={loading ? "spin" : undefined}
                aria-hidden="true"
              />
            </button>
          </span>
        </label>
      </section>

      {readError ? (
        <p className="read-error" role="alert">
          {readError}
        </p>
      ) : null}

      <section
        className={`agent-overview tone-${status.tone}`}
        aria-labelledby="agent-status-title"
      >
        <div className="status-message">
          <span className="status-icon">
            <StatusIcon size={24} aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">Current status</p>
            <h2 id="agent-status-title">{status.label}</h2>
            <p>{status.summary}</p>
          </div>
        </div>

        <dl className="summary-metrics">
          <div>
            <dt>Protection bond</dt>
            <dd>{agent ? `${formatGen(agent.operator_bond)} locked` : "Not available"}</dd>
          </div>
          <div>
            <dt>Available balance</dt>
            <dd>{formatGen(snapshot?.credit ?? "0")}</dd>
          </div>
          <div>
            <dt>Access reviews</dt>
            <dd>{agent ? String(agent.case_count) : "0"}</dd>
          </div>
        </dl>

        {agent ? (
          <details className="technical-details">
            <summary>
              Technical details
              <ChevronRight size={17} aria-hidden="true" />
            </summary>
            <dl className="detail-grid">
              <div>
                <dt>Operator</dt>
                <dd title={agent.operator}>
                  <code>{shortAddress(agent.operator)}</code>
                </dd>
              </div>
              <div>
                <dt>Designated user</dt>
                <dd title={agent.user}>
                  <code>{shortAddress(agent.user)}</code>
                </dd>
              </div>
              <div>
                <dt>Agent identifier</dt>
                <dd>{agent.user_agent}</dd>
              </div>
              <div>
                <dt>Raw contract status</dt>
                <dd>
                  <code>{agent.status}</code>
                </dd>
              </div>
              <div>
                <dt>Bond in wei</dt>
                <dd>
                  <code>{String(agent.operator_bond)}</code>
                </dd>
              </div>
              <div>
                <dt>Policy</dt>
                <dd>
                  <a href={agent.policy_url} target="_blank" rel="noreferrer">
                    {urlLabel(agent.policy_url)}
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </dd>
              </div>
            </dl>
          </details>
        ) : null}
      </section>

      <div className="product-columns">
        <section className="action-panel" aria-labelledby="action-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your next step</p>
              <h2 id="action-title">
                {selectedAction ? friendlyAction(selectedAction) : "No action needed"}
              </h2>
            </div>
            {selectedAction ? (
              (() => {
                const Icon = ACTION_ICONS[selectedAction];
                return (
                  <span className="section-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                );
              })()
            ) : (
              <span className="section-icon">
                <CheckCircle2 size={20} aria-hidden="true" />
              </span>
            )}
          </div>

          {actions.length > 1 ? (
            <div className="action-menu" role="tablist" aria-label="Available actions">
              {actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  role="tab"
                  aria-selected={selectedAction === action}
                  className={selectedAction === action ? "active" : undefined}
                  onClick={() => onActionChange(action)}
                >
                  {friendlyAction(action)}
                </button>
              ))}
            </div>
          ) : null}

          {selectedAction ? (
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
              }}
            >
              <p className="action-description">
                {actionDescription(selectedAction)}
              </p>
              <ActionFieldsForm
                action={selectedAction}
                fields={fields}
                onFieldChange={onFieldChange}
              />
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? (
                  <RefreshCw className="spin" size={18} aria-hidden="true" />
                ) : (
                  <Check size={18} aria-hidden="true" />
                )}
                {busy ? "Waiting for confirmation" : friendlyAction(selectedAction)}
              </button>
            </form>
          ) : (
            <div className="empty-state">
              <CheckCircle2 size={20} aria-hidden="true" />
              <p>
                {walletConnected
                  ? "There is no action available for this wallet."
                  : "Connect a wallet to see the actions available to you."}
              </p>
            </div>
          )}
        </section>

        <section className="review-panel" aria-labelledby="review-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Latest access review</p>
              <h2 id="review-title">
                {caseRecord
                  ? friendlyCaseStatus(caseRecord.status)
                  : "No reviews yet"}
              </h2>
            </div>
            {caseRecord ? (
              <span className={`review-status status-${caseRecord.status.toLowerCase()}`}>
                {friendlyCaseStatus(caseRecord.status)}
              </span>
            ) : null}
          </div>

          {verdict ? (
            <>
              <div
                className={`review-outcome tone-${friendlyVerdictTone(
                  verdict.applicability
                )}`}
              >
                <strong>{friendlyVerdict(verdict.applicability)}</strong>
                <p>{verdictSummary(verdict.applicability)}</p>
              </div>
              <div className="decision-copy">
                <span>Why this decision</span>
                <p>{verdict.rationale}</p>
              </div>
            </>
          ) : caseRecord ? (
            <p className="review-copy">
              This report is waiting for its next contract action.
            </p>
          ) : (
            <div className="empty-state">
              <FileSearch size={20} aria-hidden="true" />
              <p>No access reports have been submitted for this agent.</p>
            </div>
          )}

          {caseRecord ? (
            <div className="review-links">
              <a href={caseRecord.target_url} target="_blank" rel="noreferrer">
                Accessed page
                <ExternalLink size={14} aria-hidden="true" />
              </a>
              <a href={caseRecord.receipt_url} target="_blank" rel="noreferrer">
                Public receipt
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          ) : null}

          {caseRecord ? (
            <details className="technical-details review-technical">
              <summary>
                Review details
                <ChevronRight size={17} aria-hidden="true" />
              </summary>
              <dl className="detail-grid">
                <div>
                  <dt>Review reference</dt>
                  <dd>
                    <code>{caseRecord.case_id}</code>
                  </dd>
                </div>
                <div>
                  <dt>Raw status</dt>
                  <dd>
                    <code>{caseRecord.status}</code>
                  </dd>
                </div>
                <div>
                  <dt>Attempts</dt>
                  <dd>{String(caseRecord.attempt_count)}</dd>
                </div>
                <div>
                  <dt>Review bond</dt>
                  <dd>{formatGen(caseRecord.challenge_bond)}</dd>
                </div>
                {verdict ? (
                  <>
                    <div>
                      <dt>Evidence coverage</dt>
                      <dd>
                        <code>{verdict.source_coverage}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Violation type</dt>
                      <dd>
                        <code>{verdict.violation_type}</code>
                      </dd>
                    </div>
                    <div className="detail-wide">
                      <dt>Matched evidence</dt>
                      <dd>
                        <code>{verdict.matched_fact_ids}</code>
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </details>
          ) : null}
        </section>
      </div>
    </main>
  );
}
