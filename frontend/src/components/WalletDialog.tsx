import { useEffect } from "react";
import { Smartphone, Wallet, X } from "lucide-react";

import type { InjectedWallet } from "../wallet";

export function WalletDialog({
  wallets,
  connectingId,
  error,
  onClose,
  onSelect,
  onMetaMaskConnect
}: {
  wallets: InjectedWallet[];
  connectingId: string | null;
  error?: string | null;
  onClose: () => void;
  onSelect: (wallet: InjectedWallet) => void;
  onMetaMaskConnect: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !connectingId) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [connectingId, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !connectingId) onClose();
      }}
    >
      <section
        className="w-full max-w-md overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-dialog-title"
      >
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <span className="font-mono text-[11px] font-semibold uppercase text-emerald-400">GenLayer Studionet</span>
            <h2 id="wallet-dialog-title" className="mt-1 font-headline text-xl font-bold text-white">Connect wallet</h2>
          </div>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50"
            type="button"
            aria-label="Close wallet dialog"
            onClick={onClose}
            disabled={Boolean(connectingId)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <strong className="block text-sm font-semibold text-slate-200">Installed extensions</strong>
          {error && (
            <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm leading-relaxed text-red-300">
              {error}
            </div>
          )}
          <div className="space-y-2">
            {wallets.length > 0 ? (
              wallets.map((wallet) => (
                <button
                  key={wallet.info.uuid}
                  className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-3 text-left text-sm font-semibold text-slate-200 transition-colors hover:border-orange-500/50 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50"
                  type="button"
                  onClick={() => onSelect(wallet)}
                  disabled={Boolean(connectingId)}
                  aria-label={wallet.info.name}
                >
                  {wallet.info.icon.startsWith("data:image/") ? (
                    <img className="h-8 w-8 rounded-lg" src={wallet.info.icon} alt="" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-orange-400">
                      <Wallet size={19} aria-hidden="true" />
                    </span>
                  )}
                  <span>{wallet.info.name}</span>
                  {connectingId === wallet.info.uuid && (
                    <span className="ml-auto text-xs font-normal text-orange-400">Connecting...</span>
                  )}
                </button>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-sm text-slate-400">
                <strong className="block font-semibold text-slate-300">No extension wallets detected</strong>
                <span className="mt-1 block">Unlock your extension, then reopen this dialog.</span>
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-800 bg-slate-950/40 px-5 py-4">
          <strong className="mb-3 block text-sm font-semibold text-slate-200">Mobile or QR</strong>
          <button
            className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-3 text-left text-sm font-semibold text-slate-200 transition-colors hover:border-orange-500/50 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50"
            type="button"
            onClick={onMetaMaskConnect}
            disabled={Boolean(connectingId)}
            aria-label="MetaMask mobile or QR"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-orange-400">
              <Smartphone size={19} aria-hidden="true" />
            </span>
            <span>MetaMask mobile / QR</span>
          </button>
        </div>
      </section>
    </div>
  );
}
