-- Consultant plan (Free = 80% share, Pro = 85% share).
-- Existing consultants default to 'free', so current splits do not change.
ALTER TABLE consultant_profile ADD COLUMN IF NOT EXISTS plan VARCHAR(16) NOT NULL DEFAULT 'free';
