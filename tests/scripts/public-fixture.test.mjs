import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak256, stringToHex } from "viem";

const ROOT_DIR = path.resolve(import.meta.dirname, "..", "..");
const FIXTURE_DIR = path.join(
  ROOT_DIR,
  "docs",
  "evidence",
  "public-fixtures"
);
const receipt = JSON.parse(
  readFileSync(path.join(FIXTURE_DIR, "case-1-receipt.json"), "utf8")
);

const ATTESTATION_FIELDS = [
  "schema",
  "event_id",
  "agent_id",
  "user_agent",
  "method",
  "target_url",
  "occurred_at",
  "nonce",
  "policy_version",
  "policy_url",
  "policy_hash",
  "robots_version",
  "robots_url",
  "robots_hash",
  "attestor_public_key"
];

function canonicalPayload(value) {
  return `{${ATTESTATION_FIELDS
    .slice()
    .sort()
    .map((field) => `${JSON.stringify(field)}:${JSON.stringify(value[field])}`)
    .join(",")}}`;
}

test("public access event has valid version hashes and runner signature", () => {
  const policy = readFileSync(path.join(FIXTURE_DIR, "agent-policy.txt"), "utf8");
  const robots = readFileSync(path.join(FIXTURE_DIR, "robots.txt"), "utf8");

  assert.equal(receipt.schema, "agent-access-event/v1");
  assert.equal(receipt.policy_hash, keccak256(stringToHex(policy)));
  assert.equal(receipt.robots_hash, keccak256(stringToHex(robots)));
  assert.equal(
    receipt.policy_url,
    "https://raw.githubusercontent.com/duclucky/agent-access-bond/main/docs/evidence/public-fixtures/agent-policy.txt"
  );
  assert.equal(
    receipt.robots_url,
    "https://raw.githubusercontent.com/duclucky/agent-access-bond/main/docs/evidence/public-fixtures/robots.txt"
  );

  const digest = keccak256(stringToHex(canonicalPayload(receipt))).slice(2);
  assert.equal(
    secp256k1.verify(
      receipt.signature.slice(2),
      digest,
      receipt.attestor_public_key.slice(2)
    ),
    true
  );
});
