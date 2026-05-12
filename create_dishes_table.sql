-- ── dishes table ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dishes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id     uuid NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  course      text NOT NULL CHECK (course IN ('starter', 'first_course', 'main', 'dessert')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chef reads own dishes" ON public.dishes;
CREATE POLICY "Chef reads own dishes"
  ON public.dishes FOR SELECT
  USING (
    chef_id IN (
      SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()
    )
  );

-- ── SECURITY DEFINER functions (bypass RLS for writes) ─────────────────────

CREATE OR REPLACE FUNCTION add_dish(
  p_name   text,
  p_course text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chef_id uuid;
  v_dish_id uuid;
BEGIN
  SELECT id INTO v_chef_id
  FROM chef_profiles
  WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RAISE EXCEPTION 'Chef profile not found';
  END IF;

  INSERT INTO dishes (chef_id, name, course)
  VALUES (v_chef_id, p_name, p_course)
  RETURNING id INTO v_dish_id;

  RETURN v_dish_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_dish(
  p_dish_id uuid,
  p_name    text,
  p_course  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chef_id uuid;
BEGIN
  SELECT id INTO v_chef_id
  FROM chef_profiles
  WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RAISE EXCEPTION 'Chef profile not found';
  END IF;

  UPDATE dishes
  SET name       = p_name,
      course     = p_course,
      updated_at = now()
  WHERE id = p_dish_id
    AND chef_id = v_chef_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dish not found or not owned by this chef';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_dish(
  p_dish_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chef_id uuid;
BEGIN
  SELECT id INTO v_chef_id
  FROM chef_profiles
  WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RAISE EXCEPTION 'Chef profile not found';
  END IF;

  DELETE FROM dishes
  WHERE id = p_dish_id
    AND chef_id = v_chef_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dish not found or not owned by this chef';
  END IF;
END;
$$;
