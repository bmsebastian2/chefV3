-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add missing columns to chef_menus
-- Run this if chef_menus already existed without these columns.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.chef_menus
  ADD COLUMN IF NOT EXISTS cuisine_types text[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_guests    integer   NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_guests    integer   NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS price_2       numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_3_6     numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_7_20    numeric(10,2) NOT NULL DEFAULT 0;
