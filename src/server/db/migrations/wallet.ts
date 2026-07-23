/**
 * Migration: wallet_transaction table
 * Tracks all Razorpay deposits made by employers into their TRICCI credit wallet.
 */
import { db } from '../client.js';

export async function migrateWallet() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS wallet_transaction (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        employer_user_id VARCHAR(36) NOT NULL,
        razorpay_order_id   VARCHAR(128) NOT NULL UNIQUE,
        razorpay_payment_id VARCHAR(128),
        amount_paise  INT NOT NULL,
        currency      VARCHAR(8) NOT NULL DEFAULT 'INR',
        status        VARCHAR(32) NOT NULL DEFAULT 'created',
        receipt       VARCHAR(128),
        notes         TEXT,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_wallet_employer (employer_user_id),
        INDEX idx_wallet_order (razorpay_order_id)
      )
    `);
    console.log('[migration] wallet_transaction: OK');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('already exists')) {
      console.log('[migration] wallet_transaction: already exists — skipped');
    } else {
      console.error('[migration] wallet_transaction error:', err);
    }
  }
}
