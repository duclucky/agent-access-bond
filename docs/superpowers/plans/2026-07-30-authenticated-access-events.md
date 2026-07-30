# Authenticated Access Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require signed, version-bound access attestations before slashing and expose the complete contract case lifecycle in the production frontend.

**Architecture:** The contract verifies a registered secp256k1 runner key and a canonical event payload before validators inspect versioned policy evidence. The React context remains the single transaction boundary and exposes status-aware retry and bilateral cancellation writes.

**Tech Stack:** Python 3.12, py-genlayer/GenVM, gltest direct mode, React 19, TypeScript, Vite, Vitest, genlayer-js 1.1.8.

## Global Constraints

- One contract remains the only canonical state owner.
- No local storage or client-computed verdict is canonical.
- Missing or invalid attestation must not slash or settle any bond.
- Exact contract enums must be preserved across the frontend boundary.
- Every browser write must track submitted, accepted, finalized, and failed states.
- Run `npm run check` before deployment.

---

### Task 1: Signed Attestation Gate

**Files:**
- Modify: `contracts/agent_access_bond.py`
- Modify: `tests/direct/test_agent_access_lifecycle.py`
- Create: `tests/direct/test_access_attestation.py`

**Interfaces:**
- Consumes: the existing `create_agent`, `open_access_case`, and `adjudicate_case` lifecycle.
- Produces: `attestor_public_key`, `event_id`, `_canonical_event_payload`, `_verify_event_signature`, and version-bound verdict fields.

- [ ] **Step 1: Write failing direct tests**

Add tests proving a correctly signed event can reach `MATERIAL_VIOLATION`, while
tampered payloads, wrong public keys, duplicate event IDs, and policy/robots
hash mismatches produce no slash.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `.venv\Scripts\python.exe -m pytest tests/direct/test_access_attestation.py -q`

Expected: failures because the new create/case arguments and verifier do not exist.

- [ ] **Step 3: Implement canonical payload and secp256k1 verification**

Use Keccak-256 from `py-genlayer`, validate an uncompressed public key, verify
low-s compact ECDSA signatures, and compare the registered key with the signed
receipt key.

- [ ] **Step 4: Bind version sources and guard settlement**

Fetch the signed policy and robots URLs, compare their Keccak-256 hashes, expose
the attestation metadata in the verdict, and require verified attestation before
the material-violation accounting branch.

- [ ] **Step 5: Run focused and complete direct tests**

Run: `.venv\Scripts\python.exe -m pytest tests/direct -q`

Expected: all direct tests pass.

### Task 2: Exact Frontend Contract Schema

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/context/ContractContext.tsx`
- Modify: `frontend/src/context/ContractContext.test.tsx`
- Modify: `frontend/src/presentation.ts`
- Modify: `frontend/src/presentation.test.ts`
- Modify: `frontend/src/components/RegisterAgentView.tsx`
- Modify: `frontend/src/components/RegisterAgentView.test.tsx`
- Modify: `frontend/src/components/ReviewCasesView.tsx`

**Interfaces:**
- Consumes: the revised contract records and method arguments from Task 1.
- Produces: exact `CANCELED` case status, exact violation enums, registration attestor input, and challenge event ID input.

- [ ] **Step 1: Write failing frontend mapping and form tests**

Assert that `CANCELED`, `USER_AGENT_MISMATCH`, `POLICY_SCOPE_BREACH`, and
`RECEIPT_INSUFFICIENT` survive canonical normalization and that required
attestor/event fields are sent to writes.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `npm --workspace frontend test -- src/context/ContractContext.test.tsx src/components/RegisterAgentView.test.tsx`

Expected: enum and argument assertions fail.

- [ ] **Step 3: Implement exact types, adapters, and fields**

Remove frontend-only violation enums and synthetic verdict timestamps/signature
counts. Map canonical attestation fields and send revised contract arguments.

- [ ] **Step 4: Run frontend tests**

Run: `npm --workspace frontend test`

Expected: all frontend tests pass.

### Task 3: Retry and Bilateral Case Cancellation UI

**Files:**
- Modify: `frontend/src/context/ContractContext.tsx`
- Modify: `frontend/src/context/ContractContext.test.tsx`
- Modify: `frontend/src/components/ReviewCasesView.tsx`
- Modify: `frontend/src/components/AgentDetailView.tsx`
- Modify: `frontend/src/live-ui.test.tsx`

**Interfaces:**
- Consumes: canonical case status, `cancel_proposed_by`, connected wallet, and the common `sendWrite` finality path.
- Produces: `retryCase(caseId)`, `proposeCaseCancel(caseId)`, and `acceptCaseCancel(caseId)` plus role/status-aware buttons.

- [ ] **Step 1: Write failing transaction and visibility tests**

Assert `RETRYABLE` exposes retry to a case party, unresolved cases expose a
cancel proposal to operator/opener, and a pending proposal exposes acceptance
only to the other party.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm --workspace frontend test -- src/context/ContractContext.test.tsx src/live-ui.test.tsx`

Expected: methods and controls are absent.

- [ ] **Step 3: Implement context writes and controls**

Route all three methods through `sendWrite`, refresh the agent and case after
finality, and disable controls while a transaction is pending.

- [ ] **Step 4: Run frontend tests**

Run: `npm --workspace frontend test`

Expected: all frontend tests pass.

### Task 4: Deployment, Evidence, and Submission Documentation

**Files:**
- Modify: `scripts/deploy-agent-access-bond-studionet.mjs`
- Modify: `tests/scripts/deployment-receipt.test.mjs`
- Modify: `docs/evidence/public-fixtures/case-1-receipt.json`
- Modify: `README.md`
- Modify: `docs/README.md`
- Update: `docs/evidence/studionet/deployment.json`
- Update: `docs/evidence/studionet/frontend-hosting.json`

**Interfaces:**
- Consumes: the revised contract source, deployment identity rules, and the production Vercel project.
- Produces: one active Studionet revision, canonical smoke evidence, production frontend deployment, and reviewer-response documentation.

- [ ] **Step 1: Update deployment/parser tests and fixtures**

Add only allowlisted attestation and version fields to projected public evidence.

- [ ] **Step 2: Run the full release gate**

Run: `npm run check`

Expected: contract lint, direct tests, deployment tests, frontend tests,
TypeScript, and production build all pass.

- [ ] **Step 3: Deploy a new Studionet revision**

Run the revision-aware deployment script using the authorized ignored `.env`,
then read back the deployed contract identity without printing secrets or raw
receipts.

- [ ] **Step 4: Point and deploy the frontend**

Update the public contract address, build the exact committed source, deploy to
the existing Vercel project, and verify the production bundle and UI.

- [ ] **Step 5: Record safe evidence and update README**

Document signer trust, canonical payload, version binding, no-slash failure
behavior, retry/cancellation instructions, active addresses, and honest network
limits.

- [ ] **Step 6: Re-run checks and public-repository hygiene**

Run `npm run check`, inspect `git status --short`, staged files, tracked public
files, and secret patterns before pushing.

