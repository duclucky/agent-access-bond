# AgentAccessBond Technical Specification

## Identity

- Idea: `IDEA-004`
- Category: `Projects`
- Network: GenLayer Studionet (`61999`)
- Contract count: 1
- Active contract:
  `0x4e2ff0c3Ced6e72bE66FA603c0d2913319e56C0b`
- Deployed source: `747e8ad4aa9cb402f69618227a892d12f76e4bf6`
- Production: `https://agent-access-bond.vercel.app`
- Status: `SIGNED LIFECYCLE AND BROWSER CANONICAL READ VERIFIED`

## Trust Problem

The operator benefits from keeping its bond and routing eligibility. A
challenger benefits from proving a violation. The designated user needs a
neutral decision before routing more work. An ordinary database, EVM-only
contract, or one party's LLM cannot independently authenticate an offchain
access event, inspect public policy versions, interpret their meaning, and
enforce a shared financial consequence.

GenLayer validators own the semantic decision. Contract code owns
authentication, normalization, authorization, state transitions, and
accounting.

## Authenticated Access Event

Each agent stores one immutable uncompressed secp256k1
`attestor_public_key`. The public receipt schema is
`agent-access-event/v1`.

Consensus-critical signed fields:

```text
schema
event_id
agent_id
user_agent
method
target_url
occurred_at
nonce
policy_version
policy_url
policy_hash
robots_version
robots_url
robots_hash
attestor_public_key
```

Canonicalization uses ASCII JSON, sorted keys, no whitespace, and separators
`,` and `:`. The signature is compact 64-byte low-s secp256k1 `r || s` over
Keccak-256 of the canonical payload.

The contract verifies:

- schema and unique event ID;
- agent, User-Agent, target, and registered attestor identity;
- UTC timestamp syntax;
- locked policy URL;
- robots URL scoped under `{origin}/robots.txt`;
- public-key validity and signature;
- exact Keccak-256 policy and robots content hashes.

Only then can validator adjudication produce a punitive result.

## Fail-Closed Rule

Any invalid signature, identity mismatch, malformed field, source failure, or
version hash mismatch produces:

```text
applicability = UNVERIFIABLE
violation_type = RECEIPT_INSUFFICIENT
case status = RETRYABLE
required action = PAUSE_AND_RETRY
attestation_verified = false
```

No challenge bond or operator penalty is settled. A second defense-in-depth
guard prevents material settlement unless `attestation_verified` is true.

## Validator Judgment

After authentication, the nondeterministic path gives validators bounded,
untrusted receipt, policy, and robots evidence. The model returns only:

- `applicability`: `COMPLIANT`, `MATERIAL_VIOLATION`, or `UNVERIFIABLE`;
- `violation_type`: one exact contract enum;
- bounded rationale.

The contract derives source coverage, matched facts, required action, status,
verdict ID, attempt, and every monetary amount. Validators compare normalized
consensus fields while allowing rationale wording to differ.

## State Model

```text
ABSENT -> DRAFT -> ACTIVE
                    |
                    +-> PENDING_REVIEW -> ACTIVE       (COMPLIANT)
                    |                  -> QUARANTINED  (MATERIAL_VIOLATION)
                    |                  -> RETRYABLE    (UNVERIFIABLE)
                    |
                    +-> CLOSED (bilateral close)

RETRYABLE -> OPEN       (authorized retry)
OPEN/RETRYABLE -> CANCELED (bilateral operator/opener cancellation)
```

`can_execute(agent_id)` is true only when the agent is accepted, `ACTIVE`, and
has no active case.

Case IDs are indexed append-only per agent. `get_agent_case_ids` returns the
canonical list, so resolved and canceled cases remain discoverable after
`active_case_id` clears.

## Accounting

```text
contract balance
  = locked operator bonds
  + locked challenge bonds
  + withdrawable credits
```

Credits are keyed by normalized address. Settlement is guarded against
duplicates. Withdrawal debits the ledger before native transfer.

A material violation:

1. debits the configured penalty from the operator bond;
2. credits the designated user;
3. refunds the opener's challenge bond;
4. marks the case settled and resolved;
5. quarantines the agent.

## Authorization

| Write | Authorized actor |
| --- | --- |
| `create_agent` | transaction sender becomes operator |
| `accept_agent` | designated user |
| `open_access_case` | any funded challenger |
| `adjudicate_case` | public trigger; contract controls outcome |
| `retry_case` | operator, designated user, or opener |
| `propose_case_cancel` | operator or opener |
| `accept_case_cancel` | the other cancellation party |
| `withdraw_credit` | credit owner |
| `propose_close` | operator or designated user |
| `accept_close` | the other agent party |

## Public Interface

### Write Methods

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

### View Methods

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

The contract exposes 18 methods: 10 writes and 8 views.

## Frontend Contract

The React/Vite app:

- discovers extensions through EIP-6963;
- keeps MetaMask mobile/QR as an explicit fallback;
- never handles a private key;
- sends real `genlayer-js` writes;
- displays submitted, accepted, finalized, failed, and retry states;
- uses exact contract status and violation enums;
- exposes retry and bilateral case cancellation;
- reads `get_agent_case_ids`, every case, and every verdict after reload;
- uses local storage only for a bounded recent Agent ID convenience index.

There is no application backend and no local canonical state.

## Claim-to-Code Matrix

| Claim | Transition | Canonical read | Verification |
| --- | --- | --- | --- |
| Runner authenticated | `adjudicate_case` signature gate | `get_verdict.attestation_verified` | attestation tests; active verdict |
| Timestamp bound to evidence versions | signed event payload | verdict timestamp/version URLs/hashes | fixture signature test; active verdict |
| Invalid evidence cannot slash | fail-closed adjudication | case, verdict, accounting | tamper/hash mismatch tests |
| Material violation quarantines | verdict settlement | `get_agent_status`, `can_execute` | lifecycle tests; Studionet reads |
| Retry is callable | `retry_case` | `get_case` | direct and frontend tests |
| Cancellation is bilateral | propose/accept cancel | case and accounting views | direct and frontend tests |
| History survives reload | append-only case index | `get_agent_case_ids` | direct/frontend test; production browser |
| Bond accounting is conserved | settlement/withdraw/close | `get_credit`, `get_accounting` | accounting tests; withdrawals |

## Active Studionet Evidence

- Contract:
  `0x4e2ff0c3Ced6e72bE66FA603c0d2913319e56C0b`
- Deploy tx:
  `0x70ffab64239c590287448972683c9e8a0fba8a4c7ebb1b3ce2a412263d47ef04`
- Create tx:
  `0xa8887782d3c8a2c35347bb31c20048b7dda18888378a19c5cd68022d2c0dfbec`
- Accept tx:
  `0x8031e26d768a08859daf99e6b8022602d30c04fb5af97b45916ea935832fc16e`
- Open case tx:
  `0xfb83a1b8eff2ddc89279d0f956412e14be9f52b06f23476954374265ae04ca08`
- Adjudicate tx:
  `0xe559927d086e818b7db5a48124277243491a4258e830823b97acfbe3edea2709`
- Withdraw tx:
  `0x56aad167779eac15dc5d19b0bb23c95fda2fd75a6f9043c4c7d3d6bf99e6c40e`
- Verdict: `MATERIAL_VIOLATION / DISALLOWED_PATH`
- Attestation: `true`
- Policy version: `fixture-policy-v1`
- Robots version: `fixture-robots-v1`
- Case: `RESOLVED`
- Agent: `QUARANTINED`
- `can_execute`: `false`
- Remaining beneficiary credit: `0`
- Case history read: `["case-fixture-private-001"]`

Safe evidence projection:
[`evidence/studionet/deployment.json`](evidence/studionet/deployment.json).

Production hosting:
[`evidence/studionet/frontend-hosting.json`](evidence/studionet/frontend-hosting.json).

## Verification

```powershell
npm run check
```

Verified counts:

- 24 direct contract tests;
- 10 deployment/evidence tests;
- 64 frontend tests;
- 18-method GenVM schema;
- successful TypeScript and Vite production build.

## Honest Limitations

- Studionet is the only active verified network.
- Runner authentication proves control of the registered runner key, not DNS
  ownership.
- The signed timestamp is version-bound, but maximum event age is not enforced.
- External adoption is not yet evidenced.
- One old pre-cancellation revision retains test funds and is explicitly
  documented as unrecovered.
- Current `genlayer-js` dependencies include upstream transitive audit findings
  with no available fix in the installed dependency line.
