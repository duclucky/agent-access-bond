import { ExternalLink, ShieldCheck, Unplug, Wallet } from "lucide-react";

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
  const short = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`;

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <span className="brand-mark">
          <ShieldCheck size={23} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div>
          <strong>AgentAccessBond</strong>
          <span>Studionet control surface</span>
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
          <code>{short(contractAddress)}</code>
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
          {connecting ? "Connecting" : account ? short(account) : "Connect wallet"}
        </button>
      </div>
    </header>
  );
}
