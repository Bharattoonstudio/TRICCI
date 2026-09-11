import { db } from '@/server/db/client.js';
import { sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';

function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Check if user exists and has admin role
    const userResult = await db.execute(
      sql`SELECT id, role, email FROM "user" WHERE email = ${email} LIMIT 1`
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0] as any;

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Not an admin user' });
    }

    try {
      // Generate session token
      const token = generateSessionToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const sessionId = randomBytes(18).toString('hex');

      // Insert session into database
      await db.execute(
        sql`INSERT INTO session (id, user_id, expires_at, token)
            VALUES (${sessionId}, ${user.id}, ${expiresAt}, ${token})`
      );

      // Set session cookie (BetterAuth uses auth_session)
      res.setHeader(
        'Set-Cookie',
        `auth_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
      );

      return res.status(200).json({ 
        success: true, 
        message: 'Access granted',
        userId: user.id,
        email: user.email
      });
    } catch (sessionError) {
      console.error('Session creation error:', sessionError);
      return res.status(500).json({ message: 'Could not establish session' });
    }
  } catch (error) {
    console.error('Quick access error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
