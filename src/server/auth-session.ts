import { db } from '@/server/db/client';
import { user, session } from '@/server/db/schema';
import { sql } from 'drizzle-orm';
import type { NextApiRequest } from 'next';

export interface AuthenticatedUser {
    id: string;
    name: string;
    email: string;
    role: 'employer' | 'consultant' | 'candidate' | 'admin';
    isAdmin: boolean;
}

/**
 * Get the current user from session token
 * Token can come from cookies or Authorization header
 */
export async function getSessionUser(req: NextApiRequest): Promise<AuthenticatedUser | null> {
    try {
          // Get session token from cookie or header
      const sessionToken = req.cookies.sessionToken ||
                                req.headers.authorization?.replace('Bearer ', '');

      if (!sessionToken) {
              return null;
      }

      // Look up session and user
      const result = await db.execute(
              sql`
                      SELECT u.id, u.name, u.email, u.role, u.is_admin
                              FROM session s
                                      JOIN "user" u ON s.user_id = u.id
                                              WHERE s.token = ${sessionToken}
                                                      AND s.expires_at > NOW()
                                                              LIMIT 1
                                                                    `
            );

      if (!result.rows || result.rows.length === 0) {
              return null;
      }

      const userData = result.rows[0] as any;
          return {
                  id: userData.id,
                  name: userData.name,
                  email: userData.email,
                  role: userData.role,
                  isAdmin: userData.is_admin,
          };
    } catch (error) {
          console.error('[AUTH-SESSION] Error getting user:', error);
          return null;
    }
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(req: NextApiRequest) {
    const user = await getSessionUser(req);
    if (!user) {
          throw new Error('Unauthorized');
    }
    return user;
}

/**
 * Middleware to require specific role(s)
 */
export async function requireRole(
    req: NextApiRequest,
    allowedRoles: string[]
  ) {
    const user = await getSessionUser(req);
    if (!user || !allowedRoles.includes(user.role)) {
          throw new Error('Forbidden');
    }
    return user;
}
