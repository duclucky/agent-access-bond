import {
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  RotateCcw,
  XCircle
} from "lucide-react";

import type { TxState } from "../tx-state";

const STATUS_LABELS: Record<TxState["status"], string> = {
  idle: "No transaction",
  submitted: "Submitted",
  accepted: "Accepted",
  finalized: "Finalized",
  failed: "Failed"
};

export function TransactionActivity({
  state,
  explorerUrl,
  onRetry
}: {
  state: TxState;
  explorerUrl: string;
  onRetry?: () => void;
}) {
  const StatusIcon =
    state.status === "finalized"
      ? CheckCircle2
      : state.status === "failed"
        ? XCircle
        : CircleDashed;

  return (
    <section className="activity-panel" aria-labelledby="activity-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Network activity</p>
          <h2 id="activity-title">Transaction</h2>
        </div>
        <span className={`status-badge status-${state.status}`}>
          <StatusIcon size={14} aria-hidden="true" />
          {STATUS_LABELS[state.status]}
        </span>
      </div>

      <dl className="activity-details">
        <div>
          <dt>Operation</dt>
          <dd>{state.operation ?? "—"}</dd>
        </div>
        <div>
          <dt>Hash</dt>
          <dd>
            {state.hash ? (
              <a
                href={`${explorerUrl}/transactions/${state.hash}`}
                target="_blank"
                rel="noreferrer"
              >
                {state.hash}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      {state.error ? <p className="inline-error">{state.error}</p> : null}
      {state.status === "failed" && onRetry ? (
        <button className="secondary-button" type="button" onClick={onRetry}>
          <RotateCcw size={16} aria-hidden="true" />
          Retry transaction
        </button>
      ) : null}
    </section>
  );
}
