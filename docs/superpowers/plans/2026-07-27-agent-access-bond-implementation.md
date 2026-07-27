# AgentAccessBond Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a one-contract GenLayer Intelligent Contract primitive that adjudicates public agent web-access receipts against locked site policy and settles bonded agent status.

**Architecture:** One `AgentAccessBond` contract owns agent status, access cases, verdict history, cure history, and ledger accounting. Direct tests drive deterministic state transitions first, then mocked nondeterministic verdict normalization/equivalence, then metadata and deployment parser checks.

**Tech Stack:** Python 3.12, current `py-genlayer` Depends header, `genlayer-test` direct mode, `genvm-linter`, Node test runner for deployment parser fixtures, TypeScript frontend read helper.

## Global Constraints

- Windows-first; use repository `.venv` and keep `PYTHONUTF8=1` for GenVM lint.
- Do not copy football/sample boilerplate into public source.
- One production contract in `contracts/agent_access_bond.py`.
- No production code before a failing direct test.
- No network, deployment, address, balance, or CI claim without fresh evidence.
- No `.env`, private key, wallet export, AGENTS/CLAUDE, source-notes, research, playbook, or master prompt in public repo.
- V1 uses pull-based integration views only; no consumer guard contract.

---

## File Structure

- `contracts/agent_access_bond.py`: production GenLayer contract, state machine, nondeterministic adjudication, accounting, views.
- `tests/direct/conftest.py`: direct-mode helpers and fake callers.
- `tests/direct/test_agent_access_lifecycle.py`: create/accept/case/verdict/status tests.
- `tests/direct/test_agent_access_accounting.py`: bond, credit, close, withdraw, invariant tests.
- `tests/direct/test_agent_access_adversarial.py`: prompt injection, malicious leader, semantic mismatch, evidence failure tests.
- `tests/direct/test_agent_access_payability.py`: AST check for payable value entrypoints.
- `tests/scripts/deployment-receipt.test.mjs`: raw Studio and normalized receipt parser fixtures.
- `scripts/deployment/receipt-parser.mjs`: safe receipt extraction helper.
- `scripts/check.ps1`: full local verification.

### Task 1: Deterministic Agent Lifecycle

**Files:**
- Create: `tests/direct/conftest.py`
- Create: `tests/direct/test_agent_access_lifecycle.py`
- Create: `contracts/agent_access_bond.py`

**Interfaces:**
- Produces: `AgentAccessBond.create_agent`, `accept_agent`, `get_agent`, `get_agent_status`, `can_execute`.

- [ ] **Step 1: Write the failing lifecycle test**

```python
def test_operator_and_user_activate_immutable_agent(contract, as_operator, as_user):
    as_operator()
    contract.create_agent(
        "agent-alpha",
        "0x00000000000000000000000000000000000000b2",
        "AgentAccessBot/1.0",
        "https://example.com",
        "https://example.com/agent-policy",
        "research only",
        100,
        10,
        value=500,
    )

    draft = contract.get_agent("agent-alpha")
    assert draft["status"] == "DRAFT"
    assert draft["operator_bond"] == 500

    as_user()
    contract.accept_agent("agent-alpha")

    active = contract.get_agent("agent-alpha")
    assert active["accepted"] is True
    assert active["status"] == "ACTIVE"
    assert contract.get_agent_status("agent-alpha") == "ACTIVE"
    assert contract.can_execute("agent-alpha") is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv\Scripts\python.exe -m pytest tests/direct/test_agent_access_lifecycle.py::test_operator_and_user_activate_immutable_agent -q`
Expected: FAIL because `contracts.agent_access_bond` or `AgentAccessBond` is missing.

- [ ] **Step 3: Implement minimal lifecycle code**

Create `AgentAccessBond` with stable agent storage, value check, user authorization, and status views.

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv\Scripts\python.exe -m pytest tests/direct/test_agent_access_lifecycle.py::test_operator_and_user_activate_immutable_agent -q`
Expected: PASS.

### Task 2: Cases, Verdicts, And Direct Consequence

**Files:**
- Modify: `tests/direct/test_agent_access_lifecycle.py`
- Modify: `contracts/agent_access_bond.py`

**Interfaces:**
- Consumes: lifecycle methods from Task 1.
- Produces: `open_access_case`, `adjudicate_case`, `retry_case`, `get_case`, `get_verdict`, `get_case_verdict_ids`.

- [ ] **Step 1: Write failing verdict tests**

Add tests for `COMPLIANT`, `MATERIAL_VIOLATION`, and `UNVERIFIABLE` using deterministic mocked verdict injection in direct mode.

- [ ] **Step 2: Run tests to verify failure**

Run: `.venv\Scripts\python.exe -m pytest tests/direct/test_agent_access_lifecycle.py -q`
Expected: FAIL because case/verdict methods are missing.

- [ ] **Step 3: Implement minimal case and verdict transitions**

Implement one active case per agent, append-only verdict IDs, status transitions, and retry after `UNVERIFIABLE`.

- [ ] **Step 4: Run tests to verify pass**

Run: `.venv\Scripts\python.exe -m pytest tests/direct/test_agent_access_lifecycle.py -q`
Expected: PASS.

### Task 3: Accounting And Close

**Files:**
- Create: `tests/direct/test_agent_access_accounting.py`
- Modify: `contracts/agent_access_bond.py`

**Interfaces:**
- Produces: `get_credit`, `get_accounting`, `withdraw_credit`, `propose_close`, `accept_close`.

- [ ] **Step 1: Write failing accounting tests**

Test locked operator bond, challenge bond, violation credit, compliant challenge credit, no slash on unverifiable, bilateral close, and duplicate withdrawal rejection.

- [ ] **Step 2: Run tests to verify failure**

Run: `.venv\Scripts\python.exe -m pytest tests/direct/test_agent_access_accounting.py -q`
Expected: FAIL because accounting methods are missing or incomplete.

- [ ] **Step 3: Implement ledger and close transitions**

Implement credit buckets and invariant-preserving settlement with debit-before-transfer withdrawal.

- [ ] **Step 4: Run tests to verify pass**

Run: `.venv\Scripts\python.exe -m pytest tests/direct/test_agent_access_accounting.py -q`
Expected: PASS.

### Task 4: Adversarial Evidence And Equivalence

**Files:**
- Create: `tests/direct/test_agent_access_adversarial.py`
- Modify: `contracts/agent_access_bond.py`

**Interfaces:**
- Produces internal helpers for normalized verdict validation and semantic equivalence.

- [ ] **Step 1: Write failing adversarial tests**

Cover malformed evidence, prompt injection, unknown enum/fact IDs, leader changes IDs, valid JSON with different critical meaning, and protocol-level failure leaving state unchanged.

- [ ] **Step 2: Run tests to verify failure**

Run: `.venv\Scripts\python.exe -m pytest tests/direct/test_agent_access_adversarial.py -q`
Expected: FAIL until validator/equivalence helpers exist.

- [ ] **Step 3: Implement normalization and nondeterministic boundary**

Add bounded fetch/prompt structure, fixed schema, leader result normalization, independent validator replay, and strict critical-field comparison.

- [ ] **Step 4: Run tests to verify pass**

Run: `.venv\Scripts\python.exe -m pytest tests/direct/test_agent_access_adversarial.py -q`
Expected: PASS.

### Task 5: Runtime Metadata And Deployment Parser

**Files:**
- Create: `tests/direct/test_agent_access_payability.py`
- Create: `scripts/deployment/receipt-parser.mjs`
- Create: `tests/scripts/deployment-receipt.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `extractExecutionResult(receipt)` for safe parser use.

- [ ] **Step 1: Write failing payability and parser tests**

Assert every method reading `gl.message.value` has `@gl.public.write.payable`, and parser handles raw Studio plus normalized SDK receipt shapes.

- [ ] **Step 2: Run tests to verify failure**

Run: `.venv\Scripts\python.exe -m pytest tests/direct/test_agent_access_payability.py -q; node --test tests/scripts/deployment-receipt.test.mjs`
Expected: FAIL before parser/metadata implementation.

- [ ] **Step 3: Implement parser and fix decorators**

Add safe allowlisted receipt extraction and payable decorators.

- [ ] **Step 4: Run tests to verify pass**

Run: `.venv\Scripts\python.exe -m pytest tests/direct/test_agent_access_payability.py -q; node --test tests/scripts/deployment-receipt.test.mjs`
Expected: PASS.

### Task 6: Full Local Verification And Docs Sync

**Files:**
- Modify: `docs/README.md`
- Modify: `README.md`
- Modify: `docs/evidence/studionet/deployment.json` only after real network evidence exists.

**Interfaces:**
- Consumes: all previous tasks.

- [ ] **Step 1: Run full local verification**

Run: `npm run check`
Expected: contract lint, direct tests, deployment parser tests, frontend typecheck, and build pass.

- [ ] **Step 2: Sync docs to verified facts**

Update exact test count and status only from command output. Keep network evidence as pending unless real Studionet lifecycle has been captured.

- [ ] **Step 3: Public tree audit**

Run: `git rev-parse --show-toplevel`, `git status --short`, `git ls-files`.
Expected: Git root is `D:\Genlayer\agent-access-bond`; no forbidden internal files.

## Self-review

- Spec coverage: tasks cover lifecycle, evidence, equivalence, consequence, accounting, runtime metadata, parser fixtures, docs sync, and verification.
- Placeholder scan: no `TBD`, `TODO`, or blank task deliverables remain.
- Type consistency: method names match `docs/README.md` public interface.

