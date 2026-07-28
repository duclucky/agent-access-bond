import React, { useState } from 'react';
import { Icon } from './Icon';
import { useContract } from '../context/ContractContext';

export const CreditsView: React.FC = () => {
  const {
    userCredits,
    claimCredit,
    wallet,
    accounting,
    agents,
  } = useContract();

  const [claimedAmount, setClaimedAmount] = useState<number | null>(null);

  const handleClaim = async () => {
    if (userCredits <= 0) return;
    const amount = await claimCredit();
    setClaimedAmount(amount);
  };

  // Find all slashed penalty cases across agents
  const slashedCases = agents.flatMap(a =>
    a.cases.filter(c => c.verdict && c.verdict.user_credit_amount > 0)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <header className="border-b border-slate-800 pb-4">
        <h2 className="font-headline text-2xl md:text-3xl font-black uppercase text-white mb-1 flex items-center gap-2">
          <Icon name="payments" className="text-emerald-400 text-2xl" />
          Bond Slashes & User Credits Ledger
        </h2>
        <p className="font-sans text-xs md:text-sm text-slate-400">
          When an agent materially violates policy, validator adjudication automatically transfers penalty credits from the operator bond to the protected designated user.
        </p>
      </header>

      {claimedAmount !== null && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="task_alt" className="text-base" />
            <span>
              Successfully claimed <strong>{claimedAmount} GEN</strong> to wallet {wallet.address.substring(0, 8)}...
            </span>
          </div>
          <button
            onClick={() => setClaimedAmount(null)}
            className="text-slate-500 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Claimable Credit Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between border-l-4 border-l-emerald-500 glow-hover shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-slate-500 uppercase font-bold">
                Your Claimable Credits
              </span>
              <Icon name="account_balance_wallet" className="text-emerald-400 text-xl" />
            </div>
            <div className="font-mono text-3xl font-black text-emerald-400 mb-2">
              {userCredits} <span className="text-base text-slate-500">GEN</span>
            </div>
            <p className="font-sans text-xs text-slate-300 leading-relaxed">
              Penalties awarded to your designated beneficiary address from slashed operator bonds.
            </p>
          </div>

          <button
            onClick={() => void handleClaim()}
            disabled={userCredits <= 0}
            className="mt-6 w-full bg-emerald-500 text-slate-950 font-mono text-xs font-bold uppercase py-3 px-4 rounded-xl hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <Icon name="download" className="text-base" />
            <span>Claim & Withdraw to Wallet</span>
          </button>
        </div>

        {/* Protocol Slashed Penalties */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between border-l-4 border-l-red-500 glow-hover">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-slate-500 uppercase font-bold">
                Total Slashed Penalties
              </span>
              <Icon name="gavel" className="text-red-400 text-xl" />
            </div>
            <div className="font-mono text-3xl font-black text-red-400 mb-2">
              {accounting.total_slashed_penalties} <span className="text-base text-slate-500">GEN</span>
            </div>
            <p className="font-sans text-xs text-slate-300 leading-relaxed">
              Historical penalty amounts deducted from operator bonds due to material policy violations.
            </p>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-800 font-mono text-xs text-slate-500">
            Claimed by Users: <strong className="text-white">{accounting.total_claimed_user_credits} GEN</strong>
          </div>
        </div>

        {/* Contract Vault Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between border-l-4 border-l-orange-500 glow-hover">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-slate-500 uppercase font-bold">
                GenLayer Contract Vault
              </span>
              <Icon name="savings" className="text-orange-500 text-xl" />
            </div>
            <div className="font-mono text-3xl font-black text-white mb-2">
              {accounting.contract_balance} <span className="text-base text-orange-500">GEN</span>
            </div>
            <p className="font-sans text-xs text-slate-300 leading-relaxed">
              Total operator collateral + active challenge bonds held in the Intelligent Contract.
            </p>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-800 font-mono text-xs text-slate-500">
            Active Challenge Stakes: <strong className="text-amber-400">{accounting.total_active_challenge_bonds} GEN</strong>
          </div>
        </div>
      </div>

      {/* Slashed Penalties Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 glow-hover">
        <h3 className="font-headline text-lg font-black uppercase text-white mb-4 flex items-center gap-2">
          <Icon name="shield_with_heart" className="text-red-400" />
          Slashed Bond Credit Settlements Audit Log
        </h3>

        {slashedCases.length === 0 ? (
          <div className="p-6 text-center text-slate-500 font-sans text-xs bg-slate-950 rounded-xl border border-slate-800">
            No bond slash events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-slate-900 font-mono text-xs text-slate-500 uppercase border-b border-slate-800">
                  <th className="p-3.5">Case ID</th>
                  <th className="p-3.5">Agent ID</th>
                  <th className="p-3.5">Violation Type</th>
                  <th className="p-3.5">Slashed Credit</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {slashedCases.map((c) => (
                  <tr key={c.case_id} className="hover:bg-slate-900/60">
                    <td className="p-3.5 font-mono font-bold text-white">{c.case_id}</td>
                    <td className="p-3.5 font-mono text-orange-400 font-bold">{c.agent_id}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[10px] font-bold uppercase">
                        {c.verdict?.violation_type}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-black text-emerald-400">
                      +{c.verdict?.user_credit_amount} GEN
                    </td>
                    <td className="p-3.5 font-mono text-slate-500 text-[11px]">{c.verdict?.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
