/**
 * Role-Based Authorization Middleware
 * 
 * Checks user roles and permissions for protected routes.
 * 
 * @author Digital Utopia Platform
 * @version 1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthenticatedRequest, authMiddleware } from './auth';

export type UserRole = 'user' | 'admin' | 'superadmin' | 'support' | 'analyst';

export interface RoleConfig {
  allowedRoles: UserRole[];
  requireEmailVerification?: boolean;
  requireKYC?: boolean;
}

/**
 * Check if user has required role
 * @param userRole - User's role
 * @param allowedRoles - Array of allowed roles
 * @returns True if user has permission
 */
function hasRequiredRole(userRole: string, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole as UserRole);
}

/**
 * Role-based authorization middleware
 * Wraps authMiddleware and adds role checking
 * 
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return roleAuthMiddleware(['admin', 'superadmin'])(
 *     async (req, { user }) => {
 *       // User is admin or superadmin
 *       return NextResponse.json({ data: adminData });
 *     }
 *   )(request);
 * }
 * ```
 */
export function roleAuthMiddleware(
  allowedRoles: UserRole[],
  options: {
    requireEmailVerification?: boolean;
    requireKYC?: boolean;
  } = {}
) {
  return (
    handler: (
      request: AuthenticatedRequest,
      context: { user: NonNullable<AuthenticatedRequest['user']> }
    ) => Promise<NextResponse>
  ) => {
    return authMiddleware(async (request, { user }) => {
      // Check role permission
      if (!hasRequiredRole(user.role || 'user', allowedRoles)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to access this resource.',
              requiredRoles: allowedRoles,
              userRole: user.role,
            },
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        );
      }

      // Check email verification if required
      if (options.requireEmailVerification && !user.emailVerified) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'EMAIL_NOT_VERIFIED',
              message: 'Please verify your email address to access this resource.',
            },
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        );
      }

      // Check KYC status if required
      if (options.requireKYC) {
        const kycStatus = user.customClaims?.kycStatus || 'pending';
        if (kycStatus !== 'verified') {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'KYC_NOT_VERIFIED',
                message: 'Please complete KYC verification to access this resource.',
                kycStatus,
              },
              timestamp: new Date().toISOString(),
            },
            { status: 403 }
          );
        }
      }

      // User has required permissions, proceed to handler
      return await handler(request, { user });
    });
  };
}

/**
 * Admin-only middleware
 * Shorthand for admin and superadmin roles
 */
export function adminOnly() {
  return roleAuthMiddleware(['admin', 'superadmin']);
}

/**
 * Superadmin-only middleware
 * Highest level of access
 */
export function superadminOnly() {
  return roleAuthMiddleware(['superadmin']);
}

/**
 * Require email verification middleware
 * Can be combined with role checking
 */
export function requireEmailVerification() {
  return roleAuthMiddleware(['user', 'admin', 'superadmin'], {
    requireEmailVerification: true,
  });
}

/**
 * Require KYC verification middleware
 * Typically used for trading and financial operations
 */
export function requireKYC() {
  return roleAuthMiddleware(['user', 'admin', 'superadmin'], {
    requireKYC: true,
  });
}

/**
 * Check if user has specific permission
 * More granular than role-based checking
 * 
 * @param user - Authenticated user object
 * @param permission - Permission string (e.g., 'trades:write', 'users:admin')
 * @returns True if user has permission
 */
export function hasPermission(
  user: NonNullable<AuthenticatedRequest['user']>,
  permission: string
): boolean {
  const permissions = user.customClaims?.permissions || [];
  
  // Superadmin has all permissions
  if (user.role === 'superadmin') {
    return true;
  }

  // Check specific permission
  return permissions.includes(permission);
}

/**
 * Permission-based authorization middleware
 * More flexible than role-based
 * 
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   return permissionMiddleware('trades:execute')(
 *     async (req, { user }) => {
 *       // User has trades:execute permission
 *       return NextResponse.json({ success: true });
 *     }
 *   )(request);
 * }
 * ```
 */
export function permissionMiddleware(requiredPermission: string) {
  return (
    handler: (
      request: AuthenticatedRequest,
      context: { user: NonNullable<AuthenticatedRequest['user']> }
    ) => Promise<NextResponse>
  ) => {
    return authMiddleware(async (request, { user }) => {
      if (!hasPermission(user, requiredPermission)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: `You do not have the required permission: ${requiredPermission}`,
            },
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        );
      }

      return await handler(request, { user });
    });
  };
}

export default roleAuthMiddleware;
