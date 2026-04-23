-- Add UNIQUE constraint on phone column to prevent duplicates
-- This ensures database-level validation for phone numbers

ALTER TABLE public.users
ADD CONSTRAINT users_phone_unique UNIQUE(phone);

-- Add an index for better query performance on phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT users_phone_unique ON public.users IS 'Ensures each phone number is unique across all users';
