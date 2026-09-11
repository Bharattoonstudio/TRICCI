import { db } from '@/server/db/client.js';
import { sql } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({ message: 'Email and role are required' });
  }

  // Validate role
  const validRoles = ['employer', 'consultant', 'candidate', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    // Update user role
    const result = await db.execute(
      sql`UPDATE "user" SET role = ${role} WHERE email = ${email} RETURNING id, email, role`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0] as any;

    return res.status(200).json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Set role error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
