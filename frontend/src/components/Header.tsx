import React from 'react';
import { Icon } from './Icon';
import { useContract } from '../context/ContractContext';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate, onOpenSettings }) => {
  const { wallet, connectWallet } = useContract();

  return (
    <header className="lg:hidden fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 h-16 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('dashboard')}>
        <Icon name="security" className="text-orange-500 text-2xl" />
        <span className="font-headline font-black text-base text-white uppercase">AgentAccessBond</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          title="Contract & Role Settings"
        >
          <Icon name="settings" className="text-sm" />
        </button>
        <button
          onClick={connectWallet}
          className="bg-orange-500 text-slate-950 font-sans text-xs px-3 py-1.5 rounded-xl hover:bg-orange-400 font-bold uppercase flex items-center gap-1.5 shadow-sm"
        >
          <Icon name="account_balance_wallet" className="text-sm" />
          <span>{wallet.isConnected ? `${wallet.address.substring(0, 4)}..` : 'Connect'}</span>
        </button>
      </div>
    </header>
  );
};
