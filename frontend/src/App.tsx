import { useState } from "react";

import { AgentDetailView } from "./components/AgentDetailView";
import { CreditsView } from "./components/CreditsView";
import { DashboardView } from "./components/DashboardView";
import { Header } from "./components/Header";
import { IntegratorApiView } from "./components/IntegratorApiView";
import { RegisterAgentView } from "./components/RegisterAgentView";
import { ReviewCasesView } from "./components/ReviewCasesView";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { ContractProvider } from "./context/ContractContext";
import type { PublicConfig } from "./config";

function AppContent() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [challengeTargetAgentId, setChallengeTargetAgentId] = useState<string | undefined>();

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentTab("agent-detail");
  };

  const handleOpenChallengeForAgent = (agentId: string) => {
    setChallengeTargetAgentId(agentId);
    setCurrentTab("cases");
  };

  const handleNavigate = (tab: string) => {
    setCurrentTab(tab);
    if (tab !== "agent-detail") {
      setSelectedAgentId(null);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-200 font-sans min-h-screen flex selection:bg-orange-500 selection:text-black">
      <Sidebar
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <Header
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-20 lg:pt-8 relative min-h-screen overflow-y-auto">
        <div className="absolute inset-0 grid-pattern opacity-15 pointer-events-none z-0" />
        <div className="relative z-10">
          {currentTab === "dashboard" && (
            <DashboardView onSelectAgent={handleSelectAgent} onNavigate={handleNavigate} />
          )}
          {currentTab === "agent-detail" && selectedAgentId && (
            <AgentDetailView
              agentId={selectedAgentId}
              onBack={() => handleNavigate("dashboard")}
              onOpenChallengeForAgent={handleOpenChallengeForAgent}
            />
          )}
          {currentTab === "register" && (
            <RegisterAgentView
              onSuccess={handleSelectAgent}
              onCancel={() => handleNavigate("dashboard")}
            />
          )}
          {currentTab === "cases" && (
            <ReviewCasesView
              onSelectAgent={handleSelectAgent}
              initialAgentIdForChallenge={challengeTargetAgentId}
            />
          )}
          {currentTab === "credits" && <CreditsView />}
          {currentTab === "api" && <IntegratorApiView />}
        </div>
      </main>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export function App({ config }: { config: PublicConfig }) {
  return (
    <ContractProvider config={config}>
      <AppContent />
    </ContractProvider>
  );
}
