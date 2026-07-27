import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const OPERATOR_KEY_VARIABLES = Object.freeze(["STUDIONET_PRIVATE_KEY"]);
export const USER_KEY_VARIABLES = Object.freeze([
  "STUDIONET_USER_PRIVATE_KEY",
  "STUDIONET_INTEGRATOR_PRIVATE_KEY"
]);

export function deploymentEnvPaths(projectRoot) {
  return [
    path.join(projectRoot, ".env"),
    path.resolve(projectRoot, "..", ".env")
  ];
}

function findEntry(variableName, envPaths) {
  for (const envPath of envPaths) {
    if (!existsSync(envPath)) continue;
    const entry = readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith(`${variableName}=`));
    if (entry) return entry;
  }
  return null;
}

export function loadPrivateKey(variableNames, envPaths) {
  for (const variableName of variableNames) {
    const entry = findEntry(variableName, envPaths);
    if (!entry) continue;
    let value = entry.slice(entry.indexOf("=") + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!/^(0x)?[0-9a-fA-F]{64}$/.test(value)) {
      throw new Error(`${variableName} is not a 32-byte hex key`);
    }
    return value.startsWith("0x") ? value : `0x${value}`;
  }
  throw new Error(`${variableNames.join(" or ")} is missing from ignored .env`);
}

