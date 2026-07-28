import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

import type { PublicConfig } from "./config";
import type {
  AccountingRecord,
  AgentRecord,
  CanonicalSnapshot,
  CaseRecord,
  VerdictRecord
} from "./types";

type Client = ReturnType<typeof createClient>;
type ClientConfig = NonNullable<Parameters<typeof createClient>[0]>;
export type WalletProvider = NonNullable<ClientConfig["provider"]>;
export type WriteProgress = "submitted" | "accepted" | "finalized";

const TERMINAL_FAILURES = new Set([
  "UNDETERMINED",
  "CANCELED",
  "LEADER_TIMEOUT",
  "VALIDATORS_TIMEOUT"
]);

export function createAgentAccessClients({
  config,
  account,
  provider
}: {
  config: PublicConfig;
  account?: `0x${string}`;
  provider?: WalletProvider;
}) {
  const readClient = createClient({
    chain: studionet,
    endpoint: studionet.rpcUrls.default.http[0]
  });
  const writeClient =
    account && provider
      ? createClient({
          chain: studionet,
          endpoint: studionet.rpcUrls.default.http[0],
          account,
          provider
        })
      : null;

  return { readClient, writeClient, contractAddress: config.contractAddress };
}

async function readJson<T>(
  client: Client,
  address: `0x${string}`,
  functionName: string,
  args: Array<string> = []
): Promise<T> {
  return (await client.readContract({
    address,
    functionName,
    args,
    jsonSafeReturn: true
  })) as T;
}

export async function readCanonicalSnapshot({
  client,
  contractAddress,
  agentId,
  caseId,
  account
}: {
  client: Client;
  contractAddress: `0x${string}`;
  agentId: string;
  caseId?: string;
  account?: `0x${string}`;
}): Promise<CanonicalSnapshot> {
  const agent = await readJson<AgentRecord>(
    client,
    contractAddress,
    "get_agent",
    [agentId]
  );
  let caseRecord: CaseRecord | null = null;
  let verdict: VerdictRecord | null = null;

  const canonicalCaseId = caseId || agent.active_case_id;
  if (canonicalCaseId) {
    caseRecord = await readJson<CaseRecord>(
      client,
      contractAddress,
      "get_case",
      [canonicalCaseId]
    );
  }
  if (caseRecord?.verdict_id) {
    verdict = await readJson<VerdictRecord>(
      client,
      contractAddress,
      "get_verdict",
      [caseRecord.verdict_id]
    );
  }

  const [accounting, canExecute, credit] = await Promise.all([
    readJson<AccountingRecord>(client, contractAddress, "get_accounting"),
    readJson<boolean>(client, contractAddress, "can_execute", [agentId]),
    account
      ? readJson<string | number>(
          client,
          contractAddress,
          "get_credit",
          [account]
        )
      : Promise.resolve("0")
  ]);

  return {
    agent,
    case: caseRecord,
    verdict,
    credit: String(credit),
    accounting,
    canExecute,
    readAt: new Date().toISOString()
  };
}

function wait(milliseconds: number) {
  if (milliseconds === 0) return Promise.resolve();
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function submitWriteAndFinalize({
  writeClient,
  readClient,
  address,
  functionName,
  args,
  value,
  onStatus,
  pollIntervalMs = 5_000,
  maxPolls = 240
}: {
  writeClient: Client;
  readClient: Client;
  address: `0x${string}`;
  functionName: string;
  args: Array<string | bigint>;
  value: bigint;
  onStatus: (status: WriteProgress, hash: string) => void;
  pollIntervalMs?: number;
  maxPolls?: number;
}) {
  const hash = String(
    await writeClient.writeContract({
      address,
      functionName,
      args,
      value
    })
  );
  onStatus("submitted", hash);

  let accepted = false;

  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    try {
      const status = String(
        await readClient.request({
          method: "gen_getTransactionStatus",
          params: [hash]
        } as never)
      ).toUpperCase();
      if ((status === "ACCEPTED" || status === "FINALIZED") && !accepted) {
        accepted = true;
        onStatus("accepted", hash);
      }
      if (status === "FINALIZED") {
        onStatus("finalized", hash);
        return hash;
      }
      if (TERMINAL_FAILURES.has(status)) {
        throw new Error(`Transaction reached ${status}`);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Transaction reached ")
      ) {
        throw error;
      }
      // Studionet can briefly return "not found" while indexing a wallet hash.
    }
    await wait(pollIntervalMs);
  }

  throw new Error("Transaction did not finalize before timeout");
}
