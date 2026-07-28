import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

import {
  OPERATOR_KEY_VARIABLES,
  USER_KEY_VARIABLES,
  deploymentEnvPaths,
  loadPrivateKey
} from "./deployment-env.mjs";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEPLOYMENT_PATH = path.join(
  ROOT_DIR,
  "docs",
  "evidence",
  "studionet",
  "deployment.json"
);
const EVIDENCE_PATH = path.join(
  ROOT_DIR,
  "docs",
  "evidence",
  "studionet",
  "secondary-wallet-smoke.json"
);
const RPC_URL = studionet.rpcUrls.default.http[0];
const AGENT_ID = "agent-secondary-wallet-smoke-20260728-01";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const POLICY_URL =
  "https://raw.githubusercontent.com/duclucky/agent-access-bond/main/docs/evidence/public-fixtures/agent-policy.txt";
const TERMINAL_FAILURES = new Set([
  "UNDETERMINED",
  "CANCELED",
  "LEADER_TIMEOUT",
  "VALIDATORS_TIMEOUT"
]);

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeEvidence(evidence) {
  writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
}

function jsonSafe(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, jsonSafe(item)])
    );
  }
  return value;
}

function executionName(receipt) {
  const normalized =
    receipt?.txExecutionResultName ??
    receipt?.tx_execution_result_name ??
    receipt?.executionResultName;
  if (normalized) return normalized;
  const raw = receipt?.consensus_data?.leader_receipt;
  const leader = Array.isArray(raw) ? raw[0] : raw;
  return leader?.execution_result === "SUCCESS"
    ? "FINISHED_WITH_RETURN"
    : "FINISHED_WITH_ERROR";
}

async function waitForFinality(client, hash, retries = 240) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const status = await client.request({
      method: "gen_getTransactionStatus",
      params: [hash]
    });
    if (status === "FINALIZED") return status;
    if (TERMINAL_FAILURES.has(status)) {
      throw new Error(`Transaction reached terminal status ${status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error("Transaction did not finalize before timeout");
}

async function writeFinalized({
  client,
  address,
  functionName,
  args,
  value = 0n,
  record,
  persist
}) {
  let transactionHash = record?.transactionHash;
  if (!transactionHash) {
    transactionHash = await client.writeContract({
      address,
      functionName,
      args,
      value
    });
    record = {
      transactionHash,
      status: "SUBMITTED",
      submittedAt: new Date().toISOString()
    };
    persist(record);
    console.log(`SUBMITTED ${functionName} ${transactionHash}`);
  }
  const receipt = await client.waitForTransactionReceipt({
    hash: transactionHash,
    status: "ACCEPTED",
    interval: 5000,
    retries: 120,
    fullTransaction: true
  });
  const status = await waitForFinality(client, transactionHash);
  const execution = executionName(receipt);
  if (execution !== "FINISHED_WITH_RETURN") {
    throw new Error(`${functionName} failed with ${execution}`);
  }
  return {
    transactionHash,
    status,
    execution,
    finalizedAt: new Date().toISOString()
  };
}

async function readView(client, address, functionName, args = []) {
  return jsonSafe(
    await client.readContract({
      address,
      functionName,
      args,
      jsonSafeReturn: true
    })
  );
}

const deployment = readJson(DEPLOYMENT_PATH);
const address = deployment.primary?.contractAddress;
if (!/^0x[0-9a-fA-F]{40}$/.test(address ?? "")) {
  throw new Error("Active Studionet contract address is missing");
}

const envPaths = deploymentEnvPaths(ROOT_DIR);
const operatorAccount = createAccount(
  loadPrivateKey(OPERATOR_KEY_VARIABLES, envPaths)
);
const secondaryAccount = createAccount(
  loadPrivateKey(USER_KEY_VARIABLES, envPaths)
);
if (
  operatorAccount.address.toLowerCase() === secondaryAccount.address.toLowerCase()
) {
  throw new Error("Operator and secondary wallets must differ");
}

const operatorClient = createClient({
  chain: studionet,
  endpoint: RPC_URL,
  account: operatorAccount
});
const secondaryClient = createClient({
  chain: studionet,
  endpoint: RPC_URL,
  account: secondaryAccount
});

const chainHex = await operatorClient.request({
  method: "eth_chainId",
  params: []
});
if (Number(BigInt(chainHex)) !== studionet.id) {
  throw new Error("Connected network is not Studionet");
}

let evidence = existsSync(EVIDENCE_PATH)
  ? readJson(EVIDENCE_PATH)
  : {
      network: "studionet",
      chainId: studionet.id,
      contractAddress: address,
      agentId: AGENT_ID,
      wallets: {
        operatorAddress: operatorAccount.address,
        secondaryAddress: secondaryAccount.address
      },
      transactions: {},
      status: "RUNNING",
      startedAt: new Date().toISOString()
    };

if (
  evidence.contractAddress.toLowerCase() !== address.toLowerCase() ||
  evidence.wallets.operatorAddress.toLowerCase() !==
    operatorAccount.address.toLowerCase() ||
  evidence.wallets.secondaryAddress.toLowerCase() !==
    secondaryAccount.address.toLowerCase()
) {
  throw new Error("Smoke evidence does not match active contract or wallets");
}

if (!evidence.baseline) {
  evidence.baseline = {
    accounting: await readView(
      operatorClient,
      address,
      "get_accounting"
    ),
    operatorCreditWei: await readView(operatorClient, address, "get_credit", [
      operatorAccount.address
    ])
  };
  writeEvidence(evidence);
}

const persistTransaction = (name) => (record) => {
  evidence.transactions[name] = record;
  writeEvidence(evidence);
};

let agent;
try {
  agent = await readView(operatorClient, address, "get_agent", [AGENT_ID]);
} catch {
  agent = null;
}

if (!agent) {
  evidence.transactions.createAgent = await writeFinalized({
    client: operatorClient,
    address,
    functionName: "create_agent",
    args: [
      AGENT_ID,
      secondaryAccount.address,
      "AgentAccessSmoke/1.0",
      "https://raw.githubusercontent.com",
      POLICY_URL,
      "secondary wallet lifecycle smoke",
      1n,
      1n
    ],
    value: 1n,
    record: evidence.transactions.createAgent,
    persist: persistTransaction("createAgent")
  });
  writeEvidence(evidence);
  agent = await readView(operatorClient, address, "get_agent", [AGENT_ID]);
}

if (!agent.accepted) {
  evidence.transactions.acceptAgent = await writeFinalized({
    client: secondaryClient,
    address,
    functionName: "accept_agent",
    args: [AGENT_ID],
    record: evidence.transactions.acceptAgent,
    persist: persistTransaction("acceptAgent")
  });
  writeEvidence(evidence);
  agent = await readView(operatorClient, address, "get_agent", [AGENT_ID]);
}

if (
  agent.status !== "CLOSED" &&
  String(agent.close_proposed_by).toLowerCase() === ZERO_ADDRESS
) {
  evidence.transactions.proposeClose = await writeFinalized({
    client: secondaryClient,
    address,
    functionName: "propose_close",
    args: [AGENT_ID],
    record: evidence.transactions.proposeClose,
    persist: persistTransaction("proposeClose")
  });
  writeEvidence(evidence);
  agent = await readView(operatorClient, address, "get_agent", [AGENT_ID]);
}

if (agent.status !== "CLOSED") {
  evidence.transactions.acceptClose = await writeFinalized({
    client: operatorClient,
    address,
    functionName: "accept_close",
    args: [AGENT_ID],
    record: evidence.transactions.acceptClose,
    persist: persistTransaction("acceptClose")
  });
  writeEvidence(evidence);
}

const baselineCredit = BigInt(evidence.baseline.operatorCreditWei);
const currentCredit = BigInt(
  await readView(operatorClient, address, "get_credit", [
    operatorAccount.address
  ])
);
const smokeCredit = currentCredit - baselineCredit;
if (smokeCredit > 0n) {
  evidence.transactions.withdrawCredit = await writeFinalized({
    client: operatorClient,
    address,
    functionName: "withdraw_credit",
    args: [smokeCredit],
    record: evidence.transactions.withdrawCredit,
    persist: persistTransaction("withdrawCredit")
  });
  writeEvidence(evidence);
}

evidence.finalState = {
  agent: await readView(operatorClient, address, "get_agent", [AGENT_ID]),
  operatorCreditWei: await readView(operatorClient, address, "get_credit", [
    operatorAccount.address
  ]),
  secondaryCreditWei: await readView(
    operatorClient,
    address,
    "get_credit",
    [secondaryAccount.address]
  ),
  accounting: await readView(operatorClient, address, "get_accounting")
};

if (
  evidence.finalState.agent.status !== "CLOSED" ||
  evidence.finalState.operatorCreditWei !== evidence.baseline.operatorCreditWei ||
  JSON.stringify(evidence.finalState.accounting) !==
    JSON.stringify(evidence.baseline.accounting)
) {
  throw new Error("Secondary-wallet smoke did not restore accounting baseline");
}

evidence.status = "VERIFIED";
evidence.completedAt = new Date().toISOString();
writeEvidence(evidence);
console.log("VERIFIED secondary-wallet Studionet lifecycle");
