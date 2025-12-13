/**
 * Rate Limiting Middleware
 *
 * Simple rate limiting wrapper for API routes
 */

import { NextRequest, NextResponse } from 'next/server';

type RateLimitTier = 'relaxed' | 'standard' | 'strict';

const RATE_LIMITS: Record<RateLimitTier, { requests: number; window: number }> = {
  relaxed: { requests: 100, window: 60000 }, // 100 req/min
  standard: { requests: 30, window: 60000 }, // 30 req/min
  strict: { requests: 10, window: 60000 }, // 10 req/min
};

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware for API routes
 *
 * @param handler - The API route handler
 * @param tier - Rate limit tier
 * @returns Wrapped handler with rate limiting
 */
export function withApiRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  tier: RateLimitTier = 'standard'
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Get client identifier (IP address or a header)
    const clientId =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const key = `${tier}:${clientId}:${req.nextUrl.pathname}`;
    const limit = RATE_LIMITS[tier];

    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (record) {
      if (now < record.resetTime) {
        // Within the current window
        if (record.count >= limit.requests) {
          // Rate limit exceeded
          return NextResponse.json(
            {
              error: 'Rate limit exceeded. Please try again later.',
              code: 'RATE_LIMIT_EXCEEDED',
            },
            { status: 429 }
          );
        }

        // Increment count
        record.count++;
      } else {
        // Window expired, reset
        record.count = 1;
        record.resetTime = now + limit.window;
      }
    } else {
      // First request
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + limit.window,
      });
    }

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to clean up
      cleanupExpiredEntries();
    }

    return handler(req);
  };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now >= record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}
