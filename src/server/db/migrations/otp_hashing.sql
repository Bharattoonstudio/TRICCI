-- OTP hashing (security batch 3).
-- Apply BEFORE deploying the code that stores OTP codes as hashes.

-- 1. The column must hold a 64-character hash instead of an 8-character code.
ALTER TABLE otp_store ALTER COLUMN otp TYPE VARCHAR(64);

-- 2. Codes stored in plain text (8 characters or fewer) can no longer be
--    verified by the new code. Expire them now so they can't be used.
--    Nothing is deleted; the rows remain for audit and expire on their own.
UPDATE otp_store SET expires_at = NOW() WHERE LENGTH(otp) <= 8 AND expires_at > NOW();
