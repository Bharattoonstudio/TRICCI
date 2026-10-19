-- Employer placement fee options.
-- Additive and safe to run on the live database: existing jobs keep a percentage fee.
-- Apply BEFORE deploying the code that reads these columns.

-- 1. Job: how the fee is set (percentage of offer CTC, or fixed rupee amount)
ALTER TABLE job ADD COLUMN IF NOT EXISTS fee_type VARCHAR(16) NOT NULL DEFAULT 'percent';
ALTER TABLE job ADD COLUMN IF NOT EXISTS fee_amount_rupees INTEGER;

-- 2. Commission config: fixed-fee minimum, and the percentage ceiling moves to 35%
ALTER TABLE commission_config ADD COLUMN IF NOT EXISTS min_fee_amount_rupees INTEGER NOT NULL DEFAULT 50000;
ALTER TABLE commission_config ALTER COLUMN max_fee_percent SET DEFAULT 35;
UPDATE commission_config SET max_fee_percent = 35, min_fee_amount_rupees = 50000 WHERE max_fee_percent = 15;
