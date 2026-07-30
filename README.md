# AgentAccessBond

> Validator-enforced accountability for web agents, backed by signed access
> events, version-bound public policy evidence, and onchain bonds.

AgentAccessBond is a GenLayer Projects-track dApp. An operator registers an
agent, locks a bond, and commits to an immutable origin, User-Agent, policy URL,
purpose, financial terms, and runner attestor public key. A challenger can
submit a signed access event. GenLayer validators authenticate the event,
independently fetch its exact policy and robots versions, and decide whether
the access violated the registered scope.

A finalized material violation quarantines the agent, makes
`can_execute(agent_id)` return `false`, settles the penalty from the operator
bond, refunds the challenge bond, and credits the designated beneficiary.

## Live Submission

- Production app:
  [agent-access-bond.vercel.app](https://agent-access-bond.vercel.app)
- Network: GenLayer Studionet (`61999`)
- Contract:
  [`0x4e2ff0c3Ced6e72bE66FA603c0d2913319e56C0b`](https://explorer-studio.genlayer.com/address/0x4e2ff0c3Ced6e72bE66FA603c0d2913319e56C0b)
- Deployed source commit:
  [`747e8ad`](https://github.com/duclucky/agent-access-bond/commit/747e8ad4aa9cb402f69618227a892d12f76e4bf6)
- Repository:
  [github.com/duclucky/agent-access-bond](https://github.com/duclucky/agent-access-bond)
- CI:
  [GitHub Actions Check](https://github.com/duclucky/agent-access-bond/actions/workflows/check.yml)

## What Changed After Review

The current revision addresses all requested review items:

1. Every punitive case requires a valid secp256k1 runner signature.
2. The signed payload binds `occurred_at`, event identity, policy version URL
   and Keccak hash, and robots version URL and Keccak hash.
3. Validators fetch those exact version URLs and verify both content hashes
   before semantic adjudication.
4. Invalid signatures, identity mismatches, unavailable sources, or hash
   mismatches produce `UNVERIFIABLE / RETRYABLE` and cannot slash a bond.
5. Frontend case statuses and violation enums now exactly match the contract.
6. The UI exposes real `retry_case`, `propose_case_cancel`, and
   `accept_case_cancel` transactions with contract-matching authorization.
7. `get_agent_case_ids` provides append-only case discovery, so resolved case
   history and verdicts are restored after reload without local case state.

## How to Use the Web App

### 1. Connect a wallet

1. Open the production app and unlock an installed EVM extension.
2. Select **Connect Wallet**.
3. Choose a wallet discovered through EIP-6963.
4. Approve adding or switching to GenLayer Studionet when requested.

The picker supports installed extensions instead of assuming MetaMask.
MetaMask mobile/QR remains an explicit fallback. Reads do not require a
signature. Every write uses the selected wallet and waits for submitted,
accepted, and finalized states.

### 2. Inspect an agent

1. Open **Dashboard**.
2. Enter an exact Agent ID, for example `agent-fixture-policy-001`.
3. Select **Inspect**.
4. Review status, execution eligibility, immutable identity, bond accounting,
   and the complete onchain case timeline.

The app starts with no hardcoded agent. Agent IDs remembered in the browser are
only a convenience index; agent, case, verdict, credit, and accounting data are
always re-read from the contract.

### 3. Register an agent

1. Connect the operator wallet and open **Register Agent**.
2. Enter the protected HTTPS origin and exact User-Agent string.
3. Enter the designated user address and public policy URL.
4. Enter the uncompressed secp256k1 runner public key:
   `0x04` followed by 128 hexadecimal characters.
5. Set purpose, operator bond, penalty, and minimum challenge bond.
6. Select **Create Agent Draft Bond** and approve the transaction.
7. Connect the designated user wallet, inspect the new Agent ID, and approve
   the draft. The agent becomes `ACTIVE`.

The origin, policy URL, User-Agent, designated user, attestor key, purpose, and
financial terms are immutable after registration.

### 4. Produce a signed access event

The runner publishes an HTTPS JSON receipt using
`agent-access-event/v1`. The fixture is available at
[`docs/evidence/public-fixtures/case-1-receipt.json`](docs/evidence/public-fixtures/case-1-receipt.json).

Required signed fields:

```json
{
  "schema": "agent-access-event/v1",
  "event_id": "event-unique-001",
  "agent_id": "registered-agent-id",
  "user_agent": "ExactAgent/1.0",
  "method": "GET",
  "target_url": "https://protected.example/path",
  "occurred_at": "2026-07-30T10:00:00Z",
  "nonce": "runner-unique-nonce",
  "policy_version": "policy-v1",
  "policy_url": "https://public.example/policy-v1.txt",
  "policy_hash": "0x<keccak256-of-exact-policy-bytes>",
  "robots_version": "robots-v1",
  "robots_url": "https://protected.example/robots.txt?v=1",
  "robots_hash": "0x<keccak256-of-exact-robots-bytes>",
  "attestor_public_key": "0x04<128-hex-characters>",
  "signature": "0x<64-byte-r-plus-s-signature>"
}
```

To sign:

1. Remove `signature`.
2. Serialize all remaining fields as ASCII JSON with keys sorted
   lexicographically, no whitespace, and separators `,` and `:`.
3. Compute Keccak-256 of that canonical JSON.
4. Sign the digest with the runner secp256k1 private key.
5. Publish compact low-s `r || s` as a 64-byte hex signature.

Never put the runner private key in the frontend or repository.

### 5. Open and adjudicate a case

1. Inspect the agent and open **Review Cases**.
2. Select **Submit Evidence Challenge**.
3. Enter the signed `event_id`, target URL, public receipt URL, and challenge
   bond.
4. Approve `open_access_case`.
5. Open the case and approve `adjudicate_case`.

The contract authenticates the event before asking validators for semantic
judgment. A punitive verdict has a defense-in-depth guard requiring
`attestation_verified == true`.

### 6. Retry or cancel an unresolved case

- A `RETRYABLE` case can be retried by the operator, designated user, or case
  opener through **Retry Review**.
- The operator or opener can select **Request Case Cancellation**.
- The other party must select **Confirm Case Cancellation**.

Cancellation is bilateral, refunds the challenge bond once, clears the active
case, and prevents reuse of the signed event ID.

### 7. Withdraw credit or close an agent

- A beneficiary uses **Credits** to send `withdraw_credit`.
- Agent closure is bilateral between operator and designated user through
  `propose_close` and `accept_close`.

## Signed Evidence Trust Model

The runner signature authenticates the complete access statement. The signed
timestamp is inseparable from the policy and robots version labels, URLs, and
hashes used for adjudication. Validators then independently:

1. fetch the public receipt;
2. verify event, agent, User-Agent, target, and attestor identity;
3. verify the secp256k1 signature;
4. fetch the exact policy and robots URLs;
5. verify Keccak-256 content hashes;
6. judge only bounded semantic fields.

The model returns `applicability`, `violation_type`, and bounded rationale.
Contract code derives source coverage, matched facts, required action, state
transition, verdict ID, and every accounting amount.

Exact violation enums:

- `DISALLOWED_PATH`
- `USER_AGENT_MISMATCH`
- `POLICY_SCOPE_BREACH`
- `RECEIPT_INSUFFICIENT`
- `NONE`

Exact case statuses:

- `OPEN`
- `RETRYABLE`
- `RESOLVED`
- `CANCELED`

## Public Interface

### Views

```text
get_agent(agent_id)
get_agent_status(agent_id)
can_execute(agent_id)
get_agent_case_ids(agent_id)
get_case(case_id)
get_verdict(verdict_id)
get_credit(address)
get_accounting()
```

### Writes

```text
create_agent(agent_id, user, user_agent, origin, policy_url,
             allowed_purpose, penalty_amount, minimum_challenge_bond,
             attestor_public_key) payable
accept_agent(agent_id)
open_access_case(case_id, agent_id, event_id, target_url, receipt_url) payable
adjudicate_case(case_id)
retry_case(case_id)
propose_case_cancel(case_id)
accept_case_cancel(case_id)
withdraw_credit(amount)
propose_close(agent_id)
accept_close(agent_id)
```

There are 18 public methods: 8 views and 10 writes. Integrators can gate work
with `can_execute(agent_id)` and restore full review history through
`get_agent_case_ids(agent_id)` without copying this application.

## Verified Studionet Lifecycle

The active revision finalized:

- deployment;
- operator registration with immutable attestor key;
- designated-user acceptance;
- case opening with a unique signed event ID;
- validator adjudication;
- `attestation_verified=true`;
- `MATERIAL_VIOLATION / DISALLOWED_PATH`;
- agent `QUARANTINED`;
- `can_execute=false`;
- penalty/challenge settlement;
- beneficiary withdrawal;
- resolved case discovery through `get_agent_case_ids`.

Evidence:

- [active lifecycle](docs/evidence/studionet/deployment.json)
- [production hosting](docs/evidence/studionet/frontend-hosting.json)
- [browser-wallet transactions](docs/evidence/studionet/browser-wallet.json)
- [secondary-wallet smoke](docs/evidence/studionet/secondary-wallet-smoke.json)
- [technical specification](docs/README.md)

Superseded replaceable revisions were closed and recovered to zero where their
contract API supported recovery. Historical evidence remains archived by
contract address under `docs/evidence/studionet/revisions/`.

## Verification

```powershell
npm run check
```

Current release gate:

- GenVM lint and schema validation;
- 24 direct contract tests;
- 10 deployment/evidence tests;
- 58 frontend tests;
- TypeScript validation;
- production Vite build.

No critical test is skipped or marked expected-failure.

## Run Locally

Requirements: Node.js, npm, and Python 3.12.

```powershell
npm run setup
Copy-Item frontend/.env.example frontend/.env.local
npm --workspace frontend run dev
```

Open `http://localhost:5173`. `VITE_*` variables are public and must never
contain a private key.

## Deployment

The deployment runner reads authorized keys from ignored project `.env` first,
then the ignored parent workspace `.env`. It records only allowlisted public
evidence and resumes submitted transactions.

```powershell
npm run deploy:studionet -- inspect
npm run deploy:studionet -- deploy
npm run deploy:studionet -- activate-agent
npm run deploy:studionet -- run-violation-demo
npm run deploy:studionet -- withdraw-user-credit
npm run deploy:studionet -- verify
```

## Honest Limitations

- The active deployment is verified on Studionet, not a production mainnet.
- The registered runner key authenticates the runner chosen by the operator;
  it does not by itself prove DNS or website ownership.
- `occurred_at` is signed and version-bound, but this revision validates its
  UTC format rather than enforcing a maximum event age.
- `robots.txt` and the registered policy are protocol evidence, not a legal
  determination.
- External third-party adoption remains unverified.
- One older historical revision predates case cancellation and retains test
  funds; it is documented as unrecovered and is not presented as active.

## Copy-Ready Submission

- **Category:** Projects
- **Title:** AgentAccessBond: Signed, Validator-Enforced Web Agent Accountability
- **Demo:** https://agent-access-bond.vercel.app
- **Repository:** https://github.com/duclucky/agent-access-bond
- **Primary contract:** https://explorer-studio.genlayer.com/address/0x4e2ff0c3Ced6e72bE66FA603c0d2913319e56C0b
- **Consumer contract:** N/A; integrations use the eight public views directly.

**Description:**

AgentAccessBond is a Studionet dApp for bonded web-agent accountability. An
operator registers an immutable agent identity, policy, purpose, financial
terms, and secp256k1 runner attestor key. Challengers submit signed access
events whose timestamp, target, policy version/hash, and robots version/hash
are authenticated before adjudication. GenLayer validators independently fetch
the exact public evidence and decide bounded applicability and violation
fields. Invalid or unavailable attestations are retryable and cannot slash.
A finalized material violation quarantines the agent, disables
`can_execute(agent_id)`, settles the operator penalty, refunds the challenge
bond, and credits the beneficiary. The frontend sends real wallet
transactions, exposes retry and bilateral case cancellation, and restores
resolved case history from canonical contract reads after reload.
