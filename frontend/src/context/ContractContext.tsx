import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode
} from "react";

import {
  createAgentAccessClients,
  readCanonicalSnapshot,
  submitWriteAndFinalize,
  type WalletProvider
} from "../contract";
import type { PublicConfig } from "../config";
import { WalletDialog } from "../components/WalletDialog";
import { formatGenValue, parseGen } from "../presentation";
import { initialTxState, txReducer, type TxState } from "../tx-state";
import {
  connectStudionetWallet,
  requestInjectedWallets,
  subscribeToInjectedWallets,
  type Eip1193Provider,
  type InjectedWallet
} from "../wallet";
import type {
  AccessCase,
  AccountingSummary,
  AgentBond,
  AgentStatus,
  ApplicabilityClass,
  CanonicalSnapshot,
  CaseStatus,
  Verdict,
  ViolationType,
  WalletState
} from "../types";

type BrowserProvider = WalletProvider & Eip1193Provider;

type RegisterAgentInput = {
  origin: string;
  user_agent: string;
  user: string;
  policy_url: string;
  allowed_purpose: string;
  operator_bond: number;
  minimum_challenge_bond: number;
  penalty_amount: number;
};

type ChallengeInput = {
  agent_id: string;
  target_url: string;
  receipt_url: string;
  challenge_bond: number;
  description?: string;
};

interface ContractContextType {
  agents: AgentBond[];
  accounting: AccountingSummary;
  wallet: WalletState;
  contractAddress: string;
  networkName: string;
  loading: boolean;
  lastError: string | null;
  lastTransactionHash: string | null;
  transactionState: TxState;
  refreshAgent: (agentId: string, caseId?: string) => Promise<AgentBond | undefined>;
  get_agent: (agentId: string) => AgentBond | undefined;
  get_agent_status: (agentId: string) => AgentStatus | undefined;
  can_execute: (agentId: string) => boolean;
  get_case: (caseId: string) => AccessCase | undefined;
  get_verdict: (verdictId: string) => Verdict | undefined;
  get_credit: (address: string) => number;
  get_accounting: () => AccountingSummary;
  registerAgent: (data: RegisterAgentInput) => Promise<string>;
  approveAgent: (agentId: string) => Promise<void>;
  togglePauseAgent: (agentId: string) => Promise<void>;
  openChallenge: (data: ChallengeInput) => Promise<string>;
  adjudicateCase: (
    caseId: string,
    forcedApplicability?: ApplicabilityClass,
    forcedViolationType?: ViolationType,
    customRationale?: string
  ) => Promise<void>;
  claimCredit: () => Promise<number>;
  proposeClosure: (agentId: string) => Promise<void>;
  connectWallet: () => void;
  userCredits: number;
}

const NETWORK_NAME = "GenLayer Studionet";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const EMPTY_ACCOUNTING: AccountingSummary = {
  total_locked_operator_bonds: 0,
  total_active_challenge_bonds: 0,
  total_slashed_penalties: 0,
  total_claimed_user_credits: 0,
  contract_balance: 0
};

const EMPTY_WALLET: WalletState = {
  isConnected: false,
  address: "",
  balanceGEN: 0,
  network: NETWORK_NAME,
  role: "user"
};

const ContractContext = createContext<ContractContextType | undefined>(undefined);

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return String(error);
}

function toNumberFromWei(value: string | number | bigint | undefined) {
  if (value === undefined || value === "") return 0;
  return Number(formatGenValue(value));
}

function optionalText(value: string | undefined) {
  return value && value !== ZERO_ADDRESS ? value : undefined;
}

function normalizeStatus(value: string | undefined): AgentStatus {
  const status = value || "DRAFT";
  if (
    status === "ACTIVE" ||
    status === "PENDING_REVIEW" ||
    status === "QUARANTINED" ||
    status === "CLOSED" ||
    status === "DRAFT"
  ) {
    return status;
  }
  return "DRAFT";
}

function normalizeCaseStatus(value: string | undefined): CaseStatus {
  const status = value || "OPEN";
  if (
    status === "OPEN" ||
    status === "RETRYABLE" ||
    status === "RESOLVED" ||
    status === "CANCELLED"
  ) {
    return status;
  }
  return "OPEN";
}

function normalizeApplicability(value: string | undefined): ApplicabilityClass {
  if (
    value === "MATERIAL_VIOLATION" ||
    value === "COMPLIANT" ||
    value === "UNVERIFIABLE"
  ) {
    return value;
  }
  return "UNVERIFIABLE";
}

function normalizeViolation(value: string | undefined): ViolationType {
  if (
    value === "DISALLOWED_PATH" ||
    value === "RATE_LIMIT_EXCEEDED" ||
    value === "ROBOTS_TXT_BYPASS" ||
    value === "UNAUTHORIZED_DATA_SCRAPING" ||
    value === "FORM_SUBMISSION_VIOLATION" ||
    value === "NONE"
  ) {
    return value;
  }
  return "NONE";
}

function factIds(value: string | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Contract revisions may return a comma-separated fact list.
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function generatedAgentId(origin: string) {
  let host = "agent";
  try {
    host = new URL(origin.startsWith("http") ? origin : `https://${origin}`).hostname;
  } catch {
    host = origin || "agent";
  }
  const slug = host.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `agent-${slug || "bond"}-${Date.now().toString(36)}`;
}

function generatedCaseId(agentId: string) {
  return `case-${agentId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
}

function verdictFromSnapshot(snapshot: CanonicalSnapshot): Verdict | undefined {
  const verdict = snapshot.verdict;
  const agent = snapshot.agent;
  const caseRecord = snapshot.case;
  if (!verdict || !agent || !caseRecord) return undefined;
  return {
    verdict_id: verdict.verdict_id,
    case_id: verdict.case_id || caseRecord.case_id,
    agent_id: verdict.agent_id || agent.agent_id,
    target_url: verdict.target_url || caseRecord.target_url,
    applicability: normalizeApplicability(verdict.applicability),
    source_coverage: verdict.source_coverage || "canonical contract verdict",
    violation_type: normalizeViolation(verdict.violation_type),
    required_action: verdict.required_action || "NO_ACTION",
    matched_fact_ids: factIds(verdict.matched_fact_ids),
    rationale: verdict.rationale || "No rationale returned by this contract revision.",
    previous_agent_status: normalizeStatus(verdict.previous_agent_status),
    new_agent_status: normalizeStatus(verdict.new_agent_status),
    user_credit_amount: toNumberFromWei(verdict.user_credit_amount),
    operator_credit_amount: toNumberFromWei(verdict.operator_credit_amount),
    attempt: Number(verdict.attempt || 0),
    timestamp: snapshot.readAt,
    validator_signatures: 0,
    total_validators: 0
  };
}

function caseFromSnapshot(snapshot: CanonicalSnapshot): AccessCase | undefined {
  const caseRecord = snapshot.case;
  if (!caseRecord) return undefined;
  const verdict = verdictFromSnapshot(snapshot);
  return {
    case_id: caseRecord.case_id,
    agent_id: caseRecord.agent_id,
    opened_by: caseRecord.opened_by,
    target_url: caseRecord.target_url,
    receipt_url: caseRecord.receipt_url,
    challenge_bond: toNumberFromWei(caseRecord.challenge_bond),
    status: normalizeCaseStatus(caseRecord.status),
    attempt_count: Number(caseRecord.attempt_count || 0),
    verdict_id: optionalText(caseRecord.verdict_id),
    verdict,
    bond_settled: Boolean(caseRecord.bond_settled),
    cancel_proposed_by: optionalText(caseRecord.cancel_proposed_by),
    created_at: snapshot.readAt
  };
}

function agentFromSnapshot(snapshot: CanonicalSnapshot): AgentBond | undefined {
  const agent = snapshot.agent;
  if (!agent) return undefined;
  const accessCase = caseFromSnapshot(snapshot);
  return {
    agent_id: agent.agent_id,
    operator: agent.operator,
    user: agent.user,
    user_agent: agent.user_agent,
    origin: agent.origin,
    policy_url: agent.policy_url,
    allowed_purpose: agent.allowed_purpose,
    operator_bond: toNumberFromWei(agent.operator_bond),
    minimum_challenge_bond: toNumberFromWei(agent.minimum_challenge_bond),
    penalty_amount: toNumberFromWei(agent.penalty_amount),
    status: normalizeStatus(agent.status),
    accepted: Boolean(agent.accepted),
    active_case_id: optionalText(agent.active_case_id),
    case_count: Number(agent.case_count || 0),
    close_proposed_by: optionalText(agent.close_proposed_by),
    cases: accessCase ? [accessCase] : [],
    created_at: snapshot.readAt
  };
}

function accountingFromSnapshot(snapshot: CanonicalSnapshot): AccountingSummary {
  const lockedOperator = toNumberFromWei(snapshot.accounting.locked_operator_bonds);
  const lockedChallenge = toNumberFromWei(snapshot.accounting.locked_challenge_bonds);
  const withdrawable = toNumberFromWei(snapshot.accounting.withdrawable_credits);
  return {
    total_locked_operator_bonds: lockedOperator,
    total_active_challenge_bonds: lockedChallenge,
    total_slashed_penalties: withdrawable,
    total_claimed_user_credits: 0,
    contract_balance: lockedOperator + lockedChallenge
  };
}

export function ContractProvider({
  children,
  config
}: {
  children: ReactNode;
  config: PublicConfig;
}) {
  const [agents, setAgents] = useState<AgentBond[]>([]);
  const [accounting, setAccounting] = useState<AccountingSummary>(EMPTY_ACCOUNTING);
  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);
  const [userCredits, setUserCredits] = useState(0);
  const [creditWei, setCreditWei] = useState("0");
  const [writeClient, setWriteClient] = useState<
    ReturnType<typeof createAgentAccessClients>["writeClient"]
  >(null);
  const [walletProvider, setWalletProvider] = useState<BrowserProvider | null>(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [injectedWallets, setInjectedWallets] = useState<InjectedWallet[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [transactionState, dispatchTransaction] = useReducer(
    txReducer,
    initialTxState
  );

  const { readClient } = useMemo(
    () => createAgentAccessClients({ config }),
    [config]
  );

  useEffect(
    () =>
      subscribeToInjectedWallets((nextWallet) => {
        setInjectedWallets((current) =>
          current.some(
            (item) =>
              item.info.uuid === nextWallet.info.uuid ||
              item.provider === nextWallet.provider
          )
            ? current
            : [...current, nextWallet]
        );
      }),
    []
  );

  const upsertSnapshot = useCallback((snapshot: CanonicalSnapshot) => {
    const nextAgent = agentFromSnapshot(snapshot);
    setAccounting(accountingFromSnapshot(snapshot));
    setCreditWei(snapshot.credit);
    setUserCredits(toNumberFromWei(snapshot.credit));
    if (!nextAgent) return undefined;
    setAgents((current) => {
      const existing = current.find((agent) => agent.agent_id === nextAgent.agent_id);
      if (!existing) return [nextAgent, ...current];
      const casesById = new Map<string, AccessCase>();
      [...nextAgent.cases, ...existing.cases].forEach((accessCase) => {
        casesById.set(accessCase.case_id, accessCase);
      });
      return current.map((agent) =>
        agent.agent_id === nextAgent.agent_id
          ? { ...nextAgent, cases: Array.from(casesById.values()) }
          : agent
      );
    });
    return nextAgent;
  }, []);

  const refreshAgent = useCallback(
    async (agentId: string, caseId?: string) => {
      const cleanAgentId = agentId.trim();
      if (!cleanAgentId) return undefined;
      setLoading(true);
      setLastError(null);
      try {
        const snapshot = await readCanonicalSnapshot({
          client: readClient,
          contractAddress: config.contractAddress,
          agentId: cleanAgentId,
          caseId,
          account: wallet.address
            ? (wallet.address as `0x${string}`)
            : undefined
        });
        return upsertSnapshot(snapshot);
      } catch (error) {
        setLastError(errorMessage(error));
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [config.contractAddress, readClient, upsertSnapshot, wallet.address]
  );

  const sendWrite = useCallback(
    async ({
      functionName,
      args,
      value,
      refreshAgentId,
      refreshCaseId
    }: {
      functionName: string;
      args: Array<string | bigint>;
      value: bigint;
      refreshAgentId?: string;
      refreshCaseId?: string;
    }) => {
      if (!writeClient) {
        throw new Error("Connect a Studionet wallet before sending a transaction.");
      }
      setLastError(null);
      try {
        await submitWriteAndFinalize({
          writeClient,
          readClient,
          address: config.contractAddress,
          functionName,
          args,
          value,
          onStatus: (status, hash) => {
            if (status === "submitted") {
              dispatchTransaction({
                type: "submitted",
                operation: functionName,
                hash
              });
            } else {
              dispatchTransaction({ type: status });
            }
          }
        });
      } catch (error) {
        dispatchTransaction({ type: "failed", error: errorMessage(error) });
        throw error;
      }
      if (refreshAgentId) await refreshAgent(refreshAgentId, refreshCaseId);
    },
    [config.contractAddress, readClient, refreshAgent, writeClient]
  );

  const get_agent = useCallback(
    (agentId: string) =>
      agents.find((agent) => agent.agent_id.toLowerCase() === agentId.toLowerCase()),
    [agents]
  );

  const get_case = useCallback(
    (caseId: string) =>
      agents
        .flatMap((agent) => agent.cases)
        .find((accessCase) => accessCase.case_id.toLowerCase() === caseId.toLowerCase()),
    [agents]
  );

  const connectSelectedWallet = useCallback(
    async (selectedWallet?: InjectedWallet) => {
      setConnectingId(selectedWallet?.info.uuid ?? "metamask-connect");
      setLastError(null);
      try {
        const connection = await connectStudionetWallet({
          injectedProvider: selectedWallet?.provider
        });
        const provider = connection.provider as BrowserProvider;
        const clients = createAgentAccessClients({
          config,
          account: connection.account,
          provider
        });
        if (!clients.writeClient) throw new Error("Wallet client is unavailable.");
        setWalletProvider(provider);
        setWriteClient(clients.writeClient);
        setWallet({
          isConnected: true,
          address: connection.account,
          balanceGEN: 0,
          network: NETWORK_NAME,
          role: "user"
        });
        setWalletDialogOpen(false);
      } catch (error) {
        setLastError(errorMessage(error));
      } finally {
        setConnectingId(null);
      }
    },
    [config]
  );

  useEffect(() => {
    const provider = walletProvider;
    if (!provider?.on) return;
    const accountChanged = (...args: unknown[]) => {
      const accounts = args[0] as Array<`0x${string}`> | undefined;
      const next = accounts?.[0] ?? "";
      setWallet((current) => ({ ...current, isConnected: Boolean(next), address: next }));
      setWriteClient(
        next
          ? createAgentAccessClients({ config, account: next, provider }).writeClient
          : null
      );
    };
    provider.on("accountsChanged", accountChanged);
    return () => provider.removeListener?.("accountsChanged", accountChanged);
  }, [config, walletProvider]);

  const value = useMemo<ContractContextType>(
    () => ({
      agents,
      accounting,
      wallet,
      contractAddress: config.contractAddress,
      networkName: NETWORK_NAME,
      loading,
      lastError,
      lastTransactionHash: transactionState.hash,
      transactionState,
      refreshAgent,
      get_agent,
      get_agent_status: (agentId) => get_agent(agentId)?.status,
      can_execute: (agentId) => {
        const agent = get_agent(agentId);
        return Boolean(agent?.accepted && agent.status === "ACTIVE" && !agent.active_case_id);
      },
      get_case,
      get_verdict: (verdictId) =>
        agents
          .flatMap((agent) => agent.cases)
          .map((accessCase) => accessCase.verdict)
          .find(
            (verdict): verdict is Verdict =>
              Boolean(verdict && verdict.verdict_id.toLowerCase() === verdictId.toLowerCase())
          ),
      get_credit: () => userCredits,
      get_accounting: () => accounting,
      registerAgent: async (data) => {
        const origin = data.origin.startsWith("http") ? data.origin : `https://${data.origin}`;
        const agentId = generatedAgentId(origin);
        await sendWrite({
          functionName: "create_agent",
          args: [
            agentId,
            data.user || wallet.address,
            data.user_agent,
            origin,
            data.policy_url,
            data.allowed_purpose,
            parseGen(String(data.penalty_amount)),
            parseGen(String(data.minimum_challenge_bond))
          ],
          value: parseGen(String(data.operator_bond)),
          refreshAgentId: agentId
        });
        return agentId;
      },
      approveAgent: async (agentId) => {
        await sendWrite({
          functionName: "accept_agent",
          args: [agentId],
          value: 0n,
          refreshAgentId: agentId
        });
      },
      togglePauseAgent: async (agentId) => {
        await sendWrite({
          functionName: "propose_close",
          args: [agentId],
          value: 0n,
          refreshAgentId: agentId
        });
      },
      openChallenge: async (data) => {
        const caseId = generatedCaseId(data.agent_id);
        await sendWrite({
          functionName: "open_access_case",
          args: [caseId, data.agent_id, data.target_url, data.receipt_url],
          value: parseGen(String(data.challenge_bond)),
          refreshAgentId: data.agent_id,
          refreshCaseId: caseId
        });
        return caseId;
      },
      adjudicateCase: async (caseId) => {
        const accessCase = get_case(caseId);
        await sendWrite({
          functionName: "adjudicate_case",
          args: [caseId],
          value: 0n,
          refreshAgentId: accessCase?.agent_id,
          refreshCaseId: caseId
        });
      },
      claimCredit: async () => {
        const amount = userCredits;
        await sendWrite({
          functionName: "withdraw_credit",
          args: [BigInt(creditWei || "0")],
          value: 0n
        });
        setUserCredits(0);
        setCreditWei("0");
        return amount;
      },
      proposeClosure: async (agentId) => {
        const agent = get_agent(agentId);
        const functionName =
          agent?.close_proposed_by &&
          agent.close_proposed_by.toLowerCase() !== wallet.address.toLowerCase()
            ? "accept_close"
            : "propose_close";
        await sendWrite({
          functionName,
          args: [agentId],
          value: 0n,
          refreshAgentId: agentId
        });
      },
      connectWallet: () => {
        setLastError(null);
        requestInjectedWallets();
        setWalletDialogOpen(true);
      },
      userCredits
    }),
    [
      accounting,
      agents,
      config.contractAddress,
      creditWei,
      get_agent,
      get_case,
      lastError,
      loading,
      refreshAgent,
      sendWrite,
      transactionState,
      userCredits,
      wallet
    ]
  );

  return (
    <ContractContext.Provider value={value}>
      {children}
      {walletDialogOpen && (
        <WalletDialog
          wallets={injectedWallets}
          connectingId={connectingId}
          error={lastError}
          onClose={() => setWalletDialogOpen(false)}
          onSelect={(selectedWallet) => void connectSelectedWallet(selectedWallet)}
          onMetaMaskConnect={() => void connectSelectedWallet()}
        />
      )}
    </ContractContext.Provider>
  );
}

export function useContract() {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error("useContract must be used within a ContractProvider");
  }
  return context;
}
