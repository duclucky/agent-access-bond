import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..", "..");

test("check.ps1 stops at the first failed npm script", () => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "agent-access-check-"));
  const fixtureBin = path.join(fixtureRoot, "bin");
  const logPath = path.join(fixtureRoot, "npm-calls.log");
  const checkScript = path.join(PROJECT_ROOT, "scripts", "check.ps1");

  mkdirSync(fixtureBin);

  writeFileSync(
    path.join(fixtureBin, "npm.cmd"),
    [
      "@echo off",
      `echo %2>>"${logPath}"`,
      'if "%2"=="lint:contracts" exit /b 17',
      "exit /b 0",
      ""
    ].join("\r\n"),
    "utf8"
  );

  const result = spawnSync("powershell.exe", ["-NoProfile", "-File", checkScript], {
    cwd: fixtureRoot,
    env: {
      ...process.env,
      PATH: `${fixtureBin}${path.delimiter}${process.env.PATH ?? ""}`
    },
    encoding: "utf8"
  });

  assert.equal(result.status, 17);
  assert.deepEqual(readFileSync(logPath, "utf8").trim().split(/\r?\n/), [
    "lint:contracts"
  ]);
});
