import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildDeploymentIdentity,
  prepareActiveEvidence
} from "../../scripts/deployment/revision-evidence.mjs";

const DEPENDS = "runner-hash-001";
const CONTRACT_SOURCE = `# { "Depends": "py-genlayer:${DEPENDS}" }\nclass Example:\n    pass\n`;

function fixture() {
  const rootDir = mkdtempSync(path.join(tmpdir(), "agent-access-revision-"));
  const contractPath = path.join(rootDir, "contracts", "agent.py");
  const evidencePath = path.join(
    rootDir,
    "docs",
    "evidence",
    "studionet",
    "deployment.json"
  );
  mkdirSync(path.dirname(contractPath), { recursive: true });
  mkdirSync(path.dirname(evidencePath), { recursive: true });
  writeFileSync(contractPath, CONTRACT_SOURCE, "utf8");
  return { rootDir, contractPath, evidencePath };
}

test("deployment identity binds network, commit, source digest, and Depends hash", () => {
  const { rootDir, contractPath } = fixture();

  const identity = buildDeploymentIdentity({
    rootDir,
    contractPath,
    network: "studionet",
    sourceCommit: "abc123"
  });

  assert.equal(identity.network, "studionet");
  assert.equal(identity.sourceCommit, "abc123");
  assert.match(identity.contractSourceSha256, /^[0-9a-f]{64}$/);
  assert.equal(identity.depends, `py-genlayer:${DEPENDS}`);
});

test("identity mismatch archives the previous revision and starts pending evidence", () => {
  const { rootDir, contractPath, evidencePath } = fixture();
  const previousAddress = "0x1111111111111111111111111111111111111111";
  writeFileSync(
    evidencePath,
    `${JSON.stringify(
      {
        network: "studionet",
        deploymentIdentity: {
          network: "studionet",
          sourceCommit: "old-commit",
          contractSourceSha256: "0".repeat(64),
          depends: `py-genlayer:${DEPENDS}`
        },
        primary: {
          contractAddress: previousAddress,
          status: "FINALIZED"
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  const identity = buildDeploymentIdentity({
    rootDir,
    contractPath,
    network: "studionet",
    sourceCommit: "new-commit"
  });

  const active = prepareActiveEvidence(evidencePath, identity, {
    chainId: 61999,
    rpc: "https://studio.genlayer.com/api"
  });

  assert.equal(active.status, "PENDING_DEPLOYMENT");
  assert.equal(active.chainId, 61999);
  assert.equal(active.rpc, "https://studio.genlayer.com/api");
  assert.deepEqual(active.deploymentIdentity, identity);
  assert.equal(active.primary, undefined);

  const archivePath = path.join(
    path.dirname(evidencePath),
    "revisions",
    previousAddress.toLowerCase(),
    "deployment.json"
  );
  const archived = JSON.parse(readFileSync(archivePath, "utf8"));
  assert.equal(archived.status, "SUPERSEDED");
  assert.equal(archived.supersededReason, "deployment identity changed");
  assert.equal(archived.primary.contractAddress, previousAddress);
});

test("matching identity reuses active evidence without archiving", () => {
  const { rootDir, contractPath, evidencePath } = fixture();
  const identity = buildDeploymentIdentity({
    rootDir,
    contractPath,
    network: "studionet",
    sourceCommit: "same-commit"
  });
  const existing = {
    network: "studionet",
    deploymentIdentity: identity,
    status: "ACTIVE",
    primary: {
      contractAddress: "0x2222222222222222222222222222222222222222",
      status: "FINALIZED"
    }
  };
  writeFileSync(evidencePath, `${JSON.stringify(existing, null, 2)}\n`, "utf8");

  const active = prepareActiveEvidence(evidencePath, identity);

  assert.deepEqual(active, existing);
});
