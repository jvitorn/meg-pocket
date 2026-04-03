import { Redis } from "@upstash/redis";

type RequestLike = Request | { headers: Headers };

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  identifier?: string | null;
};

type StoredRateLimit = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
  resetAt: number;
};

const memoryStore = new Map<string, StoredRateLimit>();

let cachedRedis: Redis | null | undefined;

function getRedisClient() {
  if (cachedRedis !== undefined) {
    return cachedRedis;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    cachedRedis = null;
    return cachedRedis;
  }

  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

export function getClientIp(request: RequestLike) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  return "anonymous";
}

async function applyMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const current = memoryStore.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      retryAfter: Math.ceil(windowMs / 1000),
      resetAt,
    };
  }

  current.count += 1;
  memoryStore.set(key, current);

  return {
    allowed: current.count <= limit,
    limit,
    remaining: Math.max(0, limit - current.count),
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    resetAt: current.resetAt,
  };
}

async function applyRedisRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (!redis) {
    return applyMemoryRateLimit(key, limit, windowMs);
  }

  try {
    const now = Date.now();
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.pexpire(key, windowMs);
    }

    const ttl = await redis.pttl(key);
    const retryAfterMs = ttl > 0 ? ttl : windowMs;
    const resetAt = now + retryAfterMs;

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      resetAt,
    };
  } catch {
    return applyMemoryRateLimit(key, limit, windowMs);
  }
}

export async function enforceRateLimit(
  request: RequestLike,
  options: RateLimitOptions
) {
  const identifier = options.identifier?.trim() || getClientIp(request);
  const storageKey = `rate-limit:${options.key}:${identifier}`;

  return applyRedisRateLimit(storageKey, options.limit, options.windowMs);
}

export function buildRateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
    "Retry-After": String(result.retryAfter),
  };
}
