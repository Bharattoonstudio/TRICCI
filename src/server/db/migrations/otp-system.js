import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function createOtpTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS password_reset_otp (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        verified_at TIMESTAMP,
        used BOOLEAN DEFAULT FALSE
      );

      CREATE INDEX IF NOT EXISTS idx_password_reset_otp_email ON password_reset_otp(email);
      CREATE INDEX IF NOT EXISTS idx_password_reset_otp_code ON password_reset_otp(otp_code);
    `);
    console.log('✅ OTP table created successfully');
  } catch (error) {
    if (error.message?.includes('already exists')) {
      console.log('✅ OTP table already exists');
    } else {
      console.error('❌ Failed to create OTP table:', error);
    }
  }
}
