# AgentAccessBond Technical Specification

## Identity

- Idea ID: `IDEA-004`
- Project: `AgentAccessBond`
- Slug: `agent-access-bond`
- Locked category: `Projects`
- Network: `Studionet`
- Status: `STUDIONET SCRIPT LIFECYCLE VERIFIED / BROWSER WALLET PENDING`
- Contract count: 1
- Active address:
  `0x37826aA6a75F033D67169b2F8D2616382Ca06522`

## Product Outcome

An operator bonds an automated web agent to a fixed origin, user-agent, policy,
and purpose. A challenger opens a case with a public action receipt. GenLayer
validators independently fetch bounded public evidence and decide its semantic
meaning. A finalized material violation quarantines the agent, transfers a
fixed penalty to the user, refunds the challenge bond, and blocks
`can_execute(agent_id)`.

The product includes the reusable contract, a real-wallet browser application,
revision-aware deployment tooling, canonical state reads, and Studionet
lifecycle evidence.

## Mandatory Gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Replacement | `PASS` | A database or operator backend cannot provide validator-controlled interpretation; ordinary EVM cannot fetch and interpret the public sources. |
| Judgment | `PASS` | `adjudicate_case` calls an LLM inside `gl.vm.run_nondet`; validators independently re-evaluate the bounded evidence. |
| Evidence | `PASS` | Sources are derived or locked public HTTPS URLs with strict length, identity, and scope checks. |
| Equivalence | `PASS` | Validators compare normalized applicability and violation type; code derives coverage, facts, action, status, and settlement. |
| Consequence | `PASS` | Accepted verdicts directly update status, execution eligibility, and the bond ledger. |
| Adversarial pressure | `PASS` | Operator, user, and challenger have conflicting access and financial incentives. |
| State model | `PASS` | State is keyed per agent/case/verdict with authorization, one active case, append-only attempts, and settlement guards. |
| Reuse | `PASS` | Other products can call the seven view methods without copying adjudication logic. |
| Contract count | `PASS` | One contract owns the status and accounting enforcement boundary. |
| Differentiation | `PASS` | The evidence, actors, agent identity consequence, and web-access protocol differ from prior workspace ideas. |
| Claim-to-code | `PASS` | The matrix below maps every active claim to state, reads, tests, and evidence. |
| Full lifecycle | `PASS` | Current revision finalized activation, violation adjudication, quarantine, credit, withdrawal, and canonical verification. |
| Scope honesty | `PASS` | Production hosting is verified; browser-wallet, current CI, and external-adoption evidence remain explicitly pending. |

## Trust and Evidence Model

The operator benefits from preserving its bond and routing eligibility. A
challenger may overstate a violation. The designated user needs a neutral
decision before granting more work. Validators inspect:

- `{origin}/robots.txt`;
- the immutable policy URL;
- the case receipt URL;
- immutable agent and case state.

Contract code validates source size and receipt identity, derives trusted IDs
and URL scope, and treats fetched text as untrusted data. The prompt cannot
expand source URLs, enums, beneficiaries, actions, or accounting values.

The model returns only:

- `applicability`: `COMPLIANT`, `MATERIAL_VIOLATION`, or `UNVERIFIABLE`;
- `violation_type`: one bounded violation enum;
- `rationale`: bounded, non-consensus prose.

The contract derives `source_coverage`, `matched_fact_ids`, `required_action`,
new agent status, attempt/verdict IDs, and all monetary consequences.
Validators compare the normalized semantic fields and ignore rationale wording.
Malformed, missing, oversized, contradictory, or unavailable critical evidence
fails without writing a canonical verdict.

## State and Accounting

```text
[ABSENT] -> DRAFT -> ACTIVE -> CASE_OPEN
                            -> ACTIVE             (COMPLIANT)
                            -> QUARANTINED        (MATERIAL_VIOLATION)
                            -> PENDING_REVIEW     (UNVERIFIABLE)
                            -> ACTIVE             (bilateral case cancel)

ACTIVE | QUARANTINED -> CLOSED (bilateral close, no active case)
```

An open case prevents execution. Bilateral cancellation requires agreement
between the operator and original opener, refunds the challenge bond once, and
restores the previous active routing state. Bilateral close requires the
operator and designated user and returns the remaining operator bond.

Accounting invariant:

```text
contract balance
  = total_locked_operator_bonds
  + total_locked_challenge_bonds
  + total_withdrawable_credits
```

Ledger credits are keyed by normalized lowercase address strings. Withdrawal
debits the ledger before native transfer.

## Public Interface

### Write Methods

```text
create_agent(agent_id, user, user_agent, origin, policy_url,
             allowed_purpose, penalty_amount,
             minimum_challenge_bond) payable
accept_agent(agent_id)
open_access_case(case_id, agent_id, target_url, receipt_url) payable
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
get_case(case_id)
get_verdict(verdict_id)
get_credit(address)
get_accounting()
```

There are 17 public methods: 10 writes and 7 views. A separate consumer
contract is not justified because an integrator can pull
`get_agent_status(agent_id)` or `can_execute(agent_id)` directly.

## Frontend

The React/Vite application is an operational workspace rather than a marketing
page. It:

- connects an injected wallet and switches to Studionet;
- sends real `genlayer-js` writes to the configured revision;
- displays submitted, accepted, finalized, failed, and retry states;
- refreshes agent, case, verdict, credit, accounting, and eligibility after
  finalization;
- supports create, accept, case open/adjudicate/retry/cancel, withdrawal, and
  bilateral close;
- uses explorer links only for hashes returned by the SDK;
- keeps canonical state onchain and never handles a private key.

Public build configuration is defined in `frontend/.env.example`; the active
local configuration is stored only in ignored `frontend/.env.local`.
The production deployment is
[`https://agent-access-bond.vercel.app`](https://agent-access-bond.vercel.app).

## Claim-to-Code Matrix

| Claim | Contract transition | Canonical read | Test/evidence |
| --- | --- | --- | --- |
| Operator and user lock a mandate | `create_agent`, `accept_agent` | `get_agent` | authorization/config tests; activation txs |
| Validators judge public evidence | `adjudicate_case`, `gl.vm.run_nondet` | `get_verdict` | semantic/equivalence tests; adjudication tx |
| Violation quarantines the identity | violation settlement | `get_agent_status`, `can_execute` | lifecycle tests; current canonical reads |
| Bonds settle deterministically | verdict ledger transition | `get_credit`, `get_accounting` | accounting tests; withdrawal tx |
| Bad evidence does not slash | validation before state write | `get_case`, `get_agent_status` | malformed/source tests |
| Failed consensus can be recovered | bilateral case cancellation | case/credit/accounting views | cancellation/refund test |
| Browser app uses canonical state | frontend SDK reads/writes | all seven views | 20 frontend tests; browser proof pending |
| Revisions are attributable | deployment identity manifest | evidence file | 9 deployment/script tests |

## Verification

The repository release gate is:

```powershell
npm run check
```

It fails on the first unsuccessful stage and covers:

- GenVM lint and contract schema validation;
- 20 direct-mode contract tests;
- 9 deployment and verification-script tests;
- 20 frontend tests;
- frontend TypeScript checks;
- production Vite build.

The local linter is invoked as `python -m genvm_linter.cli` because the Windows
console launcher in the repository environment exits silently. The current
`genvm-linter` also excludes a class literally named `Contract` during schema
reflection, so the deployed class remains `AgentAccessBond`.

## Studionet Evidence

Active revision:

- contract:
  [`0x37826aA6a75F033D67169b2F8D2616382Ca06522`](https://explorer-studio.genlayer.com/address/0x37826aA6a75F033D67169b2F8D2616382Ca06522);
- source commit: `e8f918130cf853f88611c3fd267c1a5cc913eda7`;
- deploy tx:
  `0xd70158005f15925fd0667fa0a5d9af5a9d87d0d8f21d8c953527ade753bf41bb`;
- adjudication tx:
  `0x6efbd23c5951195324e6165e1f5c7798cbff01e52b52a28f40e4d5243750a821`;
- withdrawal tx:
  `0xc2a5c21acc9e0bfb38a49c63c2da89263975b46b82c1f651be79a292bf7bf71e`;
- verdict: `MATERIAL_VIOLATION / DISALLOWED_PATH`;
- decisive facts: `RECEIPT,ROBOTS_RULE,TARGET_PATH,USER_AGENT`;
- canonical state: agent `QUARANTINED`, case `RESOLVED`,
  `can_execute=false`, remaining user credit `0`;
- verified at: `2026-07-28T08:20:51.516Z`.

The complete safe projection is
`docs/evidence/studionet/deployment.json`.

Revision history:

- `0x4D2827F1BC7C4678DD439eea52de3340Ae9054Bd` is superseded and fully
  recovered to zero accounting.
- `0x751ed58604586A32F72fdEb0CE90155E14F30F10` is superseded after
  `MAJORITY_DISAGREE`. It predates case cancellation and still has an open case
  with 2 GEN operator bond and 0.1 GEN challenge bond locked. This is not
  represented as recovered.

Script-signed evidence and browser-wallet evidence are intentionally separate.
`docs/evidence/studionet/browser-wallet.json` remains
`PENDING_USER_WALLET_PROOF`.

Frontend hosting evidence is recorded in
`docs/evidence/studionet/frontend-hosting.json`. Vercel deployment
`dpl_A5y1ZWZWn6z1YhviL5jkipfLZwku` is `READY`; the production alias returned
HTTP 200 and its JavaScript bundle contains the active contract address.

## Honest Limitations

- `robots.txt` is an agreed policy signal for this bond protocol, not legal
  authorization.
- Public receipts prove only what validators can inspect; cryptographic runner
  attestation is future work.
- Integrators must read the primitive before routing offchain work.
- The superseded failed-consensus revision has funds locked because its
  historical contract lacks a cancellation path.
- Browser-wallet signing, current-revision public CI, and external adoption are
  not yet evidenced.
- `genlayer-js@1.1.8` currently brings transitive npm audit findings for which
  the installed dependency tree has no available upstream fix.
