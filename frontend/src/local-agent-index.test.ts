import { afterEach, describe, expect, it } from "vitest";

import {
  agentIndexStorageKey,
  readRememberedAgentIds,
  rememberAgentId
} from "./local-agent-index";

afterEach(() => {
  window.localStorage.clear();
});

describe("local agent id index", () => {
  it("remembers ids globally and by wallet without treating storage as canonical state", () => {
    rememberAgentId("agent-alpha", "0xABC");
    rememberAgentId("agent-beta", "0xdef");
    rememberAgentId("agent-alpha", "0xabc");

    expect(readRememberedAgentIds("0xabc")).toEqual([
      "agent-alpha",
      "agent-beta"
    ]);
    expect(readRememberedAgentIds("0xdef")).toEqual([
      "agent-beta",
      "agent-alpha"
    ]);
  });

  it("recovers from malformed browser storage", () => {
    window.localStorage.setItem(agentIndexStorageKey, "{broken");

    expect(readRememberedAgentIds("0xabc")).toEqual([]);
  });
});
