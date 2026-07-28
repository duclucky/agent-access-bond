import {
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  RotateCcw,
  XCircle
} from "lucide-react";

import { friendlyAction } from "../presentation";
import type { TxState } from "../tx-state";
import type { ContractAction } from "../workspace";

const STATUS_COPY: Record<
  Exclude<TxState["status"], "idle">,
  { title: string; description: string }
> = {
  submitted: {
    title: "Transaction submitted",
    description: "Your wallet approved the request."
  },
  accepted: {
    title: "Request accepted",
    description: "Studionet is processing the contract action."
  },
  finalized: {
    title: "Transaction complete",
    description: "The latest contract state is now displayed."
  },
  failed: {
    title: "Transaction failed",
    description: "No successful state change was recorded."
  }
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
  if (state.status === "idle") return null;

  const copy = STATUS_COPY[state.status];
  const StatusIcon =
    state.status === "finalized"
      ? CheckCircle2
      : state.status === "failed"
        ? XCircle
        : CircleDashed;

  return (
    <section
      className={`activity-panel activity-${state.status}`}
      aria-live="polite"
      aria-labelledby="activity-title"
    >
      <span className="activity-icon">
        <StatusIcon
          size={21}
          className={
            state.status === "submitted" || state.status === "accepted"
              ? "spin"
              : undefined
          }
          aria-hidden="true"
        />
      </span>
      <div className="activity-copy">
        <h2 id="activity-title">{copy.title}</h2>
        <p>
          {state.operation
            ? friendlyAction(state.operation as ContractAction)
            : copy.description}
        </p>
        {state.error ? <span className="inline-error">{state.error}</span> : null}
      </div>
      <div className="activity-actions">
        <span className="activity-state">
          {state.status.charAt(0).toUpperCase() + state.status.slice(1)}
        </span>
        {state.hash ? (
          <a
            href={`${explorerUrl}/transactions/${state.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            <code>{state.hash}</code>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ) : null}
        {state.status === "failed" && onRetry ? (
          <button className="secondary-button" type="button" onClick={onRetry}>
            <RotateCcw size={16} aria-hidden="true" />
            Retry transaction
          </button>
        ) : null}
      </div>
    </section>
  );
}
