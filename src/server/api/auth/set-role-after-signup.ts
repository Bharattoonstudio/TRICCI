import { db } from '@/server/db/client.js';
import { sql } from 'drizzle-orm';
import { sendEmployerSignupEmail } from '@/server/emails/employer-signup.js';
import { sendConsultantSignupEmail } from '@/server/emails/consultant-signup.js';
import { sendCandidateSignupEmail } from '@/server/emails/candidate-signup.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, role, name } = req.body;

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
      sql`UPDATE "user" SET role = ${role} WHERE email = ${email} RETURNING id, email, role, name`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0] as any;
    const userName = name || user.name || email.split('@')[0];

    // Send role-specific welcome email
    try {
      if (role === 'employer') {
        await sendEmployerSignupEmail(email, userName);
      } else if (role === 'consultant') {
        await sendConsultantSignupEmail(email, userName);
      } else if (role === 'candidate') {
        await sendCandidateSignupEmail(email, userName);
      }
    } catch (emailError) {
      console.error(`Failed to send ${role} signup email:`, emailError);
      // Don't fail the request if email fails, but log it
    }

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
