import React from 'react';
import { Icon } from './Icon';
import { useContract } from '../context/ContractContext';
import { USER_NAV_ITEMS } from '../navigation';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onNavigate }) => {
  const { wallet, connectWallet, userCredits } = useContract();

  return (
    <nav aria-label="Primary navigation" className="hidden lg:flex flex-col h-screen fixed left-0 top-0 py-6 px-4 w-64 border-r border-slate-800 bg-slate-900 z-30 select-none">
      <div className="flex flex-col h-full">
        {/* Header Branding */}
        <div className="mb-6 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <Icon name="security" className="text-orange-500 text-2xl" />
            </div>
            <div>
              <h1 className="font-headline text-base font-black text-white uppercase leading-none">
                AgentAccessBond
              </h1>
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
          {USER_NAV_ITEMS.map((item) => {
            const isActive = currentTab === item.id;
            const badge = item.id === 'credits' && userCredits > 0 ? `${userCredits} GEN` : undefined;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-sans text-sm transition-all ${
                    isActive
                      ? 'bg-orange-500/10 text-orange-400 font-bold border border-orange-500/30 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={item.icon} className="text-lg" />
                    <span>{item.label}</span>
                  </div>
                  {badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      {badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <button
            onClick={connectWallet}
            className={`w-full font-sans text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 font-bold uppercase ${
              wallet.isConnected
                ? 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-orange-500/40'
                : 'bg-orange-500 text-slate-950 hover:bg-orange-400 shadow-md'
            }`}
          >
            <Icon name="account_balance_wallet" className="text-sm" />
            <span>
              {wallet.isConnected
                ? `${wallet.address.substring(0, 6)}...${wallet.address.substring(wallet.address.length - 4)}`
                : 'Connect Wallet'}
            </span>
          </button>

        </div>
      </div>
    </nav>
  );
};
