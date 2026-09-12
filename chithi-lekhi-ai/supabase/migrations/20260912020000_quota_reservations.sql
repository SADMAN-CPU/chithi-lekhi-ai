-- Reserve one in-flight operation per identifier/day/action before paying for
-- AI. Counters are incremented only after success. Expiry recovers abandoned
-- work; a reservation token prevents late failures from releasing newer work.
ALTER TABLE public.user_usage
  ADD COLUMN IF NOT EXISTS quota_reservations JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_action_type_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_action_type_check
  CHECK (action_type IN ('generation', 'refinement', 'voice')) NOT VALID;

CREATE OR REPLACE FUNCTION public.reserve_ai_quota(
  p_identifier TEXT,
  p_date DATE,
  p_action_type TEXT,
  p_limit INTEGER,
  p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.user_usage%ROWTYPE;
  v_used INTEGER;
  v_lease JSONB;
  v_now TIMESTAMPTZ;
BEGIN
  IF p_identifier IS NULL OR btrim(p_identifier) = '' OR p_date IS NULL
    OR p_action_type IS NULL OR p_action_type NOT IN ('generation', 'refinement', 'voice')
    OR p_limit IS NULL OR p_limit < -1 OR p_reservation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid quota reservation' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_usage (identifier, date)
  VALUES (p_identifier, p_date) ON CONFLICT (identifier, date) DO NOTHING;
  SELECT * INTO v_row FROM public.user_usage
  WHERE identifier = p_identifier AND date = p_date FOR UPDATE;
  v_now := clock_timestamp();
  v_used := CASE p_action_type
    WHEN 'refinement' THEN v_row.refinements_used
    WHEN 'voice' THEN v_row.voice_letters_used
    ELSE v_row.letters_generated END;
  v_lease := v_row.quota_reservations -> p_action_type;

  IF (v_lease ->> 'expires_at')::timestamptz > v_now THEN
    IF v_lease ->> 'id' = p_reservation_id::text THEN
      RETURN jsonb_build_object('allowed', true, 'used', v_used);
    END IF;
    RETURN jsonb_build_object('allowed', false, 'used', v_used, 'reason', 'busy');
  END IF;
  IF p_limit <> -1 AND v_used >= p_limit THEN
    RETURN jsonb_build_object('allowed', false, 'used', v_used, 'reason', 'limit');
  END IF;

  UPDATE public.user_usage SET quota_reservations = jsonb_set(
    quota_reservations, ARRAY[p_action_type],
    jsonb_build_object('id', p_reservation_id, 'expires_at', v_now + interval '120 seconds')
  ), updated_at = v_now WHERE id = v_row.id;
  RETURN jsonb_build_object('allowed', true, 'used', v_used);
END;
$$;

-- Replace the old signature so PostgreSQL/PostgREST do not see an ambiguous
-- four-argument overload. The default keeps existing four-argument calls valid.
DROP FUNCTION IF EXISTS public.consume_ai_quota(TEXT, DATE, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_identifier TEXT,
  p_date DATE,
  p_action_type TEXT,
  p_limit INTEGER,
  p_reservation_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.user_usage%ROWTYPE;
  v_used INTEGER;
  v_lease JSONB;
  v_reason TEXT;
BEGIN
  IF p_identifier IS NULL OR btrim(p_identifier) = '' OR p_date IS NULL
    OR p_action_type IS NULL OR p_action_type NOT IN ('generation', 'refinement', 'voice')
    OR p_limit IS NULL OR p_limit < -1 THEN
    RAISE EXCEPTION 'Invalid quota consumption' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_usage (identifier, date)
  VALUES (p_identifier, p_date) ON CONFLICT (identifier, date) DO NOTHING;
  SELECT * INTO v_row FROM public.user_usage
  WHERE identifier = p_identifier AND date = p_date FOR UPDATE;
  v_used := CASE p_action_type
    WHEN 'refinement' THEN v_row.refinements_used
    WHEN 'voice' THEN v_row.voice_letters_used
    ELSE v_row.letters_generated END;
  v_lease := v_row.quota_reservations -> p_action_type;

  IF p_reservation_id IS NOT NULL THEN
    IF (v_lease ->> 'id') IS DISTINCT FROM p_reservation_id::text THEN
      v_reason := 'invalid_reservation';
    END IF;
  ELSIF (v_lease ->> 'expires_at')::timestamptz > clock_timestamp() THEN
    v_reason := 'busy';
  END IF;
  IF v_reason IS NULL AND p_limit <> -1 AND v_used >= p_limit THEN
    v_reason := 'limit';
  END IF;
  IF v_reason IS NOT NULL THEN
    RETURN jsonb_build_object('consumed', false, 'used', v_used,
      'limit', p_limit, 'remaining', CASE WHEN p_limit = -1 THEN -1 ELSE greatest(0, p_limit - v_used) END,
      'reason', v_reason);
  END IF;

  UPDATE public.user_usage SET
    letters_generated = letters_generated + CASE WHEN p_action_type = 'generation' THEN 1 ELSE 0 END,
    refinements_used = refinements_used + CASE WHEN p_action_type = 'refinement' THEN 1 ELSE 0 END,
    voice_letters_used = voice_letters_used + CASE WHEN p_action_type = 'voice' THEN 1 ELSE 0 END,
    quota_reservations = quota_reservations - p_action_type,
    updated_at = clock_timestamp()
  WHERE id = v_row.id;
  v_used := v_used + 1;
  RETURN jsonb_build_object('consumed', true, 'used', v_used, 'limit', p_limit,
    'remaining', CASE WHEN p_limit = -1 THEN -1 ELSE greatest(0, p_limit - v_used) END);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ai_quota(
  p_identifier TEXT,
  p_date DATE,
  p_action_type TEXT,
  p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_action_type IS NULL OR p_action_type NOT IN ('generation', 'refinement', 'voice')
    OR p_reservation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid quota release' USING ERRCODE = '22023';
  END IF;
  UPDATE public.user_usage SET
    quota_reservations = quota_reservations - p_action_type,
    updated_at = clock_timestamp()
  WHERE identifier = p_identifier AND date = p_date
    AND quota_reservations -> p_action_type ->> 'id' = p_reservation_id::text;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_quota(TEXT, DATE, TEXT, INTEGER, UUID),
  public.consume_ai_quota(TEXT, DATE, TEXT, INTEGER, UUID),
  public.release_ai_quota(TEXT, DATE, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_quota(TEXT, DATE, TEXT, INTEGER, UUID),
  public.consume_ai_quota(TEXT, DATE, TEXT, INTEGER, UUID),
  public.release_ai_quota(TEXT, DATE, TEXT, UUID)
  TO service_role;
