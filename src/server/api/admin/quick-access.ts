import { db } from '@/server/db/client.js';
import { sql } from 'drizzle-orm';
import { auth } from '@/lib/auth/auth.js';

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

    // Create session using BetterAuth's internal session management
    try {
      const session = await auth.api.createSession({
        userId: user.id,
      });

      if (!session) {
        return res.status(500).json({ message: 'Failed to create session' });
      }

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
