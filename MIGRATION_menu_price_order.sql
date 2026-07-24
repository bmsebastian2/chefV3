-- ============================================================================
-- MIGRACIÓN · Monotonía de precios por bracket en menús del chef
--
-- Contexto: los rangos recomendados de cada bracket se solapan (price_3_6
-- 189–336 vs price_7_20 147–294), así que nada impedía cargar un menú "al
-- revés" (7–20 más caro que 3–6). Un menú así rompe la lógica de precios en
-- todo el sistema — propuestas y re-precio de la reserva incluidos: el cliente
-- vería SUBIR el por-persona al agregar comensales (caso real detectado:
-- price_7_20 = 290 > price_3_6 = 189).
--
-- Regla: a más personas, el por-persona baja o queda igual, nunca sube:
--   price_2 ≥ price_3_6 ≥ price_7_20  (solo entre valores > 0; el editor
--   manda 0 cuando el campo está vacío y eso no se compara).
--
-- Mismo chequeo que el editor (MenuEditorClient.priceOrderError); acá es el
-- blindaje real contra requests directos.
--
-- Base: definiciones vigentes de create_menu/update_menu en
-- create_menus_tables.sql (única migración que las define, verificado por
-- grep). Firmas SIN cambios → CREATE OR REPLACE seguro (no hay overload).
-- Cambios marcados con [PRICE_ORDER].
-- ============================================================================

-- ── Chequeo compartido ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assert_menu_price_order(
  p_price_2    numeric,
  p_price_3_6  numeric,
  p_price_7_20 numeric
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF COALESCE(p_price_2, 0) > 0 AND COALESCE(p_price_3_6, 0) > 0
     AND p_price_3_6 > p_price_2 THEN
    RAISE EXCEPTION 'menu_price_order: 3-6 no puede superar 2 personas';
  END IF;
  IF COALESCE(p_price_3_6, 0) > 0 AND COALESCE(p_price_7_20, 0) > 0
     AND p_price_7_20 > p_price_3_6 THEN
    RAISE EXCEPTION 'menu_price_order: 7-20 no puede superar 3-6 personas';
  END IF;
  IF COALESCE(p_price_2, 0) > 0 AND COALESCE(p_price_7_20, 0) > 0
     AND p_price_7_20 > p_price_2 THEN
    RAISE EXCEPTION 'menu_price_order: 7-20 no puede superar 2 personas';
  END IF;
END;
$$;

-- ── create_menu ─────────────────────────────────────────────────────────────
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

  PERFORM assert_menu_price_order(p_price_2, p_price_3_6, p_price_7_20);  -- [PRICE_ORDER]

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

-- ── update_menu ─────────────────────────────────────────────────────────────
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

  PERFORM assert_menu_price_order(p_price_2, p_price_3_6, p_price_7_20);  -- [PRICE_ORDER]

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
