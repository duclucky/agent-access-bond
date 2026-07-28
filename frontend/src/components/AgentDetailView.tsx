import React, { useEffect, useState } from 'react';
import { useContract } from '../context/ContractContext';
import { AccessCase, Verdict } from '../types';

interface AgentDetailViewProps {
  agentId: string;
  onBack: () => void;
  onOpenChallengeForAgent: (agentId: string) => void;
}

export const AgentDetailView: React.FC<AgentDetailViewProps> = ({
  agentId,
  onBack,
  onOpenChallengeForAgent,
}) => {
  const {
    get_agent,
    can_execute,
    approveAgent,
    togglePauseAgent,
    proposeClosure,
    wallet,
    adjudicateCase,
    contractAddress,
    refreshAgent,
    loading,
    lastError,
  } = useContract();

  const [selectedVerdict, setSelectedVerdict] = useState<Verdict | null>(null);
  const [selectedCase, setSelectedCase] = useState<AccessCase | null>(null);
  const [isRawStateOpen, setIsRawStateOpen] = useState(false);

  const agent = get_agent(agentId);

  useEffect(() => {
    if (!agent) void refreshAgent(agentId);
  }, [agent, agentId, refreshAgent]);

  if (!agent) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-2xl my-12">
        <span className="material-symbols-outlined text-5xl text-slate-500">{loading ? 'sync' : 'search_off'}</span>
        <h3 className="font-headline text-xl text-white font-bold uppercase">
          {loading ? 'Reading Contract State' : 'Agent Not Found'}
        </h3>
        <p className="font-sans text-sm text-slate-400">
          {lastError
            ? lastError
            : <>No loaded contract state found for agent ID <code className="text-orange-400">{agentId}</code>.</>}
        </p>
        <button
          onClick={onBack}
          className="bg-orange-500 text-slate-950 font-mono text-xs px-4 py-2 rounded-xl font-bold uppercase hover:bg-orange-400"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const executable = can_execute(agent.agent_id);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
        <button onClick={onBack} className="hover:text-white transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Dashboard
        </button>
        <span>/</span>
        <span className="text-orange-400 font-bold">{agent.agent_id}</span>
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <h2 className="font-headline text-3xl font-black tracking-tighter text-white uppercase">
            {agent.agent_id}
          </h2>

          {agent.status === 'ACTIVE' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              ACTIVE
            </div>
          )}

          {agent.status === 'QUARANTINED' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs font-bold">
              <span className="material-symbols-outlined text-sm">warning</span>
              QUARANTINED
            </div>
          )}

          {agent.status === 'PENDING_REVIEW' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold">
              <span className="material-symbols-outlined text-sm">pending</span>
              PENDING_REVIEW
            </div>
          )}

          {agent.status === 'DRAFT' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono text-xs font-bold">
              <span className="material-symbols-outlined text-sm">edit_note</span>
              DRAFT (Awaiting Approval)
            </div>
          )}

          {agent.status === 'CLOSED' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-500 font-mono text-xs font-bold">
              <span className="material-symbols-outlined text-sm">lock</span>
              CLOSED
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {agent.status === 'DRAFT' && (
            <button
              onClick={() => void approveAgent(agent.agent_id)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-mono text-xs font-bold uppercase hover:bg-emerald-400 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              Approve Agent (Designated User)
            </button>
          )}

          {agent.status === 'ACTIVE' && (
            <button
              onClick={() => void togglePauseAgent(agent.agent_id)}
              className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors font-mono text-xs font-bold uppercase"
            >
              Propose Close
            </button>
          )}

          <button
            onClick={() => onOpenChallengeForAgent(agent.agent_id)}
            className="px-4 py-2 rounded-xl bg-orange-500 text-slate-950 hover:bg-orange-400 transition-colors font-mono text-xs font-bold uppercase shadow-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">gavel</span>
            Open Challenge
          </button>

          <button
            onClick={() => void proposeClosure(agent.agent_id)}
            className="px-3 py-2 rounded-xl border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 font-mono text-xs font-bold uppercase"
            title="Bilateral Agreement Closure"
          >
            {agent.close_proposed_by ? 'Accept Closure' : 'Propose Closure'}
          </button>
        </div>
      </header>

      {/* Warning Banner for Quarantined or Pending Review */}
      {agent.status === 'QUARANTINED' && (
        <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-2xl flex gap-4 items-start shadow-lg">
          <span className="material-symbols-outlined text-red-400 text-2xl shrink-0 mt-0.5">
            gavel
          </span>
          <div>
            <h3 className="font-headline text-lg font-black uppercase text-red-300 mb-1">
              Execution Pause: Validator Verdict Finalized a Material Violation
            </h3>
            <p className="font-sans text-sm text-slate-300 leading-relaxed">
              <code className="font-mono text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-red-400">
                can_execute(agent_id)
              </code>{' '}
              is now returning <strong className="text-red-400">false</strong>. A material policy violation was confirmed by GenLayer validator consensus, resulting in an immediate quarantine state. The penalty has been automatically settled from the agent's bonded balance.
            </p>
          </div>
        </div>
      )}

      {agent.status === 'PENDING_REVIEW' && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl flex gap-4 items-start shadow-lg">
          <span className="material-symbols-outlined text-amber-400 text-2xl shrink-0 mt-0.5">
            hourglass_top
          </span>
          <div>
            <h3 className="font-headline text-lg font-black uppercase text-amber-300 mb-1">
              Adjudication Pending: Challenge Case Under Validator Inspection
            </h3>
            <p className="font-sans text-sm text-slate-300 leading-relaxed">
              An active challenge is open against this agent. GenLayer validators are independently evaluating the public receipt evidence against robots.txt and policy constraints. Execution is paused until verdict consensus is reached.
            </p>
          </div>
        </div>
      )}

      {/* Bento Grid: Top Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Identity Card */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 glow-hover">
          <h3 className="font-headline text-lg font-black uppercase tracking-tighter text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-500 text-xl">
              fingerprint
            </span>
            Agent Identity
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                User-Agent String
              </span>
              <code className="block text-slate-200 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 break-all leading-relaxed">
                {agent.user_agent}
              </code>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                  Protected Origin URL
                </span>
                <a
                  href={agent.origin}
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange-400 hover:underline flex items-center gap-1 font-bold truncate"
                >
                  {agent.origin}
                  <span className="material-symbols-outlined text-xs">open_in_new</span>
                </a>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                  Policy URL
                </span>
                <a
                  href={agent.policy_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange-400 hover:underline flex items-center gap-1 font-bold truncate"
                >
                  {agent.policy_url}
                  <span className="material-symbols-outlined text-xs">open_in_new</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Operator Address
                </span>
                <span className="text-slate-300 truncate block">
                  {agent.operator}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Designated User Address
                </span>
                <span className="text-slate-300 truncate block">
                  {agent.user}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Bond Accounting Card */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 glow-hover relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-9xl">account_balance</span>
          </div>

          <h3 className="font-headline text-lg font-black uppercase tracking-tighter text-white border-b border-slate-800 pb-3 flex items-center gap-2 relative z-10">
            <span className="material-symbols-outlined text-orange-500 text-xl">
              account_balance_wallet
            </span>
            Bond Accounting
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10 h-full">
            <div className="flex flex-col justify-center bg-slate-950 p-4 rounded-xl border border-slate-800 border-l-4 border-l-orange-500">
              <span className="font-mono text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                Operator Bond
              </span>
              <span className="font-mono text-xl font-black text-white">
                {agent.operator_bond}{' '}
                <span className="text-xs text-orange-500">GEN</span>
              </span>
            </div>

            <div className="flex flex-col justify-center bg-slate-950 p-4 rounded-xl border border-slate-800 border-l-4 border-l-amber-500">
              <span className="font-mono text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                Penalty Reserve
              </span>
              <span className="font-mono text-xl font-black text-amber-400">
                {agent.penalty_amount}{' '}
                <span className="text-xs text-slate-500">GEN</span>
              </span>
            </div>

            <div className="flex flex-col justify-center bg-slate-950 p-4 rounded-xl border border-slate-800 border-l-4 border-l-slate-700">
              <span className="font-mono text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                Min Challenge Bond
              </span>
              <span className="font-mono text-xl font-black text-slate-300">
                {agent.minimum_challenge_bond}{' '}
                <span className="text-xs text-slate-500">GEN</span>
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Allowed Purpose Card */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 glow-hover">
        <h3 className="font-headline text-lg font-black uppercase tracking-tighter text-white mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500 text-xl">
            policy
          </span>
          Allowed Purpose (Immutable Scope)
        </h3>
        <p className="font-sans text-sm text-slate-300 leading-relaxed max-w-4xl bg-slate-950 p-4 rounded-xl border border-slate-800">
          {agent.allowed_purpose}
        </p>
      </section>

      {/* Access Review Timeline / Cases Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-headline text-lg font-black uppercase tracking-tighter text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-500 text-xl">
              history
            </span>
            Access Review Timeline ({agent.cases.length} Cases)
          </h3>

          <button
            onClick={() => onOpenChallengeForAgent(agent.agent_id)}
            className="text-orange-400 font-mono text-xs hover:underline flex items-center gap-1 font-bold uppercase tracking-wider"
          >
            + Submit Evidence Challenge
          </button>
        </div>

        {agent.cases.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 font-sans text-sm">
            No access challenge cases have been logged for this agent.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-slate-900 font-mono text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  <th className="p-3.5 whitespace-nowrap">Case ID</th>
                  <th className="p-3.5 whitespace-nowrap">Target URL</th>
                  <th className="p-3.5 whitespace-nowrap">Case Status</th>
                  <th className="p-3.5 whitespace-nowrap">Applicability</th>
                  <th className="p-3.5 whitespace-nowrap">Timestamp</th>
                  <th className="p-3.5 whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {agent.cases.map((c) => (
                  <tr
                    key={c.case_id}
                    className="hover:bg-slate-900/60 transition-colors"
                  >
                    <td className="p-3.5 font-mono font-bold text-white">
                      {c.case_id}
                    </td>
                    <td className="p-3.5 font-mono text-orange-400 max-w-xs truncate" title={c.target_url}>
                      {c.target_url}
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        c.status === 'RESOLVED' ? 'bg-slate-800 text-slate-300' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {c.verdict ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          c.verdict.applicability === 'MATERIAL_VIOLATION'
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                            : c.verdict.applicability === 'COMPLIANT'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 border border-slate-700 text-slate-400'
                        }`}>
                          {c.verdict.applicability}
                        </span>
                      ) : (
                        <button
                          onClick={() => void adjudicateCase(c.case_id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-mono text-[10px] font-bold hover:bg-amber-400 uppercase tracking-wider transition-colors"
                        >
                          Run Validator Adjudication
                        </button>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500 text-[11px]">
                      {c.created_at}
                    </td>
                    <td className="p-3.5 text-right">
                      {c.verdict ? (
                        <button
                          onClick={() => {
                            setSelectedVerdict(c.verdict!);
                            setSelectedCase(c);
                          }}
                          className="text-orange-400 hover:underline font-mono text-xs inline-flex items-center gap-1 font-bold uppercase tracking-wider"
                        >
                          View Verdict <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px] uppercase">In Review</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Technical Collapsible Details (Raw State) */}
      <details
        open={isRawStateOpen}
        onToggle={(e) => setIsRawStateOpen((e.target as HTMLDetailsElement).open)}
        className="group bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition-all"
      >
        <summary className="cursor-pointer p-4 font-mono text-xs text-slate-400 bg-slate-900 hover:bg-slate-800/80 transition-colors flex items-center justify-between select-none">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-base">terminal</span>
            <span>Technical Details (Raw Contract State)</span>
          </div>
          <span className="material-symbols-outlined transform group-open:rotate-180 transition-transform">
            expand_more
          </span>
        </summary>

        <div className="p-5 border-t border-slate-800 bg-slate-950 space-y-4">
          <div className="flex flex-col gap-1 font-mono text-xs">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              GenLayer Contract Address
            </span>
            <span className="text-orange-400 break-all font-bold">
              {contractAddress} (GenLayer Studionet)
            </span>
          </div>

          <div className="flex flex-col gap-1 font-mono text-xs">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              Raw State JSON (`get_agent("{agent.agent_id}")`)
            </span>
            <pre className="bg-slate-900 p-4 rounded-xl border border-slate-800 overflow-x-auto text-[11px] text-slate-300 leading-relaxed">
              {JSON.stringify(agent, null, 2)}
            </pre>
          </div>
        </div>
      </details>

      {/* Verdict Detail Modal / Drawer */}
      {selectedVerdict && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setSelectedVerdict(null);
                setSelectedCase(null);
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-slate-500 font-bold uppercase">VERDICT DETAIL</span>
                <span className="font-mono text-xs text-orange-400 font-bold">{selectedVerdict.verdict_id}</span>
              </div>
              <h3 className="font-headline text-xl font-black uppercase text-white">
                Case {selectedCase.case_id} Review
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider mb-1">Applicability</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-block uppercase ${
                  selectedVerdict.applicability === 'MATERIAL_VIOLATION'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {selectedVerdict.applicability}
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider mb-1">Violation Type</span>
                <span className="text-white font-bold">{selectedVerdict.violation_type}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider mb-1">Source Coverage</span>
                <span className="text-slate-300">{selectedVerdict.source_coverage}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider mb-1">Validator Consensus</span>
                <span className="text-emerald-400 font-bold">
                  {selectedVerdict.validator_signatures}/{selectedVerdict.total_validators} Nodes Agreed (100%)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-mono text-xs text-slate-500 block uppercase font-bold tracking-wider">Target URL Inspected</span>
              <code className="block font-mono text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-orange-400 break-all">
                {selectedVerdict.target_url}
              </code>
            </div>

            <div className="space-y-2">
              <span className="font-mono text-xs text-slate-500 block uppercase font-bold tracking-wider">Validator Consensus Rationale</span>
              <p className="font-sans text-xs text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                {selectedVerdict.rationale}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setSelectedVerdict(null);
                  setSelectedCase(null);
                }}
                className="bg-orange-500 text-slate-950 font-mono text-xs px-5 py-2 rounded-xl font-bold uppercase hover:bg-orange-400"
              >
                Close Verdict Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
