import React, { useState } from 'react';
import { useContract } from '../context/ContractContext';
import { AccessCase } from '../types';

interface ReviewCasesViewProps {
  onSelectAgent: (agentId: string) => void;
  initialAgentIdForChallenge?: string;
}

export const ReviewCasesView: React.FC<ReviewCasesViewProps> = ({
  onSelectAgent,
  initialAgentIdForChallenge,
}) => {
  const {
    agents,
    openChallenge,
    adjudicateCase,
    get_agent,
  } = useContract();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedCase, setSelectedCase] = useState<AccessCase | null>(null);

  // New Challenge Modal State
  const [showChallengeModal, setShowChallengeModal] = useState<boolean>(
    !!initialAgentIdForChallenge
  );
  const [targetAgentId, setTargetAgentId] = useState<string>(
    initialAgentIdForChallenge || (agents[0]?.agent_id ?? 'AGENT-8821')
  );
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [challengeBond, setChallengeBond] = useState<number>(50);
  const [challengeDesc, setChallengeDesc] = useState<string>('');
  const [isSubmittingChallenge, setIsSubmittingChallenge] = useState<boolean>(false);

  const [isAdjudicating, setIsAdjudicating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Flatten all cases
  const allCases: AccessCase[] = agents.flatMap(a => a.cases);

  const filteredCases = allCases.filter(c => {
    if (filterStatus === 'ALL') return true;
    return c.status === filterStatus;
  });

  const handleOpenChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim() || !receiptUrl.trim()) return;

    setIsSubmittingChallenge(true);
    setErrorMsg('');
    try {
      const newCaseId = await openChallenge({
        agent_id: targetAgentId,
        target_url: targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`,
        receipt_url: receiptUrl.startsWith('http') ? receiptUrl : `https://${receiptUrl}`,
        challenge_bond: Number(challengeBond),
        description: challengeDesc || "Challenger submitted receipt alleging policy breach.",
      });

      setShowChallengeModal(false);
      setTargetUrl('');
      setReceiptUrl('');
      const created = get_agent(targetAgentId)?.cases.find(c => c.case_id === newCaseId);
      if (created) setSelectedCase(created);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to open access challenge.');
    } finally {
      setIsSubmittingChallenge(false);
    }
  };

  const handleRunAdjudication = async (caseId: string) => {
    setIsAdjudicating(true);
    setErrorMsg('');
    try {
      await adjudicateCase(caseId);
      setIsAdjudicating(false);
      setSelectedCase(null);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to run adjudication.');
      setIsAdjudicating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-headline text-2xl md:text-3xl font-black uppercase tracking-tighter text-white mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-500 text-2xl">gavel</span>
            Access Cases & Validator Reviews
          </h2>
          <p className="font-sans text-xs md:text-sm text-slate-400">
            GenLayer validators inspect public receipts, robots.txt, and policy URLs to reach consensus on agent violations.
          </p>
        </div>

        <button
          onClick={() => setShowChallengeModal(true)}
          className="bg-orange-500 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-orange-400 transition-colors shadow-md flex items-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-sm">add_alert</span>
          <span>Submit Evidence Challenge</span>
        </button>
      </header>

      {/* Filter Tabs */}
      {errorMsg && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors ${
              filterStatus === 'ALL' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Cases ({allCases.length})
          </button>
          <button
            onClick={() => setFilterStatus('OPEN')}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors ${
              filterStatus === 'OPEN' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Open / Pending ({allCases.filter(c => c.status === 'OPEN').length})
          </button>
          <button
            onClick={() => setFilterStatus('RESOLVED')}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors ${
              filterStatus === 'RESOLVED' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Resolved ({allCases.filter(c => c.status === 'RESOLVED').length})
          </button>
        </div>

        <div className="font-mono text-xs text-slate-500">
          Consensus Model: <span className="text-orange-400 font-bold">GenLayer NonDeterministic Equivalence</span>
        </div>
      </div>

      {/* Cases List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCases.map((c) => {
          const parentAgent = get_agent(c.agent_id);
          return (
            <div
              key={c.case_id}
              className={`bg-slate-900 border rounded-2xl p-5 glow-hover flex flex-col justify-between transition-all ${
                c.status === 'OPEN' ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">
                      {c.case_id}
                    </span>
                    <button
                      onClick={() => onSelectAgent(c.agent_id)}
                      className="font-mono text-[11px] text-orange-400 hover:underline font-bold"
                    >
                      ({c.agent_id})
                    </button>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
                      c.status === 'OPEN'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Target URL Inspected</span>
                    <span className="text-slate-200 font-medium break-all">{c.target_url}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Public Action Receipt</span>
                    <a
                      href={c.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-orange-400 hover:underline flex items-center gap-1 truncate text-[11px] font-bold"
                    >
                      {c.receipt_url}
                      <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                    </a>
                  </div>

                  {c.verdict && (
                    <div className="pt-2">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">Finalized Verdict</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          c.verdict.applicability === 'MATERIAL_VIOLATION'
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                            : c.verdict.applicability === 'COMPLIANT'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 border border-slate-700 text-slate-400'
                        }`}
                      >
                        {c.verdict.applicability} ({c.verdict.violation_type})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-500 text-[11px]">
                  Bond Stake: <strong className="text-white">{c.challenge_bond} GEN</strong>
                </span>

                <button
                  onClick={() => setSelectedCase(c)}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1"
                >
                  <span>{c.status === 'OPEN' ? 'Review & Adjudicate' : 'View Verdict'}</span>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Case Review & Validator Consensus Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCase(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-slate-500 font-bold uppercase">GENLAYER ADJUDICATION ENGINE</span>
                <span className="font-mono text-xs text-orange-400 font-bold">{selectedCase.case_id}</span>
              </div>
              <h3 className="font-headline text-xl font-black uppercase text-white">
                Case Evidence Review for Agent {selectedCase.agent_id}
              </h3>
            </div>

            {/* Evidence Comparison Table */}
            <div className="space-y-3 font-mono text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <h4 className="text-orange-400 font-bold uppercase text-[11px] tracking-wider">Public Evidence Inspected by Validators</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Target URL Alleged</span>
                  <code className="text-slate-200 bg-slate-900 p-2 rounded-xl border border-slate-800 block break-all mt-1">
                    {selectedCase.target_url}
                  </code>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Public Action Receipt URL</span>
                  <code className="text-slate-200 bg-slate-900 p-2 rounded-xl border border-slate-800 block break-all mt-1">
                    {selectedCase.receipt_url}
                  </code>
                </div>
              </div>

              {selectedCase.description && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Challenger Claim Description</span>
                  <p className="font-sans text-xs text-slate-300 mt-1">{selectedCase.description}</p>
                </div>
              )}
            </div>

            {/* If Resolved, showVerdict */}
            {selectedCase.verdict ? (
              <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="font-mono text-xs text-emerald-400 font-bold flex items-center gap-1.5 uppercase">
                    <span className="material-symbols-outlined text-base">verified</span>
                    Canonical Verdict Finalized
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    Verdict ID: {selectedCase.verdict.verdict_id}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Applicability Class</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block uppercase mt-1 ${
                      selectedCase.verdict.applicability === 'MATERIAL_VIOLATION'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {selectedCase.verdict.applicability}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Violation Type</span>
                    <span className="text-white font-bold block mt-1">{selectedCase.verdict.violation_type}</span>
                  </div>
                </div>

                <div className="space-y-1 font-sans text-xs">
                  <span className="font-mono text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Consensus Rationale</span>
                  <p className="text-slate-300 bg-slate-900 p-3 rounded-xl border border-slate-800 leading-relaxed">
                    {selectedCase.verdict.rationale}
                  </p>
                </div>
              </div>
            ) : (
              /* If Open, show Adjudication Control & Validator Simulation */
              <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <div className="border-b border-slate-800 pb-2">
                  <h4 className="font-headline text-base font-black uppercase text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">auto_mode</span>
                    Run GenLayer Validator Adjudication Consensus
                  </h4>
                  <p className="font-sans text-xs text-slate-400">
                    GenLayer validators will independently evaluate robots.txt, policy document, and action receipt.
                  </p>
                </div>

                <p className="font-sans text-xs text-slate-400">
                  The browser will submit a real Studionet transaction. The contract determines the verdict from bounded public evidence; this UI does not override validator output.
                </p>

                <button
                  onClick={() => void handleRunAdjudication(selectedCase.case_id)}
                  disabled={isAdjudicating}
                  className="w-full bg-emerald-500 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {isAdjudicating ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">
                        sync
                      </span>
                      <span>Validators Executing Equivalence Consensus...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">gavel</span>
                      <span>Execute Validator Consensus Adjudication</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCase(null)}
                className="bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs font-bold uppercase px-4 py-2 rounded-xl hover:bg-slate-800"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit New Evidence Challenge Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowChallengeModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-headline text-xl font-black uppercase text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">add_alert</span>
                Submit Public Evidence Challenge
              </h3>
              <p className="font-sans text-xs text-slate-400 mt-1">
                Lock a challenge bond to submit public action receipt showing an agent's policy breach.
              </p>
            </div>

            <form onSubmit={handleOpenChallengeSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                  Target Agent ID
                </label>
                <select
                  value={targetAgentId}
                  onChange={(e) => setTargetAgentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-orange-500"
                >
                  {agents.map((a) => (
                    <option key={a.agent_id} value={a.agent_id}>
                      {a.agent_id} ({a.origin}) - Min Bond: {a.minimum_challenge_bond} GEN
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                  Target Endpoint URL Alleged
                </label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://target.com/private/user-data"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                  Public Action Receipt URL
                </label>
                <input
                  type="url"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="https://receipts.genlayer.net/rcpt-1234.json"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                  Challenge Bond Amount (GEN)
                </label>
                <input
                  type="number"
                  min={10}
                  value={challengeBond}
                  onChange={(e) => setChallengeBond(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                  Breach Description / Rationale
                </label>
                <textarea
                  rows={3}
                  value={challengeDesc}
                  onChange={(e) => setChallengeDesc(e.target.value)}
                  placeholder="Brief explanation of how the receipt proves access outside permitted policy paths..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-sans text-xs p-3 rounded-xl focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowChallengeModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-mono text-xs uppercase font-bold hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingChallenge}
                  className="px-5 py-2 rounded-xl bg-orange-500 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider hover:bg-orange-400 transition-colors flex items-center gap-2"
                >
                  {isSubmittingChallenge ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">
                        sync
                      </span>
                      <span>Locking Challenge Bond...</span>
                    </>
                  ) : (
                    <span>Lock Bond & Open Case</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
