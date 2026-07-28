import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
import {
  buildDeploymentIdentity,
  identitiesMatch,
  prepareActiveEvidence
} from "./deployment/revision-evidence.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const ENV_PATHS = deploymentEnvPaths(ROOT_DIR);
const EVIDENCE_DIR = path.join(ROOT_DIR, "docs", "evidence", "studionet");
const EVIDENCE_PATH = path.join(EVIDENCE_DIR, "deployment.json");
const CONTRACT_PATH = path.join(ROOT_DIR, "contracts", "agent_access_bond.py");
const RPC_URL = studionet.rpcUrls.default.http[0];
const EXPLORER_URL = "https://explorer-studio.genlayer.com";
const REPO_RAW_BASE =
  "https://raw.githubusercontent.com/duclucky/agent-access-bond/main";
const AGENT_ID = "agent-fixture-policy-001";
const CASE_ID = "case-fixture-private-001";
const USER_AGENT = "AgentAccessBot/1.0";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ORIGIN = "https://raw.githubusercontent.com";
const POLICY_URL = `${REPO_RAW_BASE}/docs/evidence/public-fixtures/agent-policy.txt`;
const TARGET_URL = `${REPO_RAW_BASE}/docs/evidence/public-fixtures/challenge-target/report.json`;
const RECEIPT_URL = `${REPO_RAW_BASE}/docs/evidence/public-fixtures/case-1-receipt.json`;
const OPERATOR_BOND = 2_000_000_000_000_000_000n;
const PENALTY_AMOUNT = 1_000_000_000_000_000_000n;
const CHALLENGE_BOND = 100_000_000_000_000_000n;
const TERMINAL_FAILURES = new Set([
  "UNDETERMINED",
  "CANCELED",
  "LEADER_TIMEOUT",
  "VALIDATORS_TIMEOUT"
]);
const DEPLOYMENT_IDENTITY = buildDeploymentIdentity({
  rootDir: ROOT_DIR,
  contractPath: CONTRACT_PATH,
  network: "studionet"
});

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

function readEvidence() {
  if (!existsSync(EVIDENCE_PATH)) return null;
  const evidence = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8"));
  if (evidence.network !== "studionet" || evidence.chainId !== studionet.id) {
    throw new Error("Evidence network does not match Studionet");
  }
  return evidence;
}

function writeEvidence(patch) {
  const previous = readEvidence() ?? {};
  const evidence = {
    ...previous,
    network: "studionet",
    chainId: studionet.id,
    rpc: RPC_URL,
    explorer: EXPLORER_URL,
    publicReceiptUrl: RECEIPT_URL,
    deploymentIdentity: DEPLOYMENT_IDENTITY,
    ...patch
  };
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
}

function writeExistingEvidence(patch) {
  const previous = readEvidence() ?? {};
  const evidence = { ...previous, ...patch };
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
}

function requireCurrentEvidence() {
  const evidence = readEvidence();
  if (!identitiesMatch(evidence?.deploymentIdentity, DEPLOYMENT_IDENTITY)) {
    throw new Error("Active evidence does not match the current contract revision");
  }
  return evidence;
}

function signingClient(variableNames) {
  const account = createAccount(loadPrivateKey(variableNames, ENV_PATHS));
  return {
    account,
    client: createClient({ chain: studionet, endpoint: RPC_URL, account })
  };
}

function publicClient() {
  return createClient({ chain: studionet, endpoint: RPC_URL });
}

async function assertStudionet(client) {
  const chainHex = await client.request({ method: "eth_chainId", params: [] });
  const chainId = Number(BigInt(chainHex));
  if (chainId !== studionet.id) {
    throw new Error(`Connected chain ${chainId} is not Studionet ${studionet.id}`);
  }
  return chainId;
}

async function waitForFinality(client, hash, retries = 240) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const status = await client.request({
      method: "gen_getTransactionStatus",
      params: [hash]
    });
    if (status === "FINALIZED") return status;
    if (TERMINAL_FAILURES.has(status)) {
      throw new Error(`Transaction ${hash} reached ${status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Transaction ${hash} did not finalize before timeout`);
}

async function waitForReceipt(client, hash) {
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: "ACCEPTED",
    interval: 5000,
    retries: 120,
    fullTransaction: true
  });
  const networkStatus = await waitForFinality(client, hash);
  return { ...receipt, networkStatus };
}

function executionName(receipt) {
  const normalized =
    receipt?.txExecutionResultName ??
    receipt?.tx_execution_result_name ??
    receipt?.executionResultName;
  if (normalized) return normalized;
  const rawLeaderReceipt = receipt?.consensus_data?.leader_receipt;
  const leaderReceipt = Array.isArray(rawLeaderReceipt)
    ? rawLeaderReceipt[0]
    : rawLeaderReceipt;
  const rawExecution = leaderReceipt?.execution_result;
  if (rawExecution === "SUCCESS") return "FINISHED_WITH_RETURN";
  if (typeof rawExecution === "string" && rawExecution.length > 0) {
    return "FINISHED_WITH_ERROR";
  }
  return "UNKNOWN";
}

function deploymentAddress(receipt) {
  return (
    receipt?.txDataDecoded?.contractAddress ??
    receipt?.tx_data_decoded?.contract_address ??
    receipt?.data?.contract_address ??
    receipt?.data?.contractAddress ??
    null
  );
}

function assertExecution(receipt, operation) {
  if (receipt.networkStatus !== "FINALIZED") {
    throw new Error(`${operation} did not finalize`);
  }
  const execution = executionName(receipt);
  if (execution !== "FINISHED_WITH_RETURN") {
    throw new Error(`${operation} failed with ${execution}`);
  }
}

function transactionRecord(hash, receipt) {
  return {
    transactionHash: hash,
    status: receipt.networkStatus,
    execution: executionName(receipt),
    finalizedAt: new Date().toISOString()
  };
}

async function deployContract(client, existing = null, onSubmitted = () => {}) {
  const code = new Uint8Array(
    readFileSync(CONTRACT_PATH)
  );
  let hash = existing?.transactionHash;
  if (!hash) {
    hash = await client.deployContract({ code, args: [] });
    await onSubmitted({
      transactionHash: hash,
      status: "SUBMITTED",
      submittedAt: new Date().toISOString()
    });
    console.log(`SUBMITTED deploy ${hash}`);
  } else {
    console.log(`RESUME deploy ${hash}`);
  }
  const receipt = await waitForReceipt(client, hash);
  assertExecution(receipt, "deploy AgentAccessBond");
  const contractAddress = deploymentAddress(receipt);
  if (!/^0x[0-9a-fA-F]{40}$/.test(contractAddress ?? "")) {
    throw new Error("Deployed contract address missing from receipt");
  }
  return {
    contractAddress,
    transactionHash: hash,
    status: receipt.networkStatus,
    execution: executionName(receipt),
    finalizedAt: new Date().toISOString()
  };
}

async function writeFinalized(
  client,
  address,
  functionName,
  args,
  value = 0n,
  existing = null,
  onSubmitted = () => {}
) {
  let hash = existing?.transactionHash;
  if (!hash) {
    hash = await client.writeContract({ address, functionName, args, value });
    await onSubmitted({
      transactionHash: hash,
      status: "SUBMITTED",
      submittedAt: new Date().toISOString()
    });
    console.log(`SUBMITTED ${functionName} ${hash}`);
  } else {
    console.log(`RESUME ${functionName} ${hash}`);
  }
  const receipt = await waitForReceipt(client, hash);
  assertExecution(receipt, functionName);
  return transactionRecord(hash, receipt);
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

async function inspect() {
  const client = publicClient();
  const chainId = await assertStudionet(client);
  const evidence = readEvidence();
  const report = {
    network: "studionet",
    chainId,
    evidence: evidence
      ? identitiesMatch(evidence.deploymentIdentity, DEPLOYMENT_IDENTITY)
        ? "CURRENT"
        : "SUPERSEDED_SOURCE"
      : "PENDING_REAL_EVIDENCE",
    contractAddress: evidence?.primary?.contractAddress ?? null,
    publicReceiptUrl: RECEIPT_URL,
    reads: []
  };
  const address = evidence?.primary?.contractAddress;
  if (address) {
    for (const [label, functionName, args] of [
      ["agent", "get_agent", [AGENT_ID]],
      ["case", "get_case", [CASE_ID]],
      ["verdict", "get_verdict", [evidence?.demo?.verdictId]],
      ["status", "get_agent_status", [AGENT_ID]],
      ["canExecute", "can_execute", [AGENT_ID]],
      ["accounting", "get_accounting", []]
    ]) {
      if (args.some((value) => value == null)) continue;
      try {
        report.reads.push({
          label,
          status: "READ",
          value: await readView(client, address, functionName, args)
        });
      } catch (error) {
        report.reads.push({
          label,
          status: "PENDING",
          error: String(error?.message ?? error)
        });
      }
    }
  }
  console.log(JSON.stringify(report, null, 2));
}

async function recoverSupersededRevision() {
  const evidence = readEvidence();
  if (!evidence?.primary?.contractAddress) {
    throw new Error("Existing deployment evidence is missing");
  }
  if (identitiesMatch(evidence.deploymentIdentity, DEPLOYMENT_IDENTITY)) {
    throw new Error("Active evidence already matches the current revision");
  }

  const address = evidence.primary.contractAddress;
  const operator = signingClient(OPERATOR_KEY_VARIABLES);
  const user = signingClient(USER_KEY_VARIABLES);
  await assertStudionet(operator.client);
  await assertStudionet(user.client);
  if (
    evidence.wallets?.operatorAddress?.toLowerCase() !==
      operator.account.address.toLowerCase() ||
    evidence.wallets?.userAddress?.toLowerCase() !==
      user.account.address.toLowerCase()
  ) {
    throw new Error("Authorized wallets do not match existing evidence");
  }

  const recovery = {
    ...(evidence.recovery ?? {}),
    agentId: AGENT_ID,
    transactions: { ...(evidence.recovery?.transactions ?? {}) }
  };
  const persist = () => writeExistingEvidence({ recovery });
  let agent = await readView(operator.client, address, "get_agent", [AGENT_ID]);

  if (agent.status !== "CLOSED") {
    if (agent.active_case_id) {
      throw new Error("Superseded agent still has an active case");
    }
    if (
      String(agent.close_proposed_by).toLowerCase() === ZERO_ADDRESS &&
      recovery.transactions.proposeClose?.status !== "FINALIZED"
    ) {
      recovery.transactions.proposeClose = await writeFinalized(
        operator.client,
        address,
        "propose_close",
        [AGENT_ID],
        0n,
        recovery.transactions.proposeClose,
        (pending) => {
          recovery.transactions.proposeClose = pending;
          persist();
        }
      );
      persist();
    }

    agent = await readView(operator.client, address, "get_agent", [AGENT_ID]);
    const proposedBy = String(agent.close_proposed_by).toLowerCase();
    const acceptor =
      proposedBy === operator.account.address.toLowerCase() ? user : operator;
    if (recovery.transactions.acceptClose?.status !== "FINALIZED") {
      recovery.transactions.acceptClose = await writeFinalized(
        acceptor.client,
        address,
        "accept_close",
        [AGENT_ID],
        0n,
        recovery.transactions.acceptClose,
        (pending) => {
          recovery.transactions.acceptClose = pending;
          persist();
        }
      );
      persist();
    }
  }

  const operatorCredit = BigInt(
    await readView(operator.client, address, "get_credit", [
      operator.account.address
    ])
  );
  if (
    operatorCredit > 0n &&
    recovery.transactions.withdrawOperatorCredit?.status !== "FINALIZED"
  ) {
    recovery.transactions.withdrawOperatorCredit = await writeFinalized(
      operator.client,
      address,
      "withdraw_credit",
      [operatorCredit],
      0n,
      recovery.transactions.withdrawOperatorCredit,
      (pending) => {
        recovery.transactions.withdrawOperatorCredit = pending;
        persist();
      }
    );
    persist();
  }

  recovery.state = {
    agent: await readView(operator.client, address, "get_agent", [AGENT_ID]),
    operatorCreditWei: await readView(operator.client, address, "get_credit", [
      operator.account.address
    ]),
    userCreditWei: await readView(operator.client, address, "get_credit", [
      user.account.address
    ]),
    accounting: await readView(operator.client, address, "get_accounting")
  };
  const accounting = recovery.state.accounting;
  if (
    recovery.state.agent.status !== "CLOSED" ||
    BigInt(recovery.state.operatorCreditWei) !== 0n ||
    BigInt(recovery.state.userCreditWei) !== 0n ||
    BigInt(accounting.locked_operator_bonds) !== 0n ||
    BigInt(accounting.locked_challenge_bonds) !== 0n ||
    BigInt(accounting.withdrawable_credits) !== 0n
  ) {
    throw new Error("Superseded revision accounting is not fully recovered");
  }
  recovery.status = "RECOVERED_ZERO";
  recovery.completedAt = new Date().toISOString();
  persist();
  console.log("RECOVERED superseded AgentAccessBond revision");
}

async function deploy() {
  prepareActiveEvidence(EVIDENCE_PATH, DEPLOYMENT_IDENTITY);
  const evidence = requireCurrentEvidence();
  if (evidence?.primary?.status === "FINALIZED") {
    console.log(`SKIP deploy ${evidence.primary.contractAddress}`);
    return;
  }
  const { account, client } = signingClient(OPERATOR_KEY_VARIABLES);
  await assertStudionet(client);
  const primary = await deployContract(client, evidence?.primary, (pending) =>
    writeEvidence({
      wallets: { ...(evidence?.wallets ?? {}), operatorAddress: account.address },
      primary: pending
    })
  );
  writeEvidence({
    wallets: { ...(evidence?.wallets ?? {}), operatorAddress: account.address },
    primary,
    status: "DEPLOYED"
  });
}

async function activateAgent() {
  const evidence = requireCurrentEvidence();
  const address = evidence?.primary?.contractAddress;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address ?? "")) {
    throw new Error("Finalized contract evidence missing");
  }
  const operator = signingClient(OPERATOR_KEY_VARIABLES);
  const user = signingClient(USER_KEY_VARIABLES);
  if (operator.account.address.toLowerCase() === user.account.address.toLowerCase()) {
    throw new Error("Operator and user wallets must differ");
  }
  await assertStudionet(operator.client);
  await assertStudionet(user.client);
  const activation = {
    ...(evidence.activation ?? {}),
    agentId: AGENT_ID,
    transactions: { ...(evidence.activation?.transactions ?? {}) }
  };
  const persist = () =>
    writeEvidence({
      wallets: {
        ...(evidence.wallets ?? {}),
        operatorAddress: operator.account.address,
        userAddress: user.account.address
      },
      activation
    });

  if (activation.transactions.createAgent?.status !== "FINALIZED") {
    activation.transactions.createAgent = await writeFinalized(
      operator.client,
      address,
      "create_agent",
      [
        AGENT_ID,
        user.account.address,
        USER_AGENT,
        ORIGIN,
        POLICY_URL,
        "public search research only",
        PENALTY_AMOUNT,
        CHALLENGE_BOND
      ],
      OPERATOR_BOND,
      activation.transactions.createAgent,
      (pending) => {
        activation.transactions.createAgent = pending;
        persist();
      }
    );
    persist();
  }
  if (activation.transactions.acceptAgent?.status !== "FINALIZED") {
    activation.transactions.acceptAgent = await writeFinalized(
      user.client,
      address,
      "accept_agent",
      [AGENT_ID],
      0n,
      activation.transactions.acceptAgent,
      (pending) => {
        activation.transactions.acceptAgent = pending;
        persist();
      }
    );
    persist();
  }
  activation.state = {
    agent: await readView(operator.client, address, "get_agent", [AGENT_ID]),
    status: await readView(operator.client, address, "get_agent_status", [AGENT_ID]),
    canExecute: await readView(operator.client, address, "can_execute", [AGENT_ID])
  };
  if (activation.state.status !== "ACTIVE" || activation.state.canExecute !== true) {
    throw new Error("Activation did not reach canonical ACTIVE state");
  }
  activation.completedAt = new Date().toISOString();
  persist();
}

async function runViolationDemo() {
  const evidence = requireCurrentEvidence();
  const address = evidence?.primary?.contractAddress;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address ?? "")) {
    throw new Error("Finalized contract evidence missing");
  }
  const operator = signingClient(OPERATOR_KEY_VARIABLES);
  const user = signingClient(USER_KEY_VARIABLES);
  await assertStudionet(operator.client);
  await assertStudionet(user.client);
  const demo = {
    ...(evidence.demo ?? {}),
    caseId: CASE_ID,
    targetUrl: TARGET_URL,
    receiptUrl: RECEIPT_URL,
    transactions: { ...(evidence.demo?.transactions ?? {}) }
  };
  const persist = () => writeEvidence({ demo });

  if (demo.transactions.openCase?.status !== "FINALIZED") {
    demo.transactions.openCase = await writeFinalized(
      user.client,
      address,
      "open_access_case",
      [CASE_ID, AGENT_ID, TARGET_URL, RECEIPT_URL],
      CHALLENGE_BOND,
      demo.transactions.openCase,
      (pending) => {
        demo.transactions.openCase = pending;
        persist();
      }
    );
    persist();
  }
  if (demo.transactions.adjudicateCase?.status !== "FINALIZED") {
    demo.transactions.adjudicateCase = await writeFinalized(
      operator.client,
      address,
      "adjudicate_case",
      [CASE_ID],
      0n,
      demo.transactions.adjudicateCase,
      (pending) => {
        demo.transactions.adjudicateCase = pending;
        persist();
      }
    );
    persist();
  }
  const canonicalCase = await readView(
    operator.client,
    address,
    "get_case",
    [CASE_ID]
  );
  if (!canonicalCase.verdict_id) {
    throw new Error("Canonical case does not expose a verdict ID");
  }
  demo.verdictId = canonicalCase.verdict_id;
  demo.state = {
    agent: await readView(operator.client, address, "get_agent", [AGENT_ID]),
    case: canonicalCase,
    verdict: await readView(operator.client, address, "get_verdict", [
      demo.verdictId
    ]),
    userCreditWei: await readView(operator.client, address, "get_credit", [
      user.account.address
    ]),
    openerCreditWei: await readView(operator.client, address, "get_credit", [
      user.account.address
    ]),
    accounting: await readView(operator.client, address, "get_accounting"),
    canExecute: await readView(operator.client, address, "can_execute", [AGENT_ID])
  };
  demo.completedAt = new Date().toISOString();
  persist();

  if (
    demo.state.verdict.applicability !== "MATERIAL_VIOLATION" ||
    demo.state.agent.status !== "QUARANTINED" ||
    demo.state.canExecute !== false
  ) {
    throw new Error(
      `Unexpected verdict ${demo.state.verdict.applicability}; real consensus preserved`
    );
  }
}

async function withdrawUserCredit() {
  const evidence = requireCurrentEvidence();
  const address = evidence?.primary?.contractAddress;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address ?? "")) {
    throw new Error("Finalized contract evidence missing");
  }
  const user = signingClient(USER_KEY_VARIABLES);
  await assertStudionet(user.client);
  const currentCredit = BigInt(
    await readView(user.client, address, "get_credit", [user.account.address])
  );
  if (currentCredit === 0n) {
    writeEvidence({
      withdrawal: {
        ...(evidence.withdrawal ?? {}),
        userAddress: user.account.address,
        remainingCreditWei: "0",
        status: "NO_CREDIT"
      }
    });
    return;
  }
  const previous = evidence.withdrawal ?? {};
  let transaction = previous.transaction;
  if (transaction?.status !== "FINALIZED") {
    transaction = await writeFinalized(
      user.client,
      address,
      "withdraw_credit",
      [currentCredit],
      0n,
      transaction,
      (pending) =>
        writeEvidence({
          withdrawal: {
            ...previous,
            userAddress: user.account.address,
            withdrawnCreditWei: currentCredit.toString(),
            transaction: pending
          }
        })
    );
  }
  const remainingCredit = await readView(user.client, address, "get_credit", [
    user.account.address
  ]);
  writeEvidence({
    withdrawal: {
      userAddress: user.account.address,
      withdrawnCreditWei: currentCredit.toString(),
      remainingCreditWei: String(remainingCredit),
      transaction,
      observedAt: new Date().toISOString()
    }
  });
}

async function verify() {
  const evidence = requireCurrentEvidence();
  if (
    !evidence?.primary?.contractAddress ||
    !evidence?.demo?.state ||
    !evidence?.demo?.verdictId
  ) {
    throw new Error("Deployment or demo evidence missing");
  }
  const client = publicClient();
  const address = evidence.primary.contractAddress;
  const status = await readView(client, address, "get_agent_status", [AGENT_ID]);
  const canExecute = await readView(client, address, "can_execute", [AGENT_ID]);
  const verdict = await readView(client, address, "get_verdict", [
    evidence.demo.verdictId
  ]);
  if (
    status !== "QUARANTINED" ||
    canExecute !== false ||
    verdict.applicability !== "MATERIAL_VIOLATION"
  ) {
    throw new Error("Canonical reads do not prove violation consequence");
  }
  writeEvidence({
    status: "ACTIVE",
    verifiedAt: new Date().toISOString()
  });
  console.log("VERIFIED AgentAccessBond Studionet lifecycle");
}

const command = process.argv[2] ?? "inspect";
const commands = {
  inspect,
  "recover-superseded": recoverSupersededRevision,
  deploy,
  "activate-agent": activateAgent,
  "run-violation-demo": runViolationDemo,
  "withdraw-user-credit": withdrawUserCredit,
  verify
};

if (!(command in commands)) {
  throw new Error(`Unknown command ${command}. Use ${Object.keys(commands).join(", ")}`);
}

await commands[command]();
