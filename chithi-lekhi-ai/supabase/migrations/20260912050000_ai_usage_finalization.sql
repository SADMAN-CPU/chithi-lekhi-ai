-- Finalize a successful generation/refinement only when its quota deduction
-- and audit both persist. The existing quota function owns all counter logic.
CREATE OR REPLACE FUNCTION public.finalize_ai_usage(
  p_identifier TEXT,
  p_date DATE,
  p_action_type TEXT,
  p_limit INTEGER,
  p_reservation_id UUID,
  p_model TEXT,
  p_tokens_used INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_action_type IS NULL OR p_action_type NOT IN ('generation', 'refinement')
    OR p_reservation_id IS NULL OR p_model IS NULL OR btrim(p_model) = ''
    OR p_tokens_used IS NULL OR p_tokens_used < 0 THEN
    RAISE EXCEPTION 'Invalid AI usage finalization' USING ERRCODE = '22023';
  END IF;

  v_result := public.consume_ai_quota(
    p_identifier, p_date, p_action_type, p_limit, p_reservation_id);
  IF NOT COALESCE((v_result ->> 'consumed')::boolean, false) THEN
    RETURN v_result;
  END IF;

  INSERT INTO public.ai_usage
    (user_id, identifier, action_type, model, tokens_used, success)
  VALUES (
    CASE WHEN p_identifier ~ '^user:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN substring(p_identifier FROM 6)::uuid ELSE NULL END,
    p_identifier, p_action_type, p_model, p_tokens_used, true
  );
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_ai_usage(
  TEXT, DATE, TEXT, INTEGER, UUID, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_ai_usage(
  TEXT, DATE, TEXT, INTEGER, UUID, TEXT, INTEGER)
  TO service_role;
