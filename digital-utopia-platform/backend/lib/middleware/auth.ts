/**
 * Authentication Middleware
 * 
 * Verifies Firebase ID tokens and attaches user information to requests.
 * 
 * @author Digital Utopia Platform
 * @version 1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '../firebase';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email?: string;
    emailVerified: boolean;
    displayName?: string;
    role?: string;
    customClaims?: Record<string, any>;
  };
}

/**
 * Extract token from Authorization header
 * @param request - Next.js request object
 * @returns Token string or null
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and direct token
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
}

/**
 * Verify Firebase token middleware
 * 
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return authMiddleware(async (req, { user }) => {
 *     // user is authenticated
 *     return NextResponse.json({ user });
 *   })(request);
 * }
 * ```
 */
export function authMiddleware(
  handler: (
    request: AuthenticatedRequest,
    context: { user: NonNullable<AuthenticatedRequest['user']> }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Extract token from header
      const token = extractToken(request);

      if (!token) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required. Please provide a valid token.',
            },
            timestamp: new Date().toISOString(),
          },
          { status: 401 }
        );
      }

      // Verify token with Firebase
      const decodedToken = await verifyIdToken(token);

      // Attach user info to request
      const user: NonNullable<AuthenticatedRequest['user']> = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified || false,
        displayName: decodedToken.name,
        role: decodedToken.role || 'user',
        customClaims: decodedToken,
      };

      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;

      // Call the handler with authenticated request
      return await handler(authenticatedRequest, { user });
    } catch (error) {
      console.error('Authentication error:', error);

      // Token verification failed
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token. Please login again.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }
  };
}

/**
 * Verify Firebase token and extract user info
 * Standalone function for custom middleware chains
 * 
 * @param request - Next.js request object
 * @returns User object or throws error
 */
export async function verifyFirebaseToken(token: string) {
  try {
    const decodedToken = await verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
      displayName: decodedToken.name,
      role: decodedToken.role || 'user',
      customClaims: decodedToken,
    };
  } catch (error) {
    throw new Error('Token verification failed');
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 */
export function optionalAuthMiddleware(
  handler: (
    request: AuthenticatedRequest,
    context: { user: AuthenticatedRequest['user'] | null }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const token = extractToken(request);

      if (!token) {
        // No token, but that's okay for optional auth
        return await handler(request as AuthenticatedRequest, { user: null });
      }

      // Try to verify token
      const decodedToken = await verifyIdToken(token);
      const user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified || false,
        displayName: decodedToken.name,
        role: decodedToken.role || 'user',
        customClaims: decodedToken,
      };

      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;

      return await handler(authenticatedRequest, { user });
    } catch (error) {
      // Token invalid, but proceed without user
      return await handler(request as AuthenticatedRequest, { user: null });
    }
  };
}

export default authMiddleware;
