import { db } from '@/server/db/client';
import { session } from '@/server/db/schema';
import { sql } from 'drizzle-orm';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Logout endpoint - delete session
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
    }

  try {
        // Get session token from cookie or header
      const sessionToken = req.cookies.sessionToken ||
                                req.headers.authorization?.replace('Bearer ', '');

      if (!sessionToken) {
              return res.status(200).json({ success: true, message: 'Already logged out' });
      }

      // Delete session from database
      await db.execute(
              sql`DELETE FROM session WHERE token = ${sessionToken}`
            );

      // Clear session cookie
      res.setHeader('Set-Cookie', 'sessionToken=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');

      console.log('[LOGOUT] ✅ User logged out');
        return res.status(200).json({
                success: true,
                message: 'Logged out successfully',
        });
  } catch (error) {
        console.error('[LOGOUT] ❌ Error:', error);
        return res.status(500).json({ error: 'Failed to logout' });
  }
}
