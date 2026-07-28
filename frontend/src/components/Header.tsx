import React from 'react';
import { Icon } from './Icon';
import { useContract } from '../context/ContractContext';
import { USER_NAV_ITEMS } from '../navigation';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate }) => {
  const { wallet, connectWallet } = useContract();

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 w-full z-40 flex justify-between items-center px-4 h-16 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
        <button
          type="button"
          aria-label="Dashboard"
          onClick={() => onNavigate('dashboard')}
          className="flex min-h-11 items-center gap-2 text-left"
        >
          <Icon name="security" className="text-orange-500 text-2xl" />
          <span className="font-headline font-black text-sm text-white uppercase">AgentAccessBond</span>
        </button>
        <button
          type="button"
          onClick={connectWallet}
          className="min-h-11 bg-orange-500 text-slate-950 font-sans text-xs px-3 py-2 rounded-lg hover:bg-orange-400 font-bold uppercase flex items-center gap-1.5 shadow-sm"
        >
          <Icon name="account_balance_wallet" className="text-sm" />
          <span>{wallet.isConnected ? `${wallet.address.substring(0, 4)}..` : 'Connect'}</span>
        </button>
      </header>

      <nav aria-label="Mobile navigation" className="lg:hidden fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t border-slate-800 bg-slate-950/95 px-2 backdrop-blur-md">
        {USER_NAV_ITEMS.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 font-sans text-[11px] transition-colors ${
                isActive ? 'text-orange-400' : 'text-slate-500 hover:text-slate-200'
              }`}
            >
              <Icon name={item.icon} className="text-lg" />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
