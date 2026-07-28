import { ExternalLink, ShieldCheck, Unplug, Wallet } from "lucide-react";

import { shortAddress } from "../presentation";

export function WalletBar({
  account,
  contractAddress,
  explorerUrl,
  connecting,
  onConnect
}: {
  account: string | null;
  contractAddress: string;
  explorerUrl: string;
  connecting: boolean;
  onConnect: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <span className="brand-mark">
          <ShieldCheck size={22} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div>
          <strong>AgentAccessBond</strong>
          <span>Accountable access for web agents</span>
        </div>
      </div>

      <div className="network-cluster">
        <a
          className="contract-link"
          href={`${explorerUrl}/address/${contractAddress}`}
          target="_blank"
          rel="noreferrer"
          title="Open contract in explorer"
        >
          <span className="network-dot" aria-hidden="true" />
          <span>Studionet</span>
          <code>{shortAddress(contractAddress)}</code>
          <ExternalLink size={13} aria-hidden="true" />
        </a>
        <button
          className={account ? "wallet-button connected" : "wallet-button"}
          type="button"
          onClick={onConnect}
          disabled={connecting}
        >
          {account ? (
            <Wallet size={17} aria-hidden="true" />
          ) : (
            <Unplug size={17} aria-hidden="true" />
          )}
          {connecting
            ? "Connecting"
            : account
              ? shortAddress(account)
              : "Connect wallet"}
        </button>
      </div>
    </header>
  );
}
