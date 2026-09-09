/**
 * In-memory sliding-window rate limiter.
 * Protects customer lookup and cancellation endpoints against brute-force guessing
 * and rapid repeated attempts.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      // If no timestamp in the last 15 minutes, remove
      const recent = record.timestamps.filter((t) => now - t < 15 * 60 * 1000);
      if (recent.length === 0) {
        store.delete(key);
      } else {
        record.timestamps = recent;
      }
    }
  }, 5 * 60 * 1000);

  // Unref interval if running in Node.js environment to allow graceful exit
  if (cleanupInterval && typeof cleanupInterval.unref === "function") {
    cleanupInterval.unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Checks and records an attempt for the given key.
 *
 * @param key Unique identifier (e.g. `cancel:${ip}:${phone}`)
 * @param maxAttempts Maximum allowed attempts in the time window
 * @param windowMs Time window in milliseconds (e.g. 10 * 60 * 1000 for 10 minutes)
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 10 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  let record = store.get(key);

  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= maxAttempts) {
    const oldest = record.timestamps[0];
    const resetInSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  // Record this attempt
  record.timestamps.push(now);
  const remaining = Math.max(0, maxAttempts - record.timestamps.length);
  const oldest = record.timestamps[0];
  const resetInSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));

  return {
    allowed: true,
    remaining,
    resetInSeconds,
  };
}

/**
 * Resets the rate limit counter for a specific key (e.g. on successful operation).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Helper to extract client IP from Next.js request headers.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
