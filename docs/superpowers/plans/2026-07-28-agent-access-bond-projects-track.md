# AgentAccessBond Projects Track Implementation Plan

## Execution Record

Implemented and locally verified:

- fail-fast Windows release gate and reliable GenVM linter invocation;
- semantic `gl.vm.run_nondet` adjudication with deterministic consequence
  derivation and bilateral case recovery;
- revision-aware deployment/recovery scripts and safe evidence projection;
- operational React wallet application with canonical refresh and transaction
  state handling;
- Studionet revision
  `0x37826aA6a75F033D67169b2F8D2616382Ca06522`, which finalized a material
  violation, quarantine, credit, and withdrawal.

Intentionally pending:

- browser-wallet signed evidence;
- production frontend hosting;
- current-revision public CI and external adoption.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade AgentAccessBond into a verified Projects-track product with validator-controlled semantic adjudication, a real Studionet wallet frontend, revision-safe evidence, and fail-fast checks.

**Architecture:** Keep one contract as the enforcement boundary. Add semantic LLM classification inside `gl.vm.run_nondet`, expose it through a React/Vite dApp using `genlayer-js`, and preserve deployment/browser evidence as separate revision-bound artifacts.

**Tech Stack:** Python 3.12, py-genlayer Depends runner `1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`, genlayer-test, genvm-linter, Node.js 24, TypeScript 5.8, React 19, Vite 7, Vitest, genlayer-js 1.1.8.

## Global Constraints

- Submission category is `Projects`.
- Keep exactly one contract unless an independent ownership or enforcement boundary is discovered.
- Every `TreeMap` key is `str`.
- Use `gl.vm.run_nondet(leader_fn, validator_fn)` with semantic comparison; rationale wording is non-critical.
- All web and LLM calls remain inside the nondeterministic function.
- Frontend writes require a browser wallet and Studionet; no private keys or simulated finality.
- A contract source change requires a new active Studionet revision before network claims are restored.
- `npm run check` must stop on the first failing command.

---

### Task 1: Fail-Fast Verification

**Files:**
- Create: `tests/scripts/check-script.test.mjs`
- Modify: `scripts/check.ps1`
- Modify: `package.json`

**Interfaces:**
- Consumes: PowerShell native command exit codes.
- Produces: `Invoke-CheckedNpmScript([string] $Name)` and `npm run test:check-script`.

- [ ] **Step 1: Write the failing regression test**

Create a Node test that copies `scripts/check.ps1` to a temporary directory,
provides a fake `npm.cmd` that exits `17` for `lint:contracts`, invokes the
script, and asserts the process exits `17` without running later scripts.

```js
test("check.ps1 stops at the first failed npm script", () => {
  const result = spawnSync("pwsh", ["-NoProfile", "-File", checkScript], {
    cwd: fixtureRoot,
    env: { ...process.env, PATH: `${fixtureBin};${process.env.PATH}` },
    encoding: "utf8"
  });
  assert.equal(result.status, 17);
  assert.deepEqual(readFileSync(logPath, "utf8").trim().split(/\r?\n/), [
    "lint:contracts"
  ]);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/scripts/check-script.test.mjs`
Expected: FAIL because the current script continues and exits with the final
subcommand status.

- [ ] **Step 3: Implement fail-fast execution**

```powershell
function Invoke-CheckedNpmScript {
  param([Parameter(Mandatory = $true)][string] $Name)
  & npm.cmd run $Name
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}
```

Call it in order for `lint:contracts`, `test:direct`, `test:deployment`,
`test:check-script`, `test:frontend`, `lint`, and `build`. Prevent recursive
execution in the fixture test with `AGENT_ACCESS_BOND_SKIP_CHECK_TEST=1`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/scripts/check-script.test.mjs`
Expected: PASS with one test.

- [ ] **Step 5: Run script tests**

Run: `npm run test:deployment`
Expected: all deployment/check script tests pass.

---

### Task 2: Semantic Contract Adjudication

**Files:**
- Modify: `tests/direct/test_agent_access_lifecycle.py`
- Modify: `tests/direct/test_agent_access_accounting.py`
- Create: `tests/direct/test_agent_access_semantics.py`
- Modify: `tests/direct/test_agent_access_payability.py`
- Modify: `contracts/agent_access_bond.py`

**Interfaces:**
- Consumes: bounded robots, policy, and receipt sources.
- Produces: normalized `Verdict` records and string-keyed `get_credit(account)`.

- [ ] **Step 1: Write AST/storage and semantic RED tests**

Add assertions that:

```python
assert contract_class.name == "AgentAccessBond"
assert "TreeMap[str, u256]" in contract_source
assert "gl.nondet.exec_prompt" in contract_source
assert "gl.vm.run_nondet(" in contract_source
assert "run_nondet_unsafe" not in contract_source
```

`genvm-linter 0.10.0` excludes a class literally named `Contract` while
reflecting the contract schema, so the existing explicit class name remains the
verified compatibility choice for this pinned toolchain.

Add direct tests proving unknown fact IDs are discarded, fact IDs are sorted,
invalid applicability/action combinations revert, prompt-injection source text
cannot expand enums, and validator replay ignores rationale wording but rejects
changed consensus-critical fields.

- [ ] **Step 2: Verify RED**

Run:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/direct/test_agent_access_semantics.py tests/direct/test_agent_access_payability.py -q
```

Expected: FAIL on missing LLM call, unsafe nondet API, address-keyed credits, and
class naming.

- [ ] **Step 3: Implement semantic leader evaluation**

Keep the linter-compatible `AgentAccessBond` class name and normalize credit
keys with:

```python
def _address_key(value: Address) -> str:
    return str(Address(value)).lower()
```

Build a bounded prompt containing only the allowed enums, deterministic entity
context, and delimited untrusted evidence. Call:

```python
raw = gl.nondet.exec_prompt(prompt, response_format="json")
return self._normalize_access_result(raw, agent, case)
```

Derive `required_action` inside contract code rather than trusting model output.
Normalize `matched_fact_ids` from either a list or comma-separated string,
discard unknown IDs, and require the fact set needed by each verdict class.

- [ ] **Step 4: Implement semantic validator replay**

Use `gl.vm.run_nondet(evaluate, validator_fn)`. The validator accepts only a
`glvm.Return`, normalizes the proposed calldata, independently re-runs
`evaluate`, and compares:

```python
CONSENSUS_FIELDS = (
    "agent_id",
    "case_id",
    "target_url",
    "applicability",
    "source_coverage",
    "violation_type",
    "required_action",
    "matched_fact_ids",
)
```

Do not compare rationale text.

- [ ] **Step 5: Verify GREEN and accounting compatibility**

Run:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/direct -q
```

Expected: all direct tests pass, including all three verdict classes, retry,
settlement, close, isolation, and withdrawal.

- [ ] **Step 6: Verify contract lint**

Run:

```powershell
$env:PYTHONUTF8 = "1"
.\.venv\Scripts\genvm-lint.exe check contracts\agent_access_bond.py
```

Expected: exit `0` with no contract lint failures.

---

### Task 3: Revision-Safe Deployment Tooling

**Files:**
- Create: `scripts/deployment/revision-evidence.mjs`
- Create: `tests/scripts/revision-evidence.test.mjs`
- Modify: `scripts/deploy-agent-access-bond-studionet.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: current source commit, contract SHA-256, Depends hash, previous evidence.
- Produces: `deploymentIdentity()`, `archiveSupersededEvidence()`, and one active manifest.

- [ ] **Step 1: Write RED tests for deployment identity and archival**

Assert that an active manifest is reusable only when network, source commit,
contract source digest, and Depends hash match. Assert that a mismatch creates:

`docs/evidence/studionet/revisions/<address>/deployment.json`

with `status: "SUPERSEDED"` and `supersededReason`, while the new active
manifest starts with `status: "PENDING_DEPLOYMENT"`.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/scripts/revision-evidence.test.mjs`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement revision helpers**

Use `node:crypto` SHA-256 and `git rev-parse HEAD`. Project only public evidence
fields. Never copy raw receipts, validator configuration, stderr, or private
environment data.

- [ ] **Step 4: Make deployment resumable by identity**

At script startup:

```js
const identity = deploymentIdentity({
  rootDir: ROOT_DIR,
  contractPath: CONTRACT_PATH,
  network: "studionet"
});
const evidence = prepareActiveEvidence(EVIDENCE_PATH, identity);
```

Resume submitted/finalized transactions only when identity matches. Dynamically
read the current case attempt before deriving a verdict ID. Keep explorer base
in the active manifest and use it for all links.

- [ ] **Step 5: Verify GREEN**

Run: `npm run test:deployment`
Expected: all receipt parser and revision identity tests pass.

---

### Task 4: Frontend Domain and GenLayer Client

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/config.ts`
- Create: `frontend/src/types.ts`
- Create: `frontend/src/tx-state.ts`
- Create: `frontend/src/contract.ts`
- Create: `frontend/src/config.test.ts`
- Create: `frontend/src/tx-state.test.ts`
- Create: `frontend/src/contract.test.ts`
- Delete: `frontend/src/index.ts`

**Interfaces:**
- Produces: `loadPublicConfig`, `txReducer`, `createAgentAccessClients`,
  `readCanonicalSnapshot`, and `submitWrite`.

- [ ] **Step 1: Add frontend test/build dependencies**

Add React 19, React DOM 19, `genlayer-js` 1.1.8, Lucide React, Vite 7, Vitest,
jsdom, and React type packages. Configure `npm test -- --run`, strict TypeScript,
and Vite production build.

- [ ] **Step 2: Write RED tests for configuration and transaction states**

Test exact transitions:

```ts
idle -> submitted -> accepted -> finalized
idle -> submitted -> failed -> submitted
```

Test that malformed contract addresses and non-Studionet configuration throw
honest setup errors.

- [ ] **Step 3: Verify RED**

Run: `npm --prefix frontend test -- --run`
Expected: FAIL because the domain modules do not exist.

- [ ] **Step 4: Implement domain modules**

`txReducer` stores operation, hash, status, error, and timestamps.
`createAgentAccessClients` creates a read client with `studionet` and a write
client with `account` plus `window.ethereum`. `readCanonicalSnapshot` reads
agent, optional active case/verdict, connected-account credit, and accounting.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
npm --prefix frontend test -- --run
npm --prefix frontend run lint
```

Expected: all frontend domain tests and strict TypeScript pass.

---

### Task 5: Operational Browser Application

**Files:**
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/components/AgentWorkspace.tsx`
- Create: `frontend/src/components/TransactionActivity.tsx`
- Create: `frontend/src/components/WalletBar.tsx`
- Create: `frontend/src/styles.css`
- Create: `frontend/src/vite-env.d.ts`
- Create: `frontend/.env.example`

**Interfaces:**
- Consumes: Task 4 client and state modules.
- Produces: a usable wallet-signed Projects-track lifecycle.

- [ ] **Step 1: Write component behavior RED tests**

Add tests that action availability follows canonical status, a finalized write
calls `readCanonicalSnapshot`, a rejected signature enters `failed`, and retry
re-submits the same operation without inventing a hash.

- [ ] **Step 2: Verify RED**

Run: `npm --prefix frontend test -- --run`
Expected: FAIL because the application components do not exist.

- [ ] **Step 3: Implement wallet and network flow**

Request `eth_requestAccounts`, create the write client with the returned
address/provider, call `client.connect("studionet")`, and subscribe to
`accountsChanged` and `chainChanged`. Never persist wallet or canonical state
to local storage.

- [ ] **Step 4: Implement lifecycle actions**

Provide validated forms and buttons for `create_agent`, `accept_agent`,
`open_access_case`, `adjudicate_case`, `retry_case`, `withdraw_credit`,
`propose_close`, and `accept_close`. Wait for `ACCEPTED`, poll
`gen_getTransactionStatus` to `FINALIZED`, then refresh canonical views.

- [ ] **Step 5: Implement the operational UI**

Use a compact responsive shell, status badges, readable evidence/verdict
details, stable controls, Lucide icons, tooltips, keyboard labels, visible
loading/empty/error states, and explorer links. Avoid marketing content,
nested cards, decorative gradients, and simulated chain data.

- [ ] **Step 6: Verify UI**

Run:

```powershell
npm --prefix frontend test -- --run
npm --prefix frontend run lint
npm --prefix frontend run build
```

Expected: all tests pass, TypeScript passes, and Vite emits `frontend/dist`.

Start Vite on an available local port and inspect desktop and mobile layouts
with browser screenshots. Confirm no overlap, truncation, blank state, or
console error.

---

### Task 6: Studionet Revision and Browser Configuration

**Files:**
- Modify: `docs/evidence/studionet/deployment.json`
- Create: `docs/evidence/studionet/revisions/<old-address>/deployment.json`
- Create: `docs/evidence/studionet/browser-wallet.json`
- Create locally/ignored: `frontend/.env.local`

**Interfaces:**
- Consumes: authorized ignored `.env`, locally verified source, active commit.
- Produces: a finalized active revision manifest and public frontend config.

- [ ] **Step 1: Run the local release gate**

Run: `npm run check`
Expected: exit `0`; do not deploy on any failure.

- [ ] **Step 2: Discover authorized configuration safely**

Check only presence and non-empty status for the documented operator/user key
variables in project `.env`, then parent `.env`. Do not print values.

- [ ] **Step 3: Deploy and run a bounded lifecycle**

Run deployment commands in order:

```powershell
node scripts/deploy-agent-access-bond-studionet.mjs deploy
node scripts/deploy-agent-access-bond-studionet.mjs activate-agent
node scripts/deploy-agent-access-bond-studionet.mjs run-violation-demo
node scripts/deploy-agent-access-bond-studionet.mjs withdraw-user-credit
node scripts/deploy-agent-access-bond-studionet.mjs verify
```

Resume from evidence on transient interruption. Do not retry structural prompt,
schema, or parser failures as source outages.

- [ ] **Step 4: Configure frontend**

Write only public values to ignored `frontend/.env.local`. Build again and run a
browser-wallet smoke flow. Record browser evidence only for actions actually
signed in the browser; otherwise set `status: "PENDING_USER_WALLET_PROOF"`.

- [ ] **Step 5: Verify active evidence**

Read current canonical agent, case, verdict, credits, and accounting state.
Confirm the old revision archive has zero recoverable credit or explicitly
record its already-proven withdrawal/remaining locked operator bond.

---

### Task 7: Documentation, Hygiene, and Final Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/evidence/studionet/deployment.json`
- Modify: parent `docs/IDEA-REGISTRY.md` only if active deployment evidence is complete

**Interfaces:**
- Produces: claim-to-code/evidence mapping and copy-ready Projects-track status.

- [ ] **Step 1: Update documentation from current evidence**

State exact contract/test counts, category, active revision, source commit,
explorer links, canonical consequence, frontend capabilities, browser proof
status, and limitations. Remove every stale Intelligent Contracts or old active
revision claim.

- [ ] **Step 2: Run full verification**

Run:

```powershell
npm run check
git diff --check
git status --short
git diff --stat
git ls-files
```

Expected: full check exits `0`, no whitespace errors, and only intended public
files are tracked.

- [ ] **Step 3: Review public history and secrets**

Confirm no `.env`, private key, wallet export, root control prompt, `AGENTS.md`,
`CLAUDE.md`, raw receipt/trace, or unrelated workspace file is staged or
tracked. Confirm ignored local env files remain ignored.

- [ ] **Step 4: Review acceptance criteria**

Map each design acceptance criterion to its test, canonical read, and evidence
item. Report any external deployment, wallet, explorer, or hosting limitation
as pending rather than complete.
