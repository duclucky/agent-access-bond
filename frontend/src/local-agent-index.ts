const STORAGE_KEY = "agent-access-bond.recent-agent-ids.v1";
const MAX_AGENT_IDS = 25;

type AgentIndex = {
  global: string[];
  byWallet: Record<string, string[]>;
};

const EMPTY_INDEX: AgentIndex = {
  global: [],
  byWallet: {}
};

function normalizeWallet(walletAddress?: string) {
  return walletAddress?.trim().toLowerCase() || "";
}

function normalizeAgentId(agentId: string) {
  return agentId.trim();
}

function uniqueHead(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeAgentId(value);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= MAX_AGENT_IDS) break;
  }
  return result;
}

function readIndex(): AgentIndex {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_INDEX;
    const parsed = JSON.parse(raw) as Partial<AgentIndex>;
    return {
      global: Array.isArray(parsed.global) ? uniqueHead(parsed.global) : [],
      byWallet:
        parsed.byWallet && typeof parsed.byWallet === "object"
          ? Object.fromEntries(
              Object.entries(parsed.byWallet).map(([wallet, ids]) => [
                normalizeWallet(wallet),
                Array.isArray(ids) ? uniqueHead(ids) : []
              ])
            )
          : {}
    };
  } catch {
    return EMPTY_INDEX;
  }
}

function writeIndex(index: AgentIndex) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
  } catch {
    // Browsers can block storage. The app still works through direct inspection.
  }
}

export function rememberAgentId(agentId: string, walletAddress?: string) {
  const normalizedAgentId = normalizeAgentId(agentId);
  if (!normalizedAgentId) return;
  const wallet = normalizeWallet(walletAddress);
  const current = readIndex();
  const next: AgentIndex = {
    global: uniqueHead([normalizedAgentId, ...current.global]),
    byWallet: { ...current.byWallet }
  };
  if (wallet) {
    next.byWallet[wallet] = uniqueHead([
      normalizedAgentId,
      ...(current.byWallet[wallet] || [])
    ]);
  }
  writeIndex(next);
}

export function readRememberedAgentIds(walletAddress?: string) {
  const wallet = normalizeWallet(walletAddress);
  const current = readIndex();
  return uniqueHead([
    ...(wallet ? current.byWallet[wallet] || [] : []),
    ...current.global
  ]);
}

export const agentIndexStorageKey = STORAGE_KEY;
