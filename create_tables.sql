-- Create tables for the chef registration system
-- Run this first if the tables don't exist

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('client', 'chef', 'admin')),
  como_nos_conociste TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chef profiles table
CREATE TABLE IF NOT EXISTS public.chef_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  tagline TEXT,
  acerca_de_mi TEXT,
  para_mi_cocinar_es TEXT,
  aprendi_a_cocinar TEXT,
  mi_secreto_cocina TEXT,
  sitio_web TEXT,
  instagram TEXT,
  facebook TEXT,
  youtube TEXT,
  linkedin TEXT,
  city TEXT,
  country TEXT DEFAULT 'Uruguay',
  experience_years INTEGER,
  rating_avg NUMERIC,
  total_services INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  is_pro BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Profile completion tracking
CREATE TABLE IF NOT EXISTS public.profile_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID UNIQUE REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  account_done BOOLEAN DEFAULT false,
  bio_done BOOLEAN DEFAULT false,
  location_done BOOLEAN DEFAULT false,
  profile_picture_done BOOLEAN DEFAULT false,
  gallery_done BOOLEAN DEFAULT false,
  menus_done BOOLEAN DEFAULT false,
  payments_done BOOLEAN DEFAULT false,
  request_prefs_done BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_completion ENABLE ROW LEVEL SECURITY;

-- Create policies (basic policies for now)
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Chefs can view their own profile" ON public.chef_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Chefs can update their own profile" ON public.chef_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Chefs can view their completion status" ON public.profile_completion
  FOR SELECT USING (
    chef_id IN (
      SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Chefs can update their completion status" ON public.profile_completion
  FOR UPDATE USING (
    chef_id IN (
      SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()
    )
  );