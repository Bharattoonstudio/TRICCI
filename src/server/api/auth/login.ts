import { getAuth } from '@/lib/auth/auth';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Login endpoint — email + password authentication
 * Returns: session token + user data on success
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    // Get BetterAuth instance
    const auth = getAuth();

    // Authenticate user with BetterAuth
    const response = await auth.api.signInEmail({
      email,
      password,
      dontCreateUser: false,
    });

    // Check if authentication succeeded
    if (!response || response.status !== 200) {
      console.error(`[LOGIN] Auth failed for ${email}:`, response?.status);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Extract session from response
    const session = response.data;
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Login failed' });
    }

    console.log(`[LOGIN] ✅ User logged in: ${email}`);

    return res.status(200).json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: (session.user as any).role || 'candidate',
      },
      session: session.session?.token,
    });
  } catch (error) {
    console.error(`[LOGIN] ❌ Error:`, error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
