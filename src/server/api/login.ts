import { db } from '@/server/db/client';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';

export async function loginHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await db.execute(
      sql`SELECT u.id, u.email, u.name, u.role, a.password FROM "user" u LEFT JOIN account a ON a.user_id = u.id WHERE u.email = ${email} LIMIT 1`
    );

    if (!result.rows || result.rows.length === 0) {
      console.log(`[LOGIN] ❌ User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userRecord = result.rows[0] as any;
    const storedHash = userRecord.password;

    if (!storedHash) {
      console.log(`[LOGIN] ❌ No password set for ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordValid = await bcrypt.compare(password, storedHash);

    if (!passwordValid) {
      console.log(`[LOGIN] ❌ Invalid password for ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`[LOGIN] ✅ User logged in: ${email}`);

    return res.status(200).json({
      success: true,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role || 'candidate',
      },
    });
  } catch (error) {
    console.error(`[LOGIN] ❌ Error:`, error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

export default loginHandler;
