import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error(
    "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set",
  );
}

const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

const rateLimits = {
  complaintSubmit: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
  }),
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "60 s"),
    analytics: true,
  }),
  aiTriage: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "60 s"),
    analytics: true,
  }),
  adminApi: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "60 s"),
    analytics: true,
  }),
} as const;

type RateLimitKey = keyof typeof rateLimits;

export async function checkRateLimit(
  key: RateLimitKey,
  identifier: string,
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const limiter = rateLimits[key];
  const result = await limiter.limit(identifier);

  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export function rateLimitHeaders(
  result: Awaited<ReturnType<typeof checkRateLimit>>,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.remaining.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}
