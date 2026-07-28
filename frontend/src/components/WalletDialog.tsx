import { useEffect } from "react";
import { Smartphone, Wallet, X } from "lucide-react";

import type { InjectedWallet } from "../wallet";

export function WalletDialog({
  wallets,
  connectingId,
  onClose,
  onSelect,
  onMetaMaskConnect
}: {
  wallets: InjectedWallet[];
  connectingId: string | null;
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
      className="wallet-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !connectingId) onClose();
      }}
    >
      <section
        className="wallet-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-dialog-title"
      >
        <div className="wallet-dialog-heading">
          <div>
            <span className="eyebrow">Studionet</span>
            <h2 id="wallet-dialog-title">Connect wallet</h2>
          </div>
          <button
            className="wallet-dialog-close"
            type="button"
            aria-label="Close wallet dialog"
            onClick={onClose}
            disabled={Boolean(connectingId)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="wallet-dialog-section">
          <strong>Installed extensions</strong>
          <div className="wallet-options">
            {wallets.length > 0 ? (
              wallets.map((wallet) => (
                <button
                  key={wallet.info.uuid}
                  className="wallet-option"
                  type="button"
                  onClick={() => onSelect(wallet)}
                  disabled={Boolean(connectingId)}
                  aria-label={wallet.info.name}
                >
                  {wallet.info.icon.startsWith("data:image/") ? (
                    <img src={wallet.info.icon} alt="" />
                  ) : (
                    <span className="wallet-option-icon">
                      <Wallet size={19} aria-hidden="true" />
                    </span>
                  )}
                  <span>{wallet.info.name}</span>
                  {connectingId === wallet.info.uuid && (
                    <span className="wallet-option-state">Connecting</span>
                  )}
                </button>
              ))
            ) : (
              <p className="wallet-empty">No extension wallets detected</p>
            )}
          </div>
        </div>

        <div className="wallet-dialog-section wallet-dialog-fallback">
          <strong>Mobile</strong>
          <button
            className="wallet-option"
            type="button"
            onClick={onMetaMaskConnect}
            disabled={Boolean(connectingId)}
            aria-label="MetaMask mobile or QR"
          >
            <span className="wallet-option-icon">
              <Smartphone size={19} aria-hidden="true" />
            </span>
            <span>MetaMask mobile / QR</span>
          </button>
        </div>
      </section>
    </div>
  );
}
