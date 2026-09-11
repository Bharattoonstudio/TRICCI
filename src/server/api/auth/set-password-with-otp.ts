import { db } from '@/server/db/client.js';
import { sql } from 'drizzle-orm';
import { isOtpVerified } from '@/server/lib/otp';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return res.status(400).json({ message: 'Email, OTP, and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  try {
    // Verify OTP was actually verified
    const verified = await isOtpVerified(email, otp);
    if (!verified) {
      return res.status(400).json({ message: 'Invalid or unverified OTP' });
    }

    // Get user ID
    const userResult = await db.execute(
      sql`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'User not found' });
    }

    const userId = (userResult.rows[0] as any).id;

    // Hash password using bcrypt (crypt function in PostgreSQL)
    const hashedPassword = await (async () => {
      const hashResult = await db.execute(
        sql`SELECT crypt(${password}, gen_salt('bf')) as hashed`
      );
      return (hashResult.rows[0] as any).hashed;
    })();

    // Update or create account record with new password
    const accountResult = await db.execute(
      sql`SELECT id FROM account WHERE user_id = ${userId} AND provider_id = 'credential' LIMIT 1`
    );

    if (accountResult.rows.length > 0) {
      // Update existing account
      await db.execute(
        sql`UPDATE account SET password = ${hashedPassword}, updated_at = NOW() 
            WHERE user_id = ${userId} AND provider_id = 'credential'`
      );
    } else {
      // Create new credential account
      await db.execute(
        sql`INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
            VALUES (gen_random_uuid()::text, ${email}, 'credential', ${userId}, ${hashedPassword}, NOW(), NOW())`
      );
    }

    // Mark OTP as used
    await db.execute(
      sql`UPDATE password_reset_otp SET used = TRUE WHERE email = ${email} AND otp_code = ${otp}`
    );

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Set password error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
