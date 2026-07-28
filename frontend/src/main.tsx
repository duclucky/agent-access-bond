import { ShieldAlert } from "lucide-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { loadPublicConfig } from "./config";
import "./styles.css";

function Root() {
  try {
    const config = loadPublicConfig({
      VITE_GENLAYER_NETWORK: import.meta.env.VITE_GENLAYER_NETWORK,
      VITE_GENLAYER_CONTRACT_ADDRESS:
        import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS,
      VITE_GENLAYER_EXPLORER_URL: import.meta.env.VITE_GENLAYER_EXPLORER_URL
    });
    return <App config={config} />;
  } catch (error) {
    return (
      <main className="configuration-state">
        <ShieldAlert size={32} aria-hidden="true" />
        <h1>AgentAccessBond</h1>
        <p>{error instanceof Error ? error.message : String(error)}</p>
        <span>Studionet configuration pending</span>
      </main>
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
