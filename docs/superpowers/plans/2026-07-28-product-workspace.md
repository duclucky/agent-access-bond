# Product Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the contract-inspection presentation with a product-first
AgentAccessBond workspace while preserving all canonical reads and real writes.

**Architecture:** Add pure presentation helpers for amounts, identifiers, and
contract-state copy. Recompose the existing React components around a
plain-language status summary, contextual action area, access-review summary,
and collapsed technical details. Keep App state and contract clients intact.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Lucide.

## Global Constraints

- Do not change contract methods, transaction requests, or canonical reads.
- Do not add a UI framework or styling dependency.
- Keep all user-facing copy in English.
- Use the workspace design-system override.
- Keep browser-signed evidence separate from script-signed evidence.

---

### Task 1: Presentation Helpers

**Files:**
- Create: `frontend/src/presentation.ts`
- Test: `frontend/src/presentation.test.ts`

**Interfaces:**
- Produces: `formatGen`, `shortAddress`, `friendlyStatus`,
  `friendlyVerdict`, and `friendlyAction`.

- [ ] Write failing tests for 18-decimal GEN formatting, compact addresses,
  and plain-English contract enums.
- [ ] Run `npm --prefix frontend test -- presentation.test.ts` and confirm the
  helpers are missing.
- [ ] Implement the pure helpers with no wallet or contract dependency.
- [ ] Re-run the focused tests and confirm they pass.

### Task 2: Product Workspace Components

**Files:**
- Modify: `frontend/src/components/AgentWorkspace.tsx`
- Modify: `frontend/src/components/TransactionActivity.tsx`
- Modify: `frontend/src/components/WalletBar.tsx`
- Test: `frontend/src/components/AgentWorkspace.test.tsx`
- Test: `frontend/src/components/TransactionActivity.test.tsx`

**Interfaces:**
- Consumes: presentation helpers and existing `CanonicalSnapshot`.
- Produces: the same component props already consumed by `App.tsx`.

- [ ] Write failing component tests for plain-language status, GEN balances,
  one contextual CTA, and collapsed technical details.
- [ ] Run the focused tests and confirm the old dashboard copy fails them.
- [ ] Recompose the components without changing their data or action props.
- [ ] Re-run focused tests and existing component tests.

### Task 3: Responsive Visual System

**Files:**
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: semantic class names from Task 2.
- Produces: responsive 375px-1440px layouts and visible interaction states.

- [ ] Replace the grid background and inspection-dashboard styling with the
  workspace design tokens.
- [ ] Add 44px controls, focus-visible rings, reduced-motion handling, URL
  truncation, and one-column mobile layout.
- [ ] Run frontend TypeScript tests and production build.

### Task 4: Release Verification

**Files:**
- Modify after deployment:
  `docs/evidence/studionet/frontend-hosting.json`
- Modify after browser verification:
  `docs/evidence/studionet/browser-wallet.json`

**Interfaces:**
- Produces: checked source revision and allowlisted deployment evidence.

- [ ] Run `npm run check`.
- [ ] Verify desktop and mobile production DOM, screenshots, console, and
  overflow.
- [ ] Push source, deploy Vercel production, and verify HTTP 200 plus bundle
  markers.
- [ ] Record the deployment ID, source commit, and verification timestamp.
