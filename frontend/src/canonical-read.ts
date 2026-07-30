const TRANSIENT_READ_PATTERNS = [
  "server busy",
  "execution slots occupied",
  "retry later",
  "temporarily unavailable",
  "timeout",
  "timed out",
  "network error",
  "failed to fetch"
];

function isTransientReadError(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return TRANSIENT_READ_PATTERNS.some((pattern) => message.includes(pattern));
}

export async function retryTransientCanonicalRead<T>(
  read: () => Promise<T>
): Promise<T> {
  const retryDelays = [400, 800];
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      if (!isTransientReadError(error) || attempt >= retryDelays.length) {
        throw error;
      }
      await new Promise((resolve) => window.setTimeout(resolve, retryDelays[attempt]));
    }
  }
}
