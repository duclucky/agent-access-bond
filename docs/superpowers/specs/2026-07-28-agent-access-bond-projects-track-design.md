# AgentAccessBond Projects Track Design

**Date:** 2026-07-28
**Track:** Projects
**Status:** Approved by the user's instruction to proceed without further questions
**Primary authority:** `MASTER-PROMPT-GENLAYER-END-TO-END.md`

## Outcome

AgentAccessBond becomes a complete GenLayer product rather than a contract-only
demo. The product lets an operator bond an automated web agent, lets the
designated user accept it, lets an adversarial challenger open an evidence-backed
access case, and lets GenLayer validators decide the semantic policy outcome.
The finalized verdict directly controls quarantine, retry state, bond credits,
withdrawals, and whether the agent may execute.

The active Projects-track claim requires all of the following:

- one reusable Intelligent Contract primitive with a documented public interface;
- validator-controlled inspection of bounded public evidence;
- semantic equivalence over consensus-critical fields;
- real wallet-signed browser transactions on Studionet;
- canonical state reads after finalization;
- honest, revision-specific deployment and browser evidence.

## Existing Gaps

The current repository has a substantial lifecycle and accounting model, but it
does not yet satisfy the Projects track:

- adjudication performs deterministic string matching and does not use an LLM for
  semantic judgment despite documentation and tests describing LLM behavior;
- the contract uses `gl.vm.run_nondet_unsafe` without a documented runtime reason;
- `credits` uses an address-keyed `TreeMap`, while the verified public-boundary
  convention requires string keys;
- the frontend exports only a status helper and cannot connect a wallet, submit
  transactions, track finality, or read canonical state;
- `scripts/check.ps1` can return success after a failed native contract lint;
- Studionet evidence and project status are internally inconsistent;
- the current explorer host is not treated as configurable revision metadata.

## Architecture

The system remains a single contract because the bond ledger, access right,
case state, verdict, and consequence share one enforcement boundary. A separate
consumer contract would not own independent state or trust and is therefore not
justified.

The repository has four product units:

1. `contracts/agent_access_bond.py` owns lifecycle, authorization, evidence
   adjudication, accounting, and canonical view methods.
2. `frontend/` is a React/Vite browser application that uses `genlayer-js` and a
   wallet provider for real Studionet reads and writes.
3. `scripts/` contains fail-fast verification and an idempotent, resumable
   Studionet deployment/lifecycle runner.
4. `docs/evidence/studionet/` contains one active revision manifest plus archived
   manifests for superseded revisions.

## Contract Model

### Entities and state

`Agent` is isolated by `agent_id`. It records operator, designated user,
identity and policy configuration, locked operator bond, challenge threshold,
penalty, status, active case, and close handshake.

`AccessCase` is isolated by `case_id`. It records opener, target and receipt
URLs, challenge bond, attempt count, status, verdict ID, and settlement guard.
It also records a bilateral cancellation proposal so a structurally failed
adjudication can be closed and the challenge bond refunded without unilateral
control.

`Verdict` is immutable after creation and records normalized semantic output,
the previous and new agent status, deterministic consequence amounts, and
attempt number.

Credits are keyed by normalized lowercase address strings. The accounting
invariant is:

`contract balance = locked operator bonds + locked challenge bonds + withdrawable credits`

for all completed transitions, subject to the GenVM direct-mode limitations
already documented by the project.

### State transitions

- `create_agent`: operator deposits the operator bond and creates `DRAFT`.
- `accept_agent`: only the designated user transitions `DRAFT -> ACTIVE`.
- `open_access_case`: challenger deposits a bond; the agent has one active case
  and `can_execute` becomes false.
- `adjudicate_case`: validators inspect evidence and create one verdict.
- `COMPLIANT`: challenge bond credits the operator; agent returns to `ACTIVE`.
- `MATERIAL_VIOLATION`: penalty credits the user, challenge bond returns to the
  challenger, and agent becomes `QUARANTINED`.
- `UNVERIFIABLE`: no bond settles; case becomes retryable and agent becomes
  `PENDING_REVIEW`.
- `retry_case`: reopens only the same retryable case without a new bond.
- bilateral case cancellation: operator and opener jointly cancel an open or
  retryable case, refund the challenge bond once, and restore `ACTIVE`.
- `withdraw_credit`: debits the internal ledger before native transfer.
- bilateral close: designated user and operator jointly close an agent with no
  active case and credit the remaining operator bond.

Duplicate adjudication, duplicate settlement, duplicate close acceptance, and
concurrent active cases remain impossible.

## Validator-Controlled Judgment

All web and LLM operations occur inside the nondeterministic evaluation
function. Each validator independently fetches:

- `{origin}/robots.txt`;
- the operator-declared authoritative policy URL;
- the case receipt URL.

Contract code bounds source length, validates receipt identity fields, derives
the target path, derives allowed enum/action sets, and compacts evidence. The
prompt treats every source body as untrusted evidence and explicitly forbids
following embedded instructions.

The model may return only these fields:

- `applicability`: `COMPLIANT`, `MATERIAL_VIOLATION`, or `UNVERIFIABLE`;
- `violation_type`: one allowed violation enum;
- `rationale`: bounded explanatory prose.

The contract derives agent ID, case ID, target URL, source coverage,
matched fact IDs, required action, new status, credit mapping, and attempt ID.
Unknown keys are discarded. Missing or invalid consensus-critical fields fail
closed.

The validator replay compares normalized applicability and violation type;
source coverage, required action, matched facts, status, and settlement are
deterministically derived from those fields and validated source structure.
Rationale wording is not consensus-critical. The implementation uses
`gl.vm.run_nondet`.

## Frontend Product

The first screen is the operational application, not a marketing page. It uses
a restrained, work-focused layout with:

- a top bar showing wallet, Studionet network state, and current contract;
- an agent selector and canonical status summary;
- lifecycle actions for create, accept, open case, adjudicate/retry, withdraw,
  and bilateral close;
- case and verdict panels showing source coverage, matched facts, semantic
  verdict, consequence, and rationale;
- a transaction activity panel with submitted, accepted/decided, finalized,
  failed, and retry states plus explorer links.

The browser never stores canonical contract state. After every finalized write,
it re-reads the affected agent, case, verdict, credit, and accounting views.
Wallet absence, wrong network, rejected signature, RPC failure, validator
failure, and evidence failure are visible and recoverable. Transaction hashes
are shown only after the SDK returns them.

Configuration is public and build-time:

- `VITE_GENLAYER_NETWORK=studionet`;
- `VITE_GENLAYER_CONTRACT_ADDRESS=<active revision>`;
- `VITE_GENLAYER_EXPLORER_URL=<verified explorer base>`.

No private key or script wallet material enters the frontend.

## Verification

Development follows test-first cycles.

Contract tests cover:

- address-key normalization and per-entity isolation;
- authorization and locked configuration;
- semantic output normalization and equivalence;
- malicious leader shape, invalid enums, unknown fact IDs, and prompt injection;
- malformed, contradictory, missing, oversized, and unavailable evidence;
- all verdict classes and consequence mappings;
- duplicate actions, accounting, withdrawal, retry, restoration, and close;
- payable metadata and the chosen nondeterministic API.

Frontend tests cover:

- network/config validation;
- canonical read projection;
- transaction lifecycle reducer;
- failure/retry behavior;
- action availability derived from onchain state.

`npm run check` must stop at the first failing subcommand and prove contract
lint, direct tests, deployment parser tests, frontend tests, TypeScript lint,
and production build.

## Deployment and Evidence

The current Studionet revision remains valid historical evidence until a new
contract is required. If contract source changes, a new revision is mandatory.
Before sending value, the deployment runner confirms the close, credit, and
withdrawal recovery paths.

Deployment identity binds:

- network;
- source commit;
- Depends runner hash/API family;
- contract address and deploy transaction;
- lifecycle transaction hashes;
- final canonical reads;
- browser-wallet evidence status.

The previous active manifest is archived under a revision-specific directory
with `SUPERSEDED` status and reason. Exactly one
`docs/evidence/studionet/deployment.json` remains active. Script-signed evidence
and browser-wallet evidence are stored and claimed separately.

The deployed current revision is
`0x37826aA6a75F033D67169b2F8D2616382Ca06522`, bound to source commit
`e8f918130cf853f88611c3fd267c1a5cc913eda7`. Its Studionet lifecycle finalized
`MATERIAL_VIOLATION`, `QUARANTINED`, and `can_execute=false`. The frontend is
live at `https://agent-access-bond.vercel.app`; browser-wallet proof remains
pending and is not inferred from either hosting or the script-signed lifecycle.

External deployment is attempted only after local checks pass and authorized
wallet configuration is found without exposing secrets. A deployment or
frontend publication is never claimed from local success alone.

## Documentation and Submission

The root README and project technical README will identify Projects as the
locked category, describe the trust problem and validator judgment precisely,
show the public contract interface, link the active explorer and lifecycle
evidence, and state limitations honestly.

Every submission claim maps to a method/state transition, canonical view, test,
and evidence file. Copy-ready form text is produced only after final counts,
active deployment identity, CI, and browser evidence are current. The final
portal Submit action remains outside this implementation unless separately
authorized at action time.

## Acceptance Criteria

The implementation is acceptable when:

- all mandatory idea gates still pass;
- the contract uses actual validator-controlled semantic judgment;
- all consensus-critical model output is normalized and replayed semantically;
- `npm run check` fails on an injected subcommand failure and passes cleanly on
  the final tree;
- the browser can perform the supported Studionet lifecycle with a real wallet;
- finalized writes trigger canonical state refresh;
- a changed contract has a new active Studionet revision or is explicitly marked
  local-only if external deployment is blocked;
- evidence, README status, and submission claims agree exactly.
