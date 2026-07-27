# IDEA-004 - AgentAccessBond

## Identity

- Idea ID: `IDEA-004`
- Project name: `AgentAccessBond`
- Project slug: `agent-access-bond`
- Category: `Intelligent Contracts`
- Status: `LOCAL VERIFIED / STUDIONET PENDING`
- Repository: local only until public audit and push
- Target network: `Studionet`

## One-sentence product hook

When a bonded agent crosses a site's stated crawl boundary, validators
quarantine that agent identity and turn operator bond into challenger/user
credit.

## Trust problem

Agent operators, users, and site owners have conflicting incentives around
whether an autonomous agent respected a web-access mandate. An operator may
publish logs that minimize a bad action, a challenger may over-claim violation,
and a user or marketplace needs a neutral status before routing more work to
the agent.

A database or signed backend can store receipts, but the parties still have to
trust one operator to fetch and apply `robots.txt`, policy text, user-agent
matching, path scope, and the action receipt. An ordinary EVM contract cannot
fetch the current policy/receipt evidence. A one-party backend can apply the
rules, but is not a validator-controlled outcome.

Value/access at risk:

- operator bond;
- challenge bond;
- user/challenger credit;
- agent identity status for future task routing;
- public trust in agent marketplace or wallet automation.

## Fingerprint

- **Trust problem:** no single party should decide whether a bonded agent stayed
  inside a public web-access boundary.
- **Actors/adversary:** operator wants to keep bond/access; challenger or site
  owner may over-claim; user wants neutral status for routing.
- **Evidence class:** immutable onchain access mandate, origin `robots.txt`,
  optional locked policy URL, and public action receipt URL.
- **Consensus question:** did this agent user-agent access a URL that is
  disallowed or materially outside the locked policy, with sufficient evidence?
- **State machine:** `Draft -> Active -> Case -> Verdict -> Active |
  Quarantined | Closed`.
- **Direct consequence:** quarantine agent identity and settle
  operator/challenge bonds in the primitive.
- **Reuse surface:** builders call `get_agent_status(agent_id)` or
  `can_execute(agent_id)` before routing work.

## Mandatory Gate Matrix

| Gate | Result | Evidence/reason |
| --- | --- | --- |
| Replacement | `PASS` | A database/backend cannot provide neutral validator-controlled judgment over policy and receipt evidence. |
| Judgment | `PASS` | Validators fetch public evidence and independently replay the critical policy/path/user-agent checks. |
| Evidence | `PASS` | RFC 9309, origin `robots.txt`, locked policy URL, and public receipt URL are bounded and independently fetchable. |
| Equivalence | `PASS` | Critical IDs, URL parts, verdict enum, coverage, violation type, action, and fact IDs are exact normalized fields. |
| Consequence | `PASS` | Verdict updates agent status and bond ledger directly. |
| Adversarial | `PASS` | Operator and challenger/site owner have opposing financial/access incentives. |
| State model | `PASS` | Per-agent/per-case storage, one active case, append-only attempts, access control, and settlement guards are specified. |
| Reuse | `PASS` | Integrators can pull canonical status without a consumer contract. |
| Contract count | `PASS` | V1 uses one contract because the primitive owns both status and accounting consequence. |
| Differentiation | `PASS` | Differs from interface compatibility, product recall, governance mandate, and legacy oracle/escrow structures. |
| Claim-to-code | `PASS - planned` | Matrix below maps every claim to method, view, test, and network evidence target. |
| Full lifecycle | `PASS` | Studionet path verified: activate agent, open case, adjudicate public evidence, quarantine/credit, withdraw. |
| Scope honesty | `PASS` | Local, Studionet, and public CI evidence are claimed only where captured; browser-wallet/adoption remain unclaimed. |

## Actors, Roles, And Incentives

| Actor | Permissions | Value at risk | Incentive to bias |
| --- | --- | --- | --- |
| Operator | Create agent, lock bond, submit cure, propose close | Operator bond and future access | Hide or minimize a violation |
| User | Accept an agent mandate, receive violation credit, close jointly | Access safety and credit | Prefer strict enforcement before routing tasks |
| Challenger/site owner | Open case with challenge bond | Challenge bond | Over-claim a borderline violation |
| Validators | Fetch and interpret bounded evidence | Protocol correctness | Reject unsupported leader output |
| Integrator | Read status and credit views | Routing safety | None; read-only |

## Scope And Non-goals

### In Scope

- HTTP/HTTPS origins with public `robots.txt`.
- One locked user-agent string per agent.
- Public action receipts with timestamp, method, target URL, user-agent, and
  runner/operator signature text or hash.
- Optional public policy page under a locked host/path prefix.
- GEN operator bond, challenge bond, user/challenger credits, withdrawal.
- `COMPLIANT` and `MATERIAL_VIOLATION` verdicts for the current public robots
  policy lifecycle; malformed critical evidence reverts without changing
  canonical state.
- One-contract IC track with direct status/read integration.

### Out Of Scope

- Legal adjudication, damages, or trespass claims.
- Private server logs, authenticated dashboards, screenshots, cookies, or
  private user data.
- Arbitrary web search, unbounded crawl, POST side effects, or hidden pages.
- Treating `robots.txt` as access authorization; it is a policy signal for this
  agreed bond protocol.
- Project-track browser-wallet lifecycle unless separately proven.
- A consumer guard contract only for show.

## State Model

### Stable IDs

- `agent_id`: 1-64 ASCII characters, unique forever.
- `case_id`: 1-64 ASCII characters, unique forever.
- `verdict_id`: `verdict-{case_id}-{attempt}`.
- `origin`: scheme + host + optional port, normalized lowercase host.

### Structured Storage

`Agent`:

```text
agent_id
operator
user
user_agent
origin
policy_url
allowed_purpose
operator_bond
minimum_challenge_bond
penalty_amount
status                      DRAFT | ACTIVE | QUARANTINED | PENDING_REVIEW | CLOSED
accepted
active_case_id
case_count
close_proposed_by
```

`AccessCase`:

```text
case_id
agent_id
opened_by
target_url
receipt_url
challenge_bond
status                      OPEN | RETRYABLE | RESOLVED
attempt_count
verdict_id
bond_settled
```

`Verdict`:

```text
verdict_id
case_id
agent_id
target_url
applicability               COMPLIANT | MATERIAL_VIOLATION | UNVERIFIABLE
source_coverage             SUFFICIENT | PARTIAL | FAILED
violation_type              DISALLOWED_PATH | USER_AGENT_MISMATCH |
                            POLICY_SCOPE_BREACH | RECEIPT_INSUFFICIENT | NONE
required_action             KEEP_ACTIVE | QUARANTINE_AND_CREDIT | PAUSE_AND_RETRY
matched_fact_ids[]
rationale
previous_agent_status
new_agent_status
user_credit_amount
operator_credit_amount
attempt
```

`Accounting`:

```text
credits[address]
total_locked_operator_bonds
total_locked_challenge_bonds
total_withdrawable_credits
```

### State Machine

```text
[ABSENT] --create_agent/operator + bond--> [DRAFT]
[DRAFT] --accept_agent/user--> [ACTIVE]
[ACTIVE] --open_access_case/challenger + bond--> [CASE_OPEN]
[CASE_OPEN] --COMPLIANT finalized--> [ACTIVE + operator challenge credit]
[CASE_OPEN] --MATERIAL_VIOLATION finalized--> [QUARANTINED + user/challenger credit]
[ACTIVE|QUARANTINED] --bilateral close/no open case--> [CLOSED]
```

### Illegal Transitions

- Accepting a missing, already accepted, closed, or quarantined draft.
- Changing `origin`, `user_agent`, policy, bonds, or penalty after acceptance.
- Opening a case before acceptance or while another case is active.
- Opening duplicate case IDs.
- Adjudicating a resolved case.
- Retrying a case that is not retryable.
- Settling the same case twice.
- One party accepting its own close proposal.
- Withdrawing another address's credit.

### Authorization

- `create_agent`: caller becomes operator.
- `accept_agent`: designated user only.
- `open_access_case`: permissionless with sufficient challenge bond.
- `adjudicate_case`: permissionless after case open.
- `retry_case`: operator, user, or original opener.
- `propose_close` and `accept_close`: operator/user, distinct callers.
- `withdraw_credit`: caller's own credit only.

### Idempotency And Double-action Prevention

- Permanent uniqueness maps for agents, cases, and verdicts.
- One active case per agent.
- `bond_settled` on each case.
- Append-only attempt history.
- Ledger debit before external transfer.
- Close runs once and only with no open adjudication.

## Evidence Policy

- **Authoritative sources:** RFC 9309 behavior rules, origin `robots.txt`,
  optional locked policy URL, and public action/cure receipt URLs.
- **Allowed schemes/domains/paths:** `robots.txt` is derived from agent origin;
  policy and receipt URLs must be HTTPS, bounded, and under accepted host/path
  prefixes.
- **Time/window rules:** receipt timestamp must be after agent acceptance and
  before case open; cure receipt after violation verdict.
- **Size/count bounds:** at most three fetches per adjudication; each decoded
  payload <= 12,000 characters; fact arrays <= 9 IDs.
- **Missing evidence:** missing receipt or target URL mismatch fails closed
  without writing a verdict.
- **Contradictory evidence:** policy/receipt conflict on critical fields fails
  closed without settlement.
- **Unavailable source:** source fetch failure causes no canonical status or
  credit change.
- **Prompt-injection boundary:** fetched content is data; it cannot add
  domains, enums, beneficiaries, actions, fetches, or policy scope.
- **Private evidence excluded:** server logs behind auth, screenshots, browser
  history, and private analytics cannot influence verdict.

## Consensus Design

### Leader Task

- Inputs: immutable agent state, case target URL, receipt URL, origin, policy
  URL, user-agent, and fixed enums.
- Fetch: derived `{origin}/robots.txt`, optional policy URL, receipt URL.
- Extraction: compact allow/disallow candidates around the target path and
  validate receipt target URL/method/user-agent fields.
- Normalization: derive target path, coverage, violation type, fact IDs, and
  action.
- Structured output: fixed JSON with critical fields below.

### Consensus-critical Fields

| Field | Type/bounds | Comparison rule | Why critical |
| --- | --- | --- | --- |
| `agent_id` | exact string | Exact | Prevent cross-agent updates |
| `case_id` | exact string | Exact | Prevent wrong case settlement |
| `target_url` | normalized URL | Exact | Defines action under review |
| `applicability` | enum | Exact | Drives status and settlement |
| `source_coverage` | enum | Exact | Distinguishes retry from slash |
| `violation_type` | enum | Exact | Explains policy breach class |
| `required_action` | enum | Exact derived | Drives consequence |
| `matched_fact_ids` | sorted enum set <= 9 | Exact | Shows decisive evidence |

Rationale must be bounded and grounded but may differ in wording.

### Validator

Validators independently repeat bounded fetch/extraction. They reject leader
output if IDs differ, target URL is outside case input, action does not match
verdict, unknown enums/facts appear, rationale invents policy, or a valid JSON
shape has different critical meaning.

Protocol `UNDETERMINED` is not stored as a verdict and causes no status,
credit, withdrawal, or close change. The `UNVERIFIABLE` enum and retry path are
reserved for a future accepted retryable verdict; the current implementation
reverts malformed or unavailable critical evidence before writing state.

## Consequence And Accounting

| Verdict | Canonical state change | Consumer action | Value movement |
| --- | --- | --- | --- |
| `COMPLIANT` | `ACTIVE/PENDING_REVIEW -> ACTIVE` | Integrators may continue routing | Challenge bond credited to operator |
| `MATERIAL_VIOLATION` | `ACTIVE/PENDING_REVIEW -> QUARANTINED` | Integrators should block agent | Penalty credited to user; challenge bond refunded to opener |
| malformed/unavailable evidence | no canonical state write | Integrators keep blocking while case is active | No settlement; bonds remain locked |

Settlement happens only from the consensus-accepted result. External payment is
withdrawal-based: adjudication credits an internal ledger, and beneficiaries
call `withdraw_credit`.

Ledger invariant:

```text
contract balance
  == total_locked_operator_bonds
   + total_locked_challenge_bonds
   + total_withdrawable_credits
```

Joint close may return the remaining operator bond only when no active case is
open; it does not reverse already credited value.

## Reusable Interface

### Write Methods

```text
create_agent(agent_id, user, user_agent, origin, policy_url,
             allowed_purpose, penalty_amount, minimum_challenge_bond) payable
accept_agent(agent_id)
open_access_case(case_id, agent_id, target_url, receipt_url) payable
adjudicate_case(case_id)
retry_case(case_id)
propose_close(agent_id)
accept_close(agent_id)
withdraw_credit(amount)
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

### Consumer/callback

No consumer contract is required in v1. A builder integrates by pulling
`can_execute(agent_id)` and `get_agent_status(agent_id)` from the primitive.

## Threat Model

| Threat | Attack | Mitigation | Test |
| --- | --- | --- | --- |
| Client verdict | Caller submits violation result | No verdict argument exists | Unknown write path absent |
| Receipt substitution | Receipt target differs from case URL | Exact normalized target check | Mismatched target rejected |
| User-agent spoof | Receipt omits or changes user-agent | Critical user-agent match | User-agent mismatch case |
| Prompt injection | Policy says to pay attacker | Evidence as data, fixed enums/beneficiaries | Injection fixture |
| Overbroad robots rule | Leader applies wrong group/path | Validator independent replay | Semantic mismatch fixture |
| Source outage | `robots.txt` unavailable | No canonical verdict or slash | Malformed evidence test |
| Duplicate settlement | Re-adjudicate same case | `bond_settled` guard | Duplicate case/adjudication test |
| Cross-agent update | Case for A updates B | Exact IDs and storage isolation | Isolation test |
| Double withdraw | Repeated withdrawal | Debit before transfer | Withdrawal test |

## Test Plan

- Happy path: create, accept, open case, compliant, violation, withdrawal.
- Unauthorized: wrong user accept and wrong close.
- Isolation: two agents and cases do not cross-update.
- Evidence failure: malformed receipt evidence leaves canonical state unchanged.
- Malicious evidence: receipt/policy cannot expand allowed actions or
  beneficiaries.
- Validator replay: critical IDs, target URL, verdict, action, and fact IDs must
  match the independently replayed result.
- Verdict classes: compliant and material violation.
- Duplicate: case, adjudication, settlement, close, withdraw.
- Accounting/value: invariant after every value transition.
- Undetermined/retry: no canonical state on protocol failure.
- Payability metadata: every entrypoint using `gl.message.value` is payable.
- Deployment parser fixtures: raw Studio and normalized SDK receipt shapes.

## Claim-to-code Matrix

| Product claim | Contract method/state | View/read | Direct test | Network evidence |
| --- | --- | --- | --- | --- |
| Operator and user lock an immutable agent access mandate | `create_agent`, `accept_agent`, `Agent.accepted` | `get_agent` | Config lock and auth tests | Activation tx + agent view |
| Validators decide policy compliance from public evidence | `adjudicate_case` nondeterministic evaluation | `get_verdict` | compliant/violation + malformed evidence tests | Finalized adjudication tx + verdict view |
| Violation quarantines agent identity | `MATERIAL_VIOLATION` transition | `get_agent_status`, `can_execute` | Violation state test | Before/after status reads |
| Bond settlement is deterministic and bounded | case settlement ledger | `get_credit`, `get_accounting` | Accounting invariant tests | Credit/withdrawal receipt + balance delta |
| Bad evidence fails closed without slash | evidence validation inside `adjudicate_case` | `get_case`, `get_agent_status` | Malformed receipt test | Failed/undetermined tx + unchanged reads |
| Builder can integrate without copying judgment logic | status/can-execute views | `can_execute` | Read path tests | Deployed view read evidence |

## Analogue And Differentiation Matrix

| Analogue/prior idea | Similar dimensions | Structural difference | Collision decision |
| --- | --- | --- | --- |
| IDEA-001 Semantic Interface Covenant | bond, incident, status consequence | API compatibility vs agent access receipt/policy; provider/integrator vs operator/user/site owner | Not a collision |
| IDEA-002 MandateLock | bilateral mandate and breach | governance vote/proposal vs web-access action receipt | Not a collision |
| IDEA-003 RecallBond | public source and quarantine | product recall/remedy vs agent identity/access and robots/policy evidence | Not a collision |
| Generic web compliance oracle | web policy plus pass/fail | fixed agent access protocol, bonded state machine, direct status/accounting | Generic oracle rejected |
| AI arbitration/escrow | dispute plus payout | no arbitrary winner or free-form damages; fixed facts/actions | Not a generic escrow |

## Deployment And Evidence Plan

- **Network:** Studionet first.
- **Actors/wallet separation:** operator primary wallet and distinct user or
  challenger wallet when authorized by local `.env`; keys never printed.
- **Verified deploy steps:** inspected config, deployed AgentAccessBond,
  activated agent, opened case, adjudicated, read views, and withdrew credit.
- **Consequential lifecycle:** use a public test origin/receipt controlled by
  the project or stable public fixtures that validators can fetch.
- **Canonical reads:** agent, case, verdict, credit, accounting, and
  `can_execute` before/after.
- **Balance/receipt proof:** withdrawal receipt and public balance delta for
  any credited value.
- **Evidence path:** `docs/evidence/studionet/deployment.json`.
- **Resume/idempotency:** deployment script reads existing evidence and
  canonical state before every write.

## Implementation Status

Fresh local verification on 2026-07-27:

- `npm run check` passed.
- `AgentAccessBond` contract lint and validation passed.
- Contract count: 1 (`contracts/agent_access_bond.py`).
- Public methods: 15 total, 7 view and 8 write.
- Direct tests: 11 passed.
- Deployment parser tests: 3 passed.
- Frontend TypeScript checks and build passed.
- Local Python environment used Python 3.13.14 because Python 3.12 was not
  available through the local launcher; this is local verification evidence, not
  Studionet evidence.

Studionet verification on 2026-07-27:

- Active contract:
  `0x4D2827F1BC7C4678DD439eea52de3340Ae9054Bd`.
- Deploy tx:
  `0xcf421b8b9da7fd865056e7f30fd33de09aff2ab1c0251de6534037a6e95b9329`.
- Violation adjudication tx:
  `0x6a528a073838ef3d7576a439870faa49b4ff8444445d5ba3f2108d1e415c572e`.
- Withdrawal tx:
  `0x3854f5c69e069cb97b53e9ad8dd64da8a38ca92b61be71337abf786711d497d7`.
- Canonical reads show verdict `MATERIAL_VIOLATION`, status `QUARANTINED`,
  `can_execute=false`, and remaining user credit `0` after withdrawal.
- Evidence packet:
  `docs/evidence/studionet/deployment.json`.

Still unclaimed:

- Browser-wallet project-track evidence.
- External adoption.

## Definition Of Done

### Intelligent Contracts

- [x] Reusable one-contract primitive.
- [x] Validator-replayed judgment over public policy/receipt evidence.
- [x] Direct status and value consequence.
- [x] Pull-based integration views.
- [x] Direct tests, metadata checks, and parser fixtures.
- [x] `npm run check` pass locally.
- [x] Studionet deploy and consequential lifecycle.
- [x] Canonical evidence packet.
- [x] Public CI.
- [ ] Submission fields.

### Projects, if selected

Not selected. Browser-wallet write and full agent marketplace UI are out of
scope unless separately proven.

## Honest Limitations

- `robots.txt` is an agreed policy signal in this bond protocol, not legal
  access authorization.
- V1 only uses public receipts and public policies; private server logs are
  excluded.
- A public receipt can prove what it states only to the extent validators can
  inspect it; cryptographic runner attestations are future work.
- Integrators must call the primitive views before routing; the contract cannot
  block every offchain agent by itself.
- No browser-wallet or external adoption evidence is claimed until captured.

## Kill Criteria

- Public receipts are not stable/fetchable enough for validators.
- Public policy evidence becomes too large or inconsistent for bounded
  validator replay.
- A private log or centralized runner becomes required.
- The verdict does not directly control status or value.
- Validators cannot converge on the fixed critical-field schema.
- A structurally equivalent public GenLayer project is found.
