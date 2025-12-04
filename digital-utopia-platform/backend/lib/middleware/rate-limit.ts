/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse with configurable rate limits.
 * Uses in-memory storage for simplicity (use Redis in production for distributed systems).
 * 
 * @author Digital Utopia Platform
 * @version 1.0
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

// In-memory store (use Redis in production)
const rateLimitStore: RateLimitStore = {};

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetAt < now) {
      delete rateLimitStore[key];
    }
  });
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

/**
 * Default rate limit configurations
 */
export const RateLimitPresets = {
  STRICT: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 per 15 minutes
  MODERATE: { windowMs: 15 * 60 * 1000, maxRequests: 30 }, // 30 per 15 minutes
  LENIENT: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 per minute
  TRADING: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
  LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 per 15 minutes
  REGISTER: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
  DEPOSIT: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 5 }, // 5 per day
  WITHDRAWAL: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 3 }, // 3 per day
  API_GENERAL: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 per minute
};

/**
 * Generate rate limit key from request
 * Uses IP address by default
 */
function defaultKeyGenerator(request: NextRequest): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  const path = new URL(request.url).pathname;
  
  return `${ip}:${path}`;
}

/**
 * Check if request should be rate limited
 * @returns true if request should be blocked
 */
function shouldRateLimit(key: string, config: RateLimitConfig): {
  limited: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const record = rateLimitStore[key];

  // No record or expired - create new
  if (!record || record.resetAt < now) {
    rateLimitStore[key] = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetAt: rateLimitStore[key].resetAt,
    };
  }

  // Increment count
  record.count++;

  // Check if limit exceeded
  if (record.count > config.maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  return {
    limited: false,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Rate limiting middleware
 * 
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   return rateLimitMiddleware(RateLimitPresets.TRADING)(
 *     async (req) => {
 *       // Handler code
 *       return NextResponse.json({ success: true });
 *     }
 *   )(request);
 * }
 * ```
 */
export function rateLimitMiddleware(config: RateLimitConfig) {
  return (handler: (request: NextRequest) => Promise<NextResponse>) => {
    return async (request: NextRequest): Promise<NextResponse> => {
      // Generate key for this request
      const keyGenerator = config.keyGenerator || defaultKeyGenerator;
      const key = keyGenerator(request);

      // Check rate limit
      const { limited, remaining, resetAt } = shouldRateLimit(key, config);

      // Add rate limit headers to response
      const headers = {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(resetAt).toISOString(),
      };

      if (limited) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
        
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again later.',
              retryAfter,
              resetAt: new Date(resetAt).toISOString(),
            },
            timestamp: new Date().toISOString(),
          },
          {
            status: 429,
            headers: {
              ...headers,
              'Retry-After': retryAfter.toString(),
            },
          }
        );
      }

      // Proceed with request
      const response = await handler(request);

      // Add rate limit headers to successful response
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    };
  };
}

/**
 * Create rate limiter with custom configuration
 */
export function createRateLimiter(
  windowMs: number,
  maxRequests: number,
  options?: Partial<RateLimitConfig>
) {
  return rateLimitMiddleware({
    windowMs,
    maxRequests,
    ...options,
  });
}

/**
 * User-based rate limiting (requires authentication)
 * Uses user ID instead of IP address
 */
export function userRateLimitMiddleware(config: RateLimitConfig) {
  return rateLimitMiddleware({
    ...config,
    keyGenerator: (request: NextRequest) => {
      // Try to get user ID from request (set by auth middleware)
      const userId = (request as any).user?.uid || 'anonymous';
      const path = new URL(request.url).pathname;
      return `user:${userId}:${path}`;
    },
  });
}

/**
 * Endpoint-specific rate limiting
 * Allows different limits for different endpoints
 */
export function endpointRateLimiter(limits: Record<string, RateLimitConfig>) {
  return (handler: (request: NextRequest) => Promise<NextResponse>) => {
    return async (request: NextRequest): Promise<NextResponse> => {
      const path = new URL(request.url).pathname;
      
      // Find matching limit configuration
      let config: RateLimitConfig | undefined;
      for (const [pattern, limitConfig] of Object.entries(limits)) {
        if (path.includes(pattern)) {
          config = limitConfig;
          break;
        }
      }

      // No limit configured for this endpoint
      if (!config) {
        return await handler(request);
      }

      // Apply rate limiting
      return rateLimitMiddleware(config)(handler)(request);
    };
  };
}

/**
 * Clear rate limit for a specific key (admin function)
 */
export function clearRateLimit(key: string): void {
  delete rateLimitStore[key];
}

/**
 * Get current rate limit status for a key
 */
export function getRateLimitStatus(key: string): {
  count: number;
  resetAt: number;
} | null {
  return rateLimitStore[key] || null;
}

export default rateLimitMiddleware;
