-- ─────────────────────────────────────────────────────────────────────────────
-- chef_menus
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chef_menus (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         uuid NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  -- Multi-select up to 3 cuisine types
  cuisine_types   text[] NOT NULL DEFAULT '{}' CHECK (
                    array_length(cuisine_types, 1) IS NULL OR array_length(cuisine_types, 1) <= 3
                  ),
  image_url       text,
  -- Guest range (UI defaults: min=2, max=20)
  min_guests      integer NOT NULL DEFAULT 2 CHECK (min_guests >= 1),
  max_guests      integer NOT NULL DEFAULT 20 CHECK (max_guests >= min_guests),
  -- Fixed price tiers (price per person, USD)
  price_2         numeric(10,2) NOT NULL DEFAULT 0 CHECK (price_2 >= 0),
  price_3_6       numeric(10,2) NOT NULL DEFAULT 0 CHECK (price_3_6 >= 0),
  price_7_20      numeric(10,2) NOT NULL DEFAULT 0 CHECK (price_7_20 >= 0),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chef_menus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chef reads own menus" ON public.chef_menus;
CREATE POLICY "Chef reads own menus"
  ON public.chef_menus FOR SELECT
  USING (
    chef_id IN (SELECT id FROM public.chef_profiles WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- menu_course_settings
-- Stores the selection mode per course per menu.
-- "Todo incluido" = all_inclusive  |  "Elegir N" = choose_1/2/3
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.menu_course_settings (
  menu_id         uuid NOT NULL REFERENCES public.chef_menus(id) ON DELETE CASCADE,
  course          text NOT NULL CHECK (course IN ('starter', 'first_course', 'main', 'dessert')),
  selection_mode  text NOT NULL DEFAULT 'all_inclusive'
                    CHECK (selection_mode IN ('all_inclusive', 'choose_1', 'choose_2', 'choose_3')),
  PRIMARY KEY (menu_id, course)
);

ALTER TABLE public.menu_course_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chef reads own menu course settings" ON public.menu_course_settings;
CREATE POLICY "Chef reads own menu course settings"
  ON public.menu_course_settings FOR SELECT
  USING (
    menu_id IN (
      SELECT id FROM public.chef_menus
      WHERE chef_id IN (SELECT id FROM public.chef_profiles WHERE user_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- menu_dishes
-- N:M between chef_menus and dishes.
-- dish.course already tells us which course this dish belongs to.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.menu_dishes (
  menu_id     uuid NOT NULL REFERENCES public.chef_menus(id) ON DELETE CASCADE,
  dish_id     uuid NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (menu_id, dish_id)
);

ALTER TABLE public.menu_dishes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chef reads own menu dishes" ON public.menu_dishes;
CREATE POLICY "Chef reads own menu dishes"
  ON public.menu_dishes FOR SELECT
  USING (
    menu_id IN (
      SELECT id FROM public.chef_menus
      WHERE chef_id IN (SELECT id FROM public.chef_profiles WHERE user_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER functions
-- All writes go through these functions to bypass RLS safely.
-- ─────────────────────────────────────────────────────────────────────────────

-- Create a menu (returns new menu id)
CREATE OR REPLACE FUNCTION create_menu(
  p_title         text,
  p_description   text,
  p_cuisine_types text[],
  p_image_url     text,
  p_min_guests    integer,
  p_max_guests    integer,
  p_price_2       numeric,
  p_price_3_6     numeric,
  p_price_7_20    numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chef_id  uuid;
  v_menu_id  uuid;
BEGIN
  SELECT id INTO v_chef_id
  FROM chef_profiles WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RAISE EXCEPTION 'Chef profile not found';
  END IF;

  INSERT INTO chef_menus (
    chef_id, title, description, cuisine_types, image_url,
    min_guests, max_guests, price_2, price_3_6, price_7_20
  )
  VALUES (
    v_chef_id, p_title, p_description, p_cuisine_types, p_image_url,
    p_min_guests, p_max_guests, p_price_2, p_price_3_6, p_price_7_20
  )
  RETURNING id INTO v_menu_id;

  RETURN v_menu_id;
END;
$$;

-- Update menu metadata (does not touch dishes or course settings)
CREATE OR REPLACE FUNCTION update_menu(
  p_menu_id       uuid,
  p_title         text,
  p_description   text,
  p_cuisine_types text[],
  p_image_url     text,
  p_min_guests    integer,
  p_max_guests    integer,
  p_price_2       numeric,
  p_price_3_6     numeric,
  p_price_7_20    numeric
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
  FROM chef_profiles WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RAISE EXCEPTION 'Chef profile not found';
  END IF;

  UPDATE chef_menus
  SET title         = p_title,
      description   = p_description,
      cuisine_types = p_cuisine_types,
      image_url     = p_image_url,
      min_guests    = p_min_guests,
      max_guests    = p_max_guests,
      price_2       = p_price_2,
      price_3_6     = p_price_3_6,
      price_7_20    = p_price_7_20,
      updated_at    = now()
  WHERE id = p_menu_id AND chef_id = v_chef_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Menu not found or not owned by this chef';
  END IF;
END;
$$;

-- Delete a menu (cascades to menu_course_settings and menu_dishes)
CREATE OR REPLACE FUNCTION delete_menu(
  p_menu_id uuid
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
  FROM chef_profiles WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RAISE EXCEPTION 'Chef profile not found';
  END IF;

  DELETE FROM chef_menus
  WHERE id = p_menu_id AND chef_id = v_chef_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Menu not found or not owned by this chef';
  END IF;
END;
$$;

-- Upsert the selection mode for a course in a menu
CREATE OR REPLACE FUNCTION set_course_selection_mode(
  p_menu_id        uuid,
  p_course         text,
  p_selection_mode text
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
  FROM chef_profiles WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RAISE EXCEPTION 'Chef profile not found';
  END IF;

  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM chef_menus WHERE id = p_menu_id AND chef_id = v_chef_id
  ) THEN
    RAISE EXCEPTION 'Menu not found or not owned by this chef';
  END IF;

  INSERT INTO menu_course_settings (menu_id, course, selection_mode)
  VALUES (p_menu_id, p_course, p_selection_mode)
  ON CONFLICT (menu_id, course) DO UPDATE
    SET selection_mode = EXCLUDED.selection_mode;
END;
$$;

-- Add a dish to a menu
CREATE OR REPLACE FUNCTION add_dish_to_menu(
  p_menu_id    uuid,
  p_dish_id    uuid,
  p_sort_order integer DEFAULT 0
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
  FROM chef_profiles WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RAISE EXCEPTION 'Chef profile not found';
  END IF;

  -- Verify both menu and dish belong to this chef
  IF NOT EXISTS (
    SELECT 1 FROM chef_menus WHERE id = p_menu_id AND chef_id = v_chef_id
  ) THEN
    RAISE EXCEPTION 'Menu not found or not owned by this chef';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM dishes WHERE id = p_dish_id AND chef_id = v_chef_id
  ) THEN
    RAISE EXCEPTION 'Dish not found or not owned by this chef';
  END IF;

  INSERT INTO menu_dishes (menu_id, dish_id, sort_order)
  VALUES (p_menu_id, p_dish_id, p_sort_order)
  ON CONFLICT (menu_id, dish_id) DO UPDATE
    SET sort_order = EXCLUDED.sort_order;
END;
$$;

-- Sync all dishes for a menu atomically (clears existing and re-inserts)
CREATE OR REPLACE FUNCTION sync_menu_dishes(
  p_menu_id  uuid,
  p_dish_ids uuid[]
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
  FROM chef_profiles WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RAISE EXCEPTION 'Chef profile not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM chef_menus WHERE id = p_menu_id AND chef_id = v_chef_id
  ) THEN
    RAISE EXCEPTION 'Menu not found or not owned by this chef';
  END IF;

  DELETE FROM menu_dishes WHERE menu_id = p_menu_id;

  IF p_dish_ids IS NOT NULL AND array_length(p_dish_ids, 1) > 0 THEN
    INSERT INTO menu_dishes (menu_id, dish_id, sort_order)
    SELECT p_menu_id, t.dish_id, (row_number() OVER ()) - 1
    FROM unnest(p_dish_ids) AS t(dish_id)
    WHERE EXISTS (
      SELECT 1 FROM dishes WHERE id = t.dish_id AND chef_id = v_chef_id
    );
  END IF;
END;
$$;

-- Remove a dish from a menu
CREATE OR REPLACE FUNCTION remove_dish_from_menu(
  p_menu_id uuid,
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
  FROM chef_profiles WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RAISE EXCEPTION 'Chef profile not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM chef_menus WHERE id = p_menu_id AND chef_id = v_chef_id
  ) THEN
    RAISE EXCEPTION 'Menu not found or not owned by this chef';
  END IF;

  DELETE FROM menu_dishes
  WHERE menu_id = p_menu_id AND dish_id = p_dish_id;
END;
$$;
