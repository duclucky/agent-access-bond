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
  const accentClass =
    state.status === "finalized"
      ? "border-l-emerald-500"
      : state.status === "failed"
        ? "border-l-red-500"
        : "border-l-amber-500";
  const iconClass =
    state.status === "finalized"
      ? "text-emerald-400"
      : state.status === "failed"
        ? "text-red-400"
        : "text-amber-400";

  return (
    <section
      className={`mb-6 flex flex-col gap-3 rounded-lg border border-l-[3px] border-slate-800 bg-slate-900 p-4 shadow-lg sm:flex-row sm:items-center ${accentClass}`}
      aria-live="polite"
      aria-labelledby="activity-title"
    >
      <span className={`shrink-0 ${iconClass}`}>
        <StatusIcon
          size={21}
          className={
            state.status === "submitted" || state.status === "accepted"
              ? "animate-spin"
              : undefined
          }
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="activity-title" className="font-headline text-sm font-bold text-white">
          {copy.title}
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          {state.operation
            ? friendlyAction(state.operation as ContractAction)
            : copy.description}
        </p>
        {state.error ? (
          <span className="mt-1 block text-xs text-red-300">{state.error}</span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        <span className="rounded-full bg-slate-800 px-2 py-1 font-mono text-[10px] font-bold uppercase text-slate-300">
          {state.status.charAt(0).toUpperCase() + state.status.slice(1)}
        </span>
        {state.hash ? (
          <a
            className="flex min-h-11 max-w-full items-center gap-1.5 overflow-hidden rounded-lg border border-slate-700 px-2.5 font-mono text-xs text-orange-400 hover:border-orange-500/50"
            href={`${explorerUrl}/transactions/${state.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            <code className="overflow-hidden text-ellipsis whitespace-nowrap">{state.hash}</code>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ) : null}
        {state.status === "failed" && onRetry ? (
          <button
            className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-200 hover:border-orange-500/50"
            type="button"
            onClick={onRetry}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Retry transaction
          </button>
        ) : null}
      </div>
    </section>
  );
}
