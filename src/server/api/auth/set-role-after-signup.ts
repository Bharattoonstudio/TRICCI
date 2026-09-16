import { db } from '@/server/db/client.js';
import { eq, and } from 'drizzle-orm';
import { user, candidateProfile, employerProfile, consultantProfile } from '@/server/db/schema.js';
import { getAuth } from '@/lib/auth/auth.js';
import { sendEmployerSignupEmail } from '@/server/emails/employer-signup.js';
import { sendConsultantSignupEmail } from '@/server/emails/consultant-signup.js';
import { sendCandidateSignupEmail } from '@/server/emails/candidate-signup.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // SECURITY: Get authenticated user from session, do NOT trust client email/role
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized. Must be logged in.' });
  }

  const { role, name } = req.body;

  if (!role) {
    return res.status(400).json({ message: 'Role is required' });
  }

  // Validate role — admin role CANNOT be set by this endpoint
  const validRoles = ['employer', 'consultant', 'candidate'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const userId = session.user.id;
    const currentRole = session.user.role;

    // No-op if role hasn't changed
    if (currentRole === role) {
      return res.status(200).json({
        success: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role
        }
      });
    }

    // Update user role in database
    const updatedUsers = await db
      .update(user)
      .set({ role })
      .where(eq(user.id, userId))
      .returning({ id: user.id, email: user.email, role: user.role, name: user.name });

    if (updatedUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = updatedUsers[0];
    const userName = name || updatedUser.name || updatedUser.email.split('@')[0];

    // Delete old role profile
    try {
      if (currentRole === 'candidate') {
        await db.delete(candidateProfile).where(eq(candidateProfile.userId, userId));
      } else if (currentRole === 'employer') {
        await db.delete(employerProfile).where(eq(employerProfile.userId, userId));
      } else if (currentRole === 'consultant') {
        await db.delete(consultantProfile).where(eq(consultantProfile.userId, userId));
      }
    } catch (deleteErr) {
      console.error(`Failed to delete old ${currentRole} profile:`, deleteErr);
      // Continue anyway — old profile won't hurt
    }

    // Create new role profile
    try {
      if (role === 'candidate') {
        await db
          .insert(candidateProfile)
          .values({ userId })
          .onConflictDoNothing();
      } else if (role === 'employer') {
        await db
          .insert(employerProfile)
          .values({ userId })
          .onConflictDoNothing();
      } else if (role === 'consultant') {
        await db
          .insert(consultantProfile)
          .values({ userId })
          .onConflictDoNothing();
      }
    } catch (createErr) {
      console.error(`Failed to create new ${role} profile:`, createErr);
      // Continue anyway — profile can be created on first login via database hook
    }

    // Send role-specific welcome email
    try {
      if (role === 'employer') {
        await sendEmployerSignupEmail(updatedUser.email, userName);
      } else if (role === 'consultant') {
        await sendConsultantSignupEmail(updatedUser.email, userName);
      } else if (role === 'candidate') {
        await sendCandidateSignupEmail(updatedUser.email, userName);
      }
    } catch (emailError) {
      console.error(`Failed to send ${role} signup email:`, emailError);
      // Don't fail the request if email fails, but log it
    }

    return res.status(200).json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Set role error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
