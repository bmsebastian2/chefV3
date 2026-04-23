-- Add surname columns to chef_profiles table
-- This stores the chef's additional information (surnames) separately from auth users

ALTER TABLE public.chef_profiles
ADD COLUMN IF NOT EXISTS first_surname TEXT,
ADD COLUMN IF NOT EXISTS second_surname TEXT;

-- Add comments to describe the columns
COMMENT ON COLUMN public.chef_profiles.first_surname IS 'First surname of the chef';
COMMENT ON COLUMN public.chef_profiles.second_surname IS 'Second surname of the chef';
