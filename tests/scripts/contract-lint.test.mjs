import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..", "..");

test("contract lint runner works from the repository virtual environment", () => {
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      path.join(PROJECT_ROOT, "scripts", "lint-contracts.ps1")
    ],
    {
      cwd: PROJECT_ROOT,
      encoding: "utf8"
    }
  );

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join("\n")
  );
});
