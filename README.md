# AgentAccessBond

> AgentAccessBond lets GenLayer validators interpret bounded public web-access
> evidence, quarantine noncompliant agents, and settle bonded accountability
> without trusting the operator or challenger.

AgentAccessBond is a GenLayer Projects-track dApp for accountable web agents.
An operator bonds an immutable agent identity and access policy. A challenger
can submit a public action receipt, and validators independently decide its
semantic meaning. The accepted verdict directly changes execution eligibility,
agent status, and bond accounting.

## Live App

- Production:
  [agent-access-bond.vercel.app](https://agent-access-bond.vercel.app)
- Network: `Studionet` (`61999`)
- Browser-wallet status: an OKX extension connection has been verified on
  production. The app discovers installed extensions through EIP-6963 and
  keeps MetaMask mobile/QR as an explicit fallback; a browser-signed
  transaction remains `PENDING_USER_WALLET_PROOF`.

## How to Use the Web App

### 1. Connect a wallet

1. Open the [production app](https://agent-access-bond.vercel.app) and unlock
   an installed EVM wallet such as OKX Wallet. MetaMask mobile/QR is available
   as a fallback.
2. Select **Connect Wallet**, choose the detected extension, and approve the
   account request.
3. Approve the request to add or switch to GenLayer Studionet if the wallet
   asks. The app header then shows the shortened wallet address and
   `Studionet Active`.

Reading an existing agent is free and does not require a wallet signature.
Creating an agent, accepting it, opening or adjudicating a case, closing an
agent, and withdrawing credit are real Studionet transactions. The connected
wallet must hold enough Studionet GEN for the transaction value and fees.

### 2. Inspect an existing agent

1. Open **Dashboard**.
2. Enter the exact onchain Agent ID in **Inspect Agent Bond** and select
   **Inspect**.
3. Open the returned agent card to review its status, immutable identity and
   policy, bond amounts, execution eligibility, cases, and finalized verdicts.

The app deliberately starts with an empty agent list; it does not auto-load a
demo or fixture agent. Inspecting an ID reads canonical state from the deployed
contract and adds that agent to the current session.

### 3. Register and activate an agent

1. Connect the operator wallet and open **Register Agent**.
2. Enter the protected origin, exact User-Agent string, designated user
   address, publicly accessible policy URL, and allowed-purpose summary.
3. Set the operator bond, penalty amount, and minimum challenge bond. The
   operator bond must be at least `100 GEN`.
4. Select **Create Agent Draft Bond** and approve the wallet transaction. The
   contract creates the agent in `DRAFT` state and locks the operator bond.
5. Connect the designated user wallet, inspect the new Agent ID, then select
   **Approve Agent (Designated User)** and approve the transaction. The agent
   becomes `ACTIVE` only after this second-party acceptance.

Origin, User-Agent identity, policy URL, designated user, and financial terms
are contract configuration. Verify them before signing because activation
locks the agent configuration.

### 4. Submit and adjudicate an access review

1. Inspect the target Agent ID first, then open **Review Cases**.
2. Select **Submit Evidence Challenge** and provide the target endpoint URL, a
   publicly accessible action-receipt URL, the challenge bond, and an optional
   explanation. The bond must satisfy the agent's displayed minimum.
3. Select **Lock Bond & Open Case** and approve the transaction. The agent
   enters `PENDING_REVIEW`, so new execution is paused while the case is open.
4. Open the case, select **Review & Adjudicate**, and approve the adjudication
   transaction. GenLayer validators fetch the bounded public evidence and
   determine the verdict; the UI does not calculate or override it.
5. Wait for finality. On completion, refresh or inspect the Agent ID again to
   read the canonical case, verdict, agent status, and accounting state.

A finalized material violation changes the agent to `QUARANTINED`, makes
`can_execute(agent_id)` false, settles the configured penalty, refunds the
challenge bond, and creates beneficiary credit. Other verdict classes follow
their separate contract-defined recovery and accounting paths.

### 5. Withdraw awarded credit

1. Connect the designated beneficiary wallet and open **Credits**.
2. Confirm the amount under **Your Claimable Credits**.
3. Select **Claim & Withdraw to Wallet** and approve the transaction.
4. After finality, the app refreshes the credit and protocol accounting from
   the contract.

### 6. Close an agent

Open an inspected agent from **Dashboard**. Closing is bilateral: the operator
or designated user selects **Propose Close** or **Propose Closure**, then the
other party connects its wallet and selects **Accept Closure**. Do not treat a
closure proposal as final until the agent's canonical status reads `CLOSED`.

### Status reference

| Status | Meaning |
| --- | --- |
| `DRAFT` | Operator created the bond; designated-user acceptance is pending. |
| `ACTIVE` | Agent is accepted and may execute when no case blocks it. |
| `PENDING_REVIEW` | A challenge is open and execution is paused. |
| `QUARANTINED` | A finalized material violation blocks execution. |
| `CLOSED` | Bilateral closure completed and the agent is no longer active. |

## Deployed Contract

- Contract: `AgentAccessBond` (one contract)
- Address:
  [`0x37826aA6a75F033D67169b2F8D2616382Ca06522`](https://explorer-studio.genlayer.com/address/0x37826aA6a75F033D67169b2F8D2616382Ca06522)
- Deployed contract source commit:
  [`e8f9181`](https://github.com/duclucky/agent-access-bond/commit/e8f918130cf853f88611c3fd267c1a5cc913eda7)
- Public repository:
  [github.com/duclucky/agent-access-bond](https://github.com/duclucky/agent-access-bond)
- Current CI:
  [GitHub Actions Check](https://github.com/duclucky/agent-access-bond/actions/workflows/check.yml)

## Problem

Web-agent operators benefit from preserving access and their bond. Challengers
may overstate violations. A designated user needs a neutral result before
routing more work to the agent. A database, ordinary EVM contract, or one
party's LLM cannot independently fetch and interpret changing public policy
evidence while enforcing a shared monetary consequence.

## Why GenLayer

For each case, validators inspect bounded public evidence:

- `{origin}/robots.txt`;
- the immutable policy URL;
- the immutable action-receipt URL;
- the agent and case state already stored by the contract.

The nondeterministic evaluation runs inside the Intelligent Contract. The model
returns only bounded semantic fields: `applicability`, `violation_type`, and a
rationale. Contract code derives source coverage, fact IDs, required action,
new status, verdict IDs, and every accounting amount.

Validators compare normalized applicability and violation type. Rationale
wording may differ. Unavailable, malformed, oversized, contradictory, or
identity-mismatched evidence cannot create a canonical punitive verdict.

## Architecture

1. `contracts/agent_access_bond.py` owns authorization, immutable agent
   configuration, case state, semantic adjudication, credits, and execution
   eligibility.
2. `frontend/` is a React/Vite product workspace using `genlayer-js`. It
   discovers installed wallets through EIP-6963, reads canonical state, and
   requests real writes through the selected EIP-1193 provider. MetaMask
   mobile/QR is an explicit fallback.
3. `scripts/` contains revision-aware Studionet deployment, lifecycle,
   recovery, and secondary-wallet smoke runners.
4. `docs/evidence/studionet/` contains projected public evidence only. Script
   wallets and browser-wallet proof are intentionally tracked separately.

No backend or local storage acts as canonical contract state.

## Consequence

A finalized `MATERIAL_VIOLATION`:

- moves the agent to `QUARANTINED`;
- makes `can_execute(agent_id)` return `false`;
- transfers the fixed penalty from the operator bond to the designated user;
- refunds the challenge bond to the case opener;
- prevents duplicate settlement.

`COMPLIANT` and `UNVERIFIABLE` have separate bounded state and accounting
paths. Bilateral cancellation and closure provide recovery without unilateral
fund seizure.

## Verified Evidence

The active Studionet lifecycle finalized:

- agent activation;
- case opening and validator-controlled adjudication;
- `MATERIAL_VIOLATION / DISALLOWED_PATH`;
- agent quarantine and `can_execute=false`;
- user credit withdrawal.

The independent secondary-wallet smoke finalized five more transactions:
`create_agent`, `accept_agent`, `propose_close`, `accept_close`, and
`withdraw_credit`. It used a 1 wei bond, closed the smoke agent, returned both
credits to zero, restored contract accounting to its baseline, and passed an
idempotent rerun without submitting another transaction.

Evidence:

- [active lifecycle](docs/evidence/studionet/deployment.json)
- [secondary-wallet smoke](docs/evidence/studionet/secondary-wallet-smoke.json)
- [Vercel hosting](docs/evidence/studionet/frontend-hosting.json)
- [browser-wallet status](docs/evidence/studionet/browser-wallet.json)
- [technical specification and claim-to-code matrix](docs/README.md)

## Reusable Interface

Integrators can route work without copying the adjudication logic:

```text
get_agent(agent_id)
get_agent_status(agent_id)
can_execute(agent_id)
get_case(case_id)
get_verdict(verdict_id)
get_credit(address)
get_accounting()
```

The contract also exposes ten lifecycle write methods documented in
[docs/README.md](docs/README.md#public-interface). A separate consumer contract
is not required because external products can read the primitive directly.

## Verification

```powershell
npm run check
```

The fail-fast release gate currently proves:

- GenVM lint and contract schema validation;
- 20 direct contract tests;
- 9 deployment and receipt-parser tests;
- 45 frontend tests;
- frontend TypeScript validation;
- production Vite build.

No critical test is skipped or marked expected-failure.

## Run Locally

Requirements: Node.js, npm, and Python 3.12.

```powershell
npm run setup
Copy-Item frontend/.env.example frontend/.env.local
npm --prefix frontend run dev
```

Open `http://localhost:5173`. `frontend/.env.local` contains public network
configuration only. Never place a private key in a `VITE_*` variable.

## Deploy To Studionet

These commands intentionally sign Studionet transactions. Use funded,
authorized test wallets in ignored `.env`:

```dotenv
STUDIONET_PRIVATE_KEY=<operator-key>
STUDIONET_INTEGRATOR_PRIVATE_KEY=<distinct-user-key>
```

Run each stage in order. The runner stores only allowlisted public evidence and
resumes submitted transactions instead of replaying them:

```powershell
npm run deploy:studionet -- inspect
npm run deploy:studionet -- deploy
npm run deploy:studionet -- activate-agent
npm run deploy:studionet -- run-violation-demo
npm run deploy:studionet -- withdraw-user-credit
npm run deploy:studionet -- verify
```

To replay the bounded secondary-wallet verification against the configured
active contract:

```powershell
npm run smoke:secondary-wallet
```

## Honest Limitations

- Browser connection UI is verified on production, but no user-approved,
  browser-signed transaction has been captured for this revision.
- The verified network is Studionet only.
- Public receipts prove inspectable content, not cryptographic runner
  attestation.
- `robots.txt` is an agreed signal for this protocol, not a legal ruling.
- External integration and adoption remain unverified.
- One historical superseded revision predates cancellation and retains locked
  test value; it is documented separately and is not presented as recovered.

## Submission Snapshot

- Recommended category: `Projects`
- Title: `AgentAccessBond: Validator-Enforced Web Agent Accountability`
- Primary contract: the Studionet explorer link above
- Consumer contract: `N/A` - integrators call the seven view methods directly
- Demo: production app above; canonical reads verified, browser write proof
  pending
- Successful CI: GitHub Actions workflow above

**Portal description (894 characters):**

AgentAccessBond is a Studionet dApp for bonded web-agent accountability. An
operator locks a bond around an immutable agent identity, origin, user-agent,
policy URL, and purpose. A challenger submits a bounded public action receipt.
GenLayer validators independently fetch robots.txt, the locked policy, and the
receipt, then compare normalized applicability and violation type while
allowing rationale wording to differ. A finalized material violation
quarantines the agent, disables can_execute(agent_id), and credits the
designated user and challenger. Integrators can reuse seven view methods
without copying adjudication logic. One contract, 20 direct tests, 9 script
tests, and 45 frontend tests are verified. The production wallet picker
discovers EIP-6963 extensions and offers explicit MetaMask mobile/QR fallback;
browser-signed transaction proof and external adoption remain pending.
