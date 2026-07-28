import React from 'react';
import { Icon } from './Icon';
import { useContract } from '../context/ContractContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    wallet,
    setRole,
    contractAddress,
    networkName,
  } = useContract();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white"
        >
          <Icon name="close" className="" />
        </button>

        <div className="border-b border-slate-800 pb-3">
          <h3 className="font-headline text-xl font-black uppercase text-white flex items-center gap-2">
            <Icon name="settings" className="text-orange-500" />
            Protocol Settings & Role Switcher
          </h3>
          <p className="font-sans text-xs text-slate-400 mt-1">
            Review the connected Studionet contract and choose the working role label used by the interface.
          </p>
        </div>

        {/* Network & Contract Specs */}
        <div className="space-y-3 font-mono text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-bold uppercase text-[10px]">Target Network:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {networkName}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <span className="text-slate-500 font-bold uppercase text-[10px]">Contract Address:</span>
            <code className="text-orange-400 font-bold">{contractAddress}</code>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <span className="text-slate-500 font-bold uppercase text-[10px]">Current Connected Address:</span>
            <code className="text-slate-200">{wallet.address}</code>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="space-y-2 font-mono text-xs">
          <label className="text-slate-400 font-bold uppercase text-[11px] block">
            Switch Active Persona Role
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'user', label: 'Designated User', desc: 'Protected beneficiary receiving slashed penalty credits' },
              { id: 'operator', label: 'Operator', desc: 'Agent owner locking operator bond & policies' },
              { id: 'challenger', label: 'Challenger', desc: 'Submits public evidence & challenge bonds' },
              { id: 'integrator', label: 'Integrator', desc: 'External app checking can_execute()' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id as any)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  wallet.role === r.id
                    ? 'bg-orange-500/10 border-orange-500 text-white font-bold shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <div className={`font-bold mb-0.5 ${wallet.role === r.id ? 'text-orange-400' : 'text-slate-200'}`}>
                  {r.label}
                </div>
                <div className="font-sans text-[10px] text-slate-400 leading-tight">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="bg-orange-500 text-slate-950 font-mono text-xs font-bold uppercase px-5 py-2.5 rounded-xl hover:bg-orange-400 transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
