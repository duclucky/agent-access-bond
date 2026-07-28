import React, { useState } from 'react';
import { Icon } from './Icon';
import { useContract } from '../context/ContractContext';

interface DashboardViewProps {
  onSelectAgent: (agentId: string) => void;
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectAgent, onNavigate }) => {
  const { agents, accounting, can_execute, refreshAgent, loading, lastError } = useContract();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const cleanQuery = searchQuery.trim();
    const match = agents.find(
      a => a.agent_id.toLowerCase() === cleanQuery.toLowerCase() ||
           a.origin.toLowerCase().includes(cleanQuery.toLowerCase())
    );
    if (match) {
      onSelectAgent(match.agent_id);
    } else {
      await refreshAgent(cleanQuery);
      onSelectAgent(cleanQuery);
    }
  };

  const filteredAgents = agents.filter(agent => {
    if (filterStatus !== 'ALL' && agent.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Central Inspection Hero Card - Bento Style */}
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center text-center p-8 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl relative overflow-hidden backdrop-blur-sm">
        <div className="absolute inset-0 grid-pattern opacity-25 pointer-events-none z-0"></div>

        <div className="relative z-10 flex flex-col items-center w-full">
          {/* Hero Icon Badge */}
          <div className="w-16 h-16 rounded-2xl border border-orange-500/30 bg-slate-950 flex items-center justify-center mb-5 relative group shadow-inner">
            <Icon name="policy" className="text-3xl text-orange-500" />
          </div>

          <div className="space-y-2 mb-6">
            <h2 className="font-headline text-3xl font-black text-white uppercase">
              Inspect Agent Bond
            </h2>
            <p className="font-sans text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Enter a unique identifier to review a registered web agent's bond status, access policy scope, and breach evidence enforced by GenLayer validator consensus.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="w-full max-w-md relative">
            <div className="relative flex items-center">
              <Icon name="search" className="absolute left-4 text-slate-500 text-lg" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Agent ID"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-sans text-sm pl-11 pr-28 py-3.5 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-1.5 bg-orange-500 text-slate-950 font-sans text-xs font-bold px-4 py-2 rounded-lg hover:bg-orange-400 transition-colors uppercase shadow-sm"
              >
                {loading ? 'Reading' : 'Inspect'}
              </button>
            </div>
          </form>

          {lastError && (
            <div className="mt-4 max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-left font-sans text-xs text-red-300">
              {lastError}
            </div>
          )}

          {/* Divider */}
          <div className="w-full flex items-center gap-4 my-6 opacity-30">
            <div className="h-px bg-slate-700 flex-1"></div>
            <span className="font-mono text-xs text-slate-500 font-bold">OR</span>
            <div className="h-px bg-slate-700 flex-1"></div>
          </div>

          {/* Secondary CTA */}
          <button
            onClick={() => onNavigate('register')}
            className="border border-slate-800 bg-slate-950 text-slate-200 font-sans text-xs font-bold uppercase px-5 py-2.5 rounded-xl hover:bg-slate-800 hover:border-orange-500/40 transition-all flex items-center gap-2 shadow-sm"
          >
            <Icon name="add_circle" className="text-base text-orange-500" />
            <span>Register New Agent Bond</span>
          </button>

          {/* Footer badges */}
          <div className="pt-6 flex items-center gap-6 justify-center w-full">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="font-sans text-xs text-slate-500">Validator Consensus Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="lock" className="text-xs text-slate-500" />
              <span className="font-sans text-xs text-slate-500">Immutable Access Ledger</span>
            </div>
          </div>
        </div>
      </div>

      {/* Protocol Financial Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 border-l-4 border-l-orange-500 glow-hover">
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-500">Total Locked Bonds</span>
            <Icon name="account_balance" className="text-lg text-orange-500" />
          </div>
          <div className="font-mono text-2xl font-black text-white">
            {accounting.total_locked_operator_bonds.toLocaleString()} <span className="text-xs text-orange-500 font-bold">GEN</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Operator security collateral
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 border-l-4 border-l-amber-500 glow-hover">
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-500">Active Challenge Bonds</span>
            <Icon name="gavel" className="text-lg text-amber-500" />
          </div>
          <div className="font-mono text-2xl font-black text-amber-400">
            {accounting.total_active_challenge_bonds.toLocaleString()} <span className="text-xs text-slate-500 font-bold">GEN</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pending validator review
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 border-l-4 border-l-red-500 glow-hover">
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-500">Total Slashed Penalties</span>
            <Icon name="shield_with_heart" className="text-lg text-red-500" />
          </div>
          <div className="font-mono text-2xl font-black text-red-400">
            {accounting.total_slashed_penalties.toLocaleString()} <span className="text-xs text-slate-500 font-bold">GEN</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Awarded to challenger claims
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 border-l-4 border-l-emerald-500 glow-hover">
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-500">Contract Vault Balance</span>
            <Icon name="savings" className="text-lg text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-black text-white">
            {accounting.contract_balance.toLocaleString()} <span className="text-xs text-emerald-400 font-bold">GEN</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            GenLayer Intelligent Vault
          </div>
        </div>
      </div>

      {/* Directory of Registered Agent Bonds */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-headline text-xl font-black text-white uppercase flex items-center gap-2">
              <Icon name="view_list" className="text-orange-500" />
              Contract-backed Agent Bonds
            </h3>
            <p className="font-sans text-xs text-slate-400">
              Agents appear here after you inspect or create them from canonical Studionet state.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-500 font-bold uppercase">Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-3 py-1.5 rounded-xl focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">All Statuses ({agents.length})</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="QUARANTINED">QUARANTINED</option>
              <option value="PENDING_REVIEW">PENDING_REVIEW</option>
              <option value="DRAFT">DRAFT</option>
            </select>
          </div>
        </div>

        {filteredAgents.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-sm text-slate-400">
            No agents loaded yet. Enter a registered Agent ID above to read it from the deployed contract.
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filteredAgents.map((agent) => {
            const executable = can_execute(agent.agent_id);
            return (
              <div
                key={agent.agent_id}
                onClick={() => onSelectAgent(agent.agent_id)}
                className="bg-slate-950 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-5 glow-hover cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-base font-bold text-white">
                        {agent.agent_id}
                      </span>
                      {agent.status === 'ACTIVE' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1">
                          <Icon name="check_circle" className="text-[12px]" />
                          ACTIVE
                        </span>
                      )}
                      {agent.status === 'QUARANTINED' && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[10px] font-bold flex items-center gap-1">
                          <Icon name="warning" className="text-[12px]" />
                          QUARANTINED
                        </span>
                      )}
                      {agent.status === 'PENDING_REVIEW' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10px] font-bold flex items-center gap-1">
                          <Icon name="pending" className="text-[12px]" />
                          PENDING_REVIEW
                        </span>
                      )}
                      {agent.status === 'DRAFT' && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px] font-bold flex items-center gap-1">
                          <Icon name="edit_note" className="text-[12px]" />
                          DRAFT
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-xs text-slate-500 flex items-center gap-1">
                      <span>can_execute:</span>
                      <span className={executable ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                        {executable ? "true" : "false"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 font-mono text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Protected Origin</span>
                      <span className="text-slate-300 truncate block font-medium">{agent.origin}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Allowed Purpose</span>
                      <p className="font-sans text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {agent.allowed_purpose}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between font-mono text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span>Bond: <strong className="text-white">{agent.operator_bond} GEN</strong></span>
                    <span>Penalty: <strong className="text-amber-400">{agent.penalty_amount} GEN</strong></span>
                  </div>
                  <span className="text-orange-500 flex items-center gap-0.5 text-xs font-bold uppercase">
                    Inspect <Icon name="chevron_right" className="text-sm" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};
