/**
 * Minimal fixed-window rate limiter (per key, e.g. client IP).
 *
 * NOTE: state lives in the Worker isolate's memory, so limits are per-isolate and best-effort.
 * It blocks naive bursts; for stronger protection add a Cloudflare WAF rate-limiting rule
 * on /api/* (see DEPLOY.md) or move this to Durable Objects / KV in V2.
 */
export interface RateLimiter {
  /** Returns whether the request is allowed and how many seconds until the window resets. */
  check(key: string, now?: number): { allowed: boolean; retryAfter: number };
}

export const createRateLimiter = ({ limit, windowMs }: { limit: number; windowMs: number }): RateLimiter => {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key, now = Date.now()) {
      // Opportunistic cleanup keeps memory bounded.
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfter: 0 };
      }
      entry.count += 1;
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return { allowed: entry.count <= limit, retryAfter };
    },
  };
};
