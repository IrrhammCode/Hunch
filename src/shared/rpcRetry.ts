/**
 * Soft retry for Monad public RPC rate limits (requests limited to 15/sec).
 * Used by keeper/API around flaky eth_call bursts.
 */
export function isRateLimitError(e: unknown): boolean {
  const msg = [
    (e as any)?.shortMessage,
    (e as any)?.reason,
    (e as any)?.info?.error?.message,
    (e as any)?.error?.message,
    (e as any)?.message,
    String(e),
  ]
    .filter(Boolean)
    .join(" ");
  return /rate limit|too many requests|limited to \d+\/sec|-32090|-32011/i.test(msg);
}

export async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function withRpcRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 4;
  const base = opts.baseDelayMs ?? 400;
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i === attempts - 1 || !isRateLimitError(e)) throw e;
      const wait = base * Math.pow(2, i) + Math.floor(Math.random() * 150);
      console.warn(
        `[rpc] rate limited${opts.label ? ` (${opts.label})` : ""} — retry ${i + 1}/${attempts - 1} in ${wait}ms`,
      );
      await sleep(wait);
    }
  }
  throw last;
}
