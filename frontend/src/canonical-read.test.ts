import { afterEach, describe, expect, it, vi } from "vitest";

import { retryTransientCanonicalRead } from "./canonical-read";

describe("retryTransientCanonicalRead", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries temporary Studionet saturation and returns the canonical read", async () => {
    vi.useFakeTimers();
    const read = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(
        new Error("Server busy: all 8 execution slots occupied, retry later")
      )
      .mockResolvedValue("canonical-state");

    const result = retryTransientCanonicalRead(read);
    await vi.advanceTimersByTimeAsync(400);

    await expect(result).resolves.toBe("canonical-state");
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("does not retry structural contract read failures", async () => {
    const read = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error("Agent not found"));

    await expect(retryTransientCanonicalRead(read)).rejects.toThrow(
      "Agent not found"
    );
    expect(read).toHaveBeenCalledTimes(1);
  });
});
