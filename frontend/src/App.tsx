import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import {
  createAgentAccessClients,
  readCanonicalSnapshot,
  submitWriteAndFinalize,
  type WalletProvider
} from "./contract";
import { AgentWorkspace, type ActionFields } from "./components/AgentWorkspace";
import { TransactionActivity } from "./components/TransactionActivity";
import { WalletBar } from "./components/WalletBar";
import type { PublicConfig } from "./config";
import type { CanonicalSnapshot } from "./types";
import { initialTxState, txReducer } from "./tx-state";
import {
  connectStudionetWallet,
  type Eip1193Provider
} from "./wallet";
import {
  availableActions,
  executeAndRefresh,
  type ContractAction
} from "./workspace";

const DEFAULT_AGENT_ID = "agent-fixture-policy-001";
const DEFAULT_CASE_ID = "case-fixture-private-001";
const REPO_RAW =
  "https://raw.githubusercontent.com/duclucky/agent-access-bond/main";

const DEFAULT_FIELDS: ActionFields = {
  userAddress: "",
  userAgent: "AgentAccessBot/1.0",
  origin: "https://raw.githubusercontent.com",
  policyUrl: `${REPO_RAW}/docs/evidence/public-fixtures/agent-policy.txt`,
  allowedPurpose: "public search research only",
  operatorBond: "2000000000000000000",
  penaltyAmount: "1000000000000000000",
  minimumChallengeBond: "100000000000000000",
  caseId: DEFAULT_CASE_ID,
  targetUrl: `${REPO_RAW}/docs/evidence/public-fixtures/challenge-target/report.json`,
  receiptUrl: `${REPO_RAW}/docs/evidence/public-fixtures/case-1-receipt.json`,
  challengeBond: "100000000000000000",
  withdrawAmount: ""
};

type BrowserProvider = WalletProvider & Eip1193Provider;

type WriteRequest = {
  functionName: string;
  args: Array<string | bigint>;
  value: bigint;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function App({ config }: { config: PublicConfig }) {
  const [agentId, setAgentId] = useState(DEFAULT_AGENT_ID);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [writeClient, setWriteClient] = useState<
    ReturnType<typeof createAgentAccessClients>["writeClient"]
  >(null);
  const [walletProvider, setWalletProvider] =
    useState<BrowserProvider | null>(null);
  const [snapshot, setSnapshot] = useState<CanonicalSnapshot | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [fields, setFields] = useState<ActionFields>(DEFAULT_FIELDS);
  const [selectedAction, setSelectedAction] = useState<ContractAction | null>(null);
  const [txState, dispatchTx] = useReducer(txReducer, initialTxState);
  const lastAttempt = useRef<{
    action: ContractAction;
    fields: ActionFields;
  } | null>(null);

  const { readClient } = useMemo(
    () => createAgentAccessClients({ config }),
    [config]
  );

  const refresh = async (
    requestedAgentId = agentId,
    requestedCaseId = fields.caseId
  ) => {
    if (!requestedAgentId.trim()) return null;
    setLoading(true);
    setReadError(null);
    try {
      const next = await readCanonicalSnapshot({
        client: readClient,
        contractAddress: config.contractAddress,
        agentId: requestedAgentId.trim(),
        caseId: requestedCaseId.trim() || undefined,
        account: account ?? undefined
      });
      setSnapshot(next);
      if (next.credit !== "0") {
        setFields((current) => ({ ...current, withdrawAmount: next.credit }));
      }
      return next;
    } catch (error) {
      setSnapshot(null);
      setReadError(errorMessage(error));
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh(DEFAULT_AGENT_ID, DEFAULT_CASE_ID);
  }, [readClient]);

  const actions = availableActions(snapshot, account ?? undefined);
  useEffect(() => {
    if (!selectedAction || !actions.includes(selectedAction)) {
      setSelectedAction(actions[0] ?? null);
    }
  }, [actions.join("|"), selectedAction]);

  const connectWallet = async () => {
    setConnecting(true);
    setReadError(null);
    try {
      const connection = await connectStudionetWallet({
        injectedProvider: window.ethereum
      });
      const provider = connection.provider as BrowserProvider;
      const clients = createAgentAccessClients({
        config,
        account: connection.account,
        provider
      });
      if (!clients.writeClient) throw new Error("Wallet client is unavailable.");
      setAccount(connection.account);
      setWalletProvider(provider);
      setWriteClient(clients.writeClient);
      setFields((current) => ({
        ...current,
        userAddress: current.userAddress || connection.account
      }));
      await refresh(agentId, fields.caseId);
    } catch (error) {
      setReadError(errorMessage(error));
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    const provider = walletProvider;
    if (!provider?.on) return;
    const accountChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      const next = accounts?.[0] as `0x${string}` | undefined;
      setAccount(next ?? null);
      if (next) {
        setWriteClient(
          createAgentAccessClients({
            config,
            account: next,
            provider
          }).writeClient
        );
      } else {
        setWriteClient(null);
      }
      void refresh(agentId, fields.caseId);
    };
    const chainChanged = () => void refresh(agentId, fields.caseId);
    provider.on("accountsChanged", accountChanged);
    provider.on("chainChanged", chainChanged);
    return () => {
      provider.removeListener?.("accountsChanged", accountChanged);
      provider.removeListener?.("chainChanged", chainChanged);
    };
  }, [agentId, config, fields.caseId, walletProvider]);

  const requestFor = (
    action: ContractAction,
    values: ActionFields
  ): WriteRequest => {
    const caseId = values.caseId.trim() || snapshot?.case?.case_id || "";
    switch (action) {
      case "create_agent":
        return {
          functionName: action,
          args: [
            agentId.trim(),
            values.userAddress.trim(),
            values.userAgent.trim(),
            values.origin.trim(),
            values.policyUrl.trim(),
            values.allowedPurpose.trim(),
            BigInt(values.penaltyAmount),
            BigInt(values.minimumChallengeBond)
          ],
          value: BigInt(values.operatorBond)
        };
      case "accept_agent":
      case "propose_close":
      case "accept_close":
        return { functionName: action, args: [agentId.trim()], value: 0n };
      case "open_access_case":
        return {
          functionName: action,
          args: [
            caseId,
            agentId.trim(),
            values.targetUrl.trim(),
            values.receiptUrl.trim()
          ],
          value: BigInt(values.challengeBond)
        };
      case "adjudicate_case":
      case "retry_case":
      case "propose_case_cancel":
      case "accept_case_cancel":
        return { functionName: action, args: [caseId], value: 0n };
      case "withdraw_credit":
        return {
          functionName: action,
          args: [BigInt(values.withdrawAmount || snapshot?.credit || "0")],
          value: 0n
        };
    }
  };

  const executeAction = async (
    action: ContractAction,
    values: ActionFields
  ) => {
    if (!writeClient) {
      dispatchTx({ type: "failed", error: "Connect a Studionet wallet first." });
      return;
    }
    lastAttempt.current = { action, fields: values };
    try {
      const request = requestFor(action, values);
      await executeAndRefresh({
        submit: () =>
          submitWriteAndFinalize({
            writeClient,
            readClient,
            address: config.contractAddress,
            ...request,
            onStatus: (status, hash) => {
              if (status === "submitted") {
                dispatchTx({ type: "submitted", operation: action, hash });
              } else {
                dispatchTx({ type: status });
              }
            }
          }),
        refresh: () => refresh(agentId, values.caseId)
      });
    } catch (error) {
      dispatchTx({ type: "failed", error: errorMessage(error) });
    }
  };

  return (
    <div className="app-shell">
      <WalletBar
        account={account}
        contractAddress={config.contractAddress}
        explorerUrl={config.explorerUrl}
        connecting={connecting}
        onConnect={() => void connectWallet()}
      />
      <AgentWorkspace
        agentId={agentId}
        onAgentIdChange={setAgentId}
        onRefresh={() => void refresh()}
        snapshot={snapshot}
        loading={loading}
        readError={readError}
        actions={actions}
        selectedAction={selectedAction}
        onActionChange={setSelectedAction}
        fields={fields}
        onFieldChange={(name, value) =>
          setFields((current) => ({ ...current, [name]: value }))
        }
        onSubmit={() => {
          if (selectedAction) void executeAction(selectedAction, { ...fields });
        }}
        busy={
          txState.status === "submitted" || txState.status === "accepted"
        }
      />
      <TransactionActivity
        state={txState}
        explorerUrl={config.explorerUrl}
        onRetry={
          lastAttempt.current
            ? () => {
                const attempt = lastAttempt.current;
                if (attempt) void executeAction(attempt.action, attempt.fields);
              }
            : undefined
        }
      />
    </div>
  );
}
