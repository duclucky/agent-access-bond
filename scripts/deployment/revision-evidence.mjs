import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function readSourceCommit(rootDir) {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error("Unable to resolve source commit");
  }
  return result.stdout.trim();
}

function readDepends(source) {
  const match = source.match(
    /^#\s*\{\s*"Depends"\s*:\s*"([^"]+)"\s*\}/m
  );
  if (!match) {
    throw new Error("Contract Depends header is missing");
  }
  return match[1];
}

export function buildDeploymentIdentity({
  rootDir,
  contractPath,
  network,
  sourceCommit
}) {
  const source = readFileSync(contractPath, "utf8");
  return {
    network,
    sourceCommit: sourceCommit ?? readSourceCommit(rootDir),
    contractSourceSha256: createHash("sha256").update(source).digest("hex"),
    depends: readDepends(source)
  };
}

export function identitiesMatch(left, right) {
  return (
    left?.network === right.network &&
    left?.sourceCommit === right.sourceCommit &&
    left?.contractSourceSha256 === right.contractSourceSha256 &&
    left?.depends === right.depends
  );
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function archivePreviousEvidence(evidencePath, previous) {
  const address = previous?.primary?.contractAddress;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address ?? "")) {
    return;
  }
  const archivePath = path.join(
    path.dirname(evidencePath),
    "revisions",
    address.toLowerCase(),
    "deployment.json"
  );
  writeJson(archivePath, {
    ...previous,
    status: "SUPERSEDED",
    supersededReason: "deployment identity changed",
    supersededAt: new Date().toISOString()
  });
}

export function prepareActiveEvidence(evidencePath, identity) {
  if (existsSync(evidencePath)) {
    const previous = JSON.parse(readFileSync(evidencePath, "utf8"));
    if (identitiesMatch(previous.deploymentIdentity, identity)) {
      return previous;
    }
    archivePreviousEvidence(evidencePath, previous);
  }

  const active = {
    network: identity.network,
    deploymentIdentity: identity,
    status: "PENDING_DEPLOYMENT"
  };
  writeJson(evidencePath, active);
  return active;
}
