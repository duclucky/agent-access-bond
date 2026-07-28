import React from 'react';
import { useContract } from '../context/ContractContext';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onNavigate, onOpenSettings }) => {
  const { wallet, connectWallet, userCredits, contractAddress } = useContract();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'register', label: 'Register Agent', icon: 'how_to_reg' },
    { id: 'cases', label: 'Review Cases', icon: 'gavel' },
    { id: 'credits', label: 'Credits', icon: 'payments', badge: userCredits > 0 ? `${userCredits} GEN` : undefined },
    { id: 'api', label: 'Integrator API', icon: 'code' },
  ];

  return (
    <nav className="hidden lg:flex flex-col h-screen fixed left-0 top-0 py-6 px-4 w-64 border-r border-slate-800 bg-slate-900 z-40 select-none">
      <div className="flex flex-col h-full">
        {/* Header Branding */}
        <div className="mb-6 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-orange-500 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                security
              </span>
            </div>
            <div>
              <h1 className="font-headline text-base font-black tracking-tighter text-white uppercase leading-none">
                AgentAccessBond
              </h1>
              <span className="text-orange-500 text-[10px] font-mono underline underline-offset-2">v1.0.4-GENLAYER</span>
            </div>
          </div>
        </div>

        {/* Network status pill */}
        <div className="mb-6 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-[11px] text-emerald-400 font-semibold uppercase">Studionet Active</span>
          </div>
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">GEN</span>
        </div>

        {/* Navigation Links */}
        <ul className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-mono text-xs transition-all ${
                    isActive
                      ? 'bg-orange-500/10 text-orange-400 font-bold border border-orange-500/30 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer Links & Wallet CTA */}
        <div className="mt-auto space-y-3 pt-4 border-t border-slate-800">
          <button
            onClick={connectWallet}
            className={`w-full font-mono text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-wider ${
              wallet.isConnected
                ? 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-orange-500/40'
                : 'bg-orange-500 text-slate-950 hover:bg-orange-400 shadow-md'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              account_balance_wallet
            </span>
            <span>
              {wallet.isConnected
                ? `${wallet.address.substring(0, 6)}...${wallet.address.substring(wallet.address.length - 4)}`
                : 'Connect Wallet'}
            </span>
          </button>

          <ul className="space-y-1">
            <li>
              <button
                onClick={onOpenSettings}
                className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all rounded-xl font-mono text-xs"
              >
                <span className="material-symbols-outlined text-sm">settings</span>
                <span>Settings & Role</span>
              </button>
            </li>
            <li>
              <a
                href="https://github.com/duclucky/agent-access-bond"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between px-3 py-2 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all rounded-xl font-mono text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-sm">menu_book</span>
                  <span>Contract Repo</span>
                </div>
                <span className="material-symbols-outlined text-xs">open_in_new</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};
