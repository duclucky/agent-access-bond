# Authenticated Access Events Design

## Objective

Address the reviewer request by preventing bond slashing from unauthenticated
or temporally ambiguous access receipts, aligning the product UI with the
contract schema, and exposing all documented case recovery writes.

## Trust Boundary

An operator registers one immutable secp256k1 runner-attestor public key with
each agent. The runner signs every access event. The signed payload binds:

- schema version, event ID, agent ID, User-Agent, HTTP method, and target URL;
- event timestamp and nonce;
- the exact policy version URL and content hash;
- the exact robots version URL and content hash.

The contract deterministically verifies the public key, low-s ECDSA signature,
event identity, target origin, and signed payload. Validators then fetch the
versioned policy and robots sources and verify their Keccak-256 content hashes
before semantic adjudication. A policy URL must equal the agent's locked policy
URL. A robots version URL must be under the protected origin.

Missing, malformed, unsigned, mismatched, reused, or unavailable attestation
evidence produces `UNVERIFIABLE`. It must never debit the operator bond. A
`MATERIAL_VIOLATION` can slash only when `attestation_verified` is true.

## Canonical Receipt

The public receipt uses `agent-access-event/v1` and contains:

```json
{
  "schema": "agent-access-event/v1",
  "event_id": "evt-...",
  "agent_id": "agent-...",
  "user_agent": "AgentAccessBot/1.0",
  "method": "GET",
  "target_url": "https://example.com/private/report",
  "occurred_at": "2026-07-30T10:00:00Z",
  "nonce": "unique-runner-nonce",
  "policy_version": "2026-07-30",
  "policy_url": "https://example.com/policy/2026-07-30.txt",
  "policy_hash": "0x...",
  "robots_version": "2026-07-30",
  "robots_url": "https://example.com/robots.txt?v=2026-07-30",
  "robots_hash": "0x...",
  "attestor_public_key": "0x04...",
  "signature": "0x..."
}
```

The signature is secp256k1 ECDSA over the Keccak-256 hash of the compact,
ASCII-only, sorted-key JSON object containing every field above except
`signature`. Signatures are encoded as 32-byte `r` followed by 32-byte `s`.

## Contract Changes

- Add immutable `attestor_public_key` to `Agent`.
- Add immutable `event_id` to `AccessCase` and reserve it at case opening.
- Add attestation timestamp, signer, version URLs, version labels, hashes, and
  `attestation_verified` to `Verdict`.
- Add deterministic canonicalization, Keccak hashing, secp256k1 public-key
  validation, and ECDSA verification.
- Set the agent to `PENDING_REVIEW` when a case opens.
- Convert attestation/source failures into retryable `UNVERIFIABLE` verdicts.
- Keep one event ID bound to one case to prevent replay.
- Preserve the existing bilateral cancellation and retry authorization model.

## Frontend Changes

- Use exactly the contract case status `CANCELED`.
- Use exactly the contract violation types:
  `DISALLOWED_PATH`, `USER_AGENT_MISMATCH`, `POLICY_SCOPE_BREACH`,
  `RECEIPT_INSUFFICIENT`, and `NONE`.
- Collect the runner-attestor public key during registration and the access
  event ID during challenge creation.
- Display attestation timestamp and policy/robots versions from canonical
  verdict state, not browser read time.
- Expose `retry_case`, `propose_case_cancel`, and `accept_case_cancel` only
  when canonical case status and the connected wallet authorize them.
- Track submitted, accepted, finalized, failed, and retry transaction states,
  then refresh canonical state after finality.

## Failure and Recovery

- Invalid attestation: `UNVERIFIABLE`, case `RETRYABLE`, no settlement.
- Version source unavailable or hash mismatch: `UNVERIFIABLE`, case
  `RETRYABLE`, no settlement.
- Retry: operator, designated user, or case opener may return `RETRYABLE` to
  `OPEN`, then adjudicate again.
- Cancellation: operator or opener proposes; the other party accepts; the
  challenge bond is credited back to the opener and the agent becomes `ACTIVE`.

## Verification

Direct tests cover valid signatures, tampering, wrong keys, replayed event IDs,
version hash mismatch, no-slash failure paths, status transitions, retry, and
bilateral cancellation. Frontend tests cover exact enum normalization,
transaction routing, authorization-aware controls, and canonical refresh.
`npm run check` remains the release gate. A new Studionet contract revision and
production frontend deployment are required because the active contract schema
is immutable.

