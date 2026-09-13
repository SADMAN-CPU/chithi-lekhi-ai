-- RLS does not cover TRUNCATE or trigger creation. Remove unused client table
-- privileges from the remaining app tables while preserving row-level APIs.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.plans, public.user_subscriptions,
  public.download_history, public.favorites, public.admin_audit_logs,
  public.letter_views, public.voice_history FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_shared_letter_by_token(token_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_share public.shares%ROWTYPE;
  v_letter public.letters%ROWTYPE;
  v_expired BOOLEAN;
BEGIN
  SELECT * INTO v_share FROM public.shares
  WHERE share_token = token_param OR id::text = token_param
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found', 'share', NULL, 'letter', NULL,
      'is_expired', false, 'is_private', false);
  END IF;

  v_expired := v_share.expires_at IS NOT NULL AND v_share.expires_at <= now();
  IF v_expired OR NOT v_share.is_public THEN
    -- Audio is the letter's content too. Status notices must never expose the
    -- cached recording, owner identity, or linked letter through the public RPC.
    RETURN jsonb_build_object(
      'status', CASE WHEN v_expired THEN 'expired' ELSE 'private' END,
      'share', jsonb_build_object('share_token', v_share.share_token,
        'is_public', v_share.is_public, 'expires_at', v_share.expires_at),
      'letter', NULL, 'is_expired', v_expired, 'is_private', NOT v_share.is_public);
  END IF;

  SELECT * INTO v_letter FROM public.letters WHERE id = v_share.letter_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found', 'share', NULL, 'letter', NULL,
      'is_expired', false, 'is_private', false);
  END IF;
  RETURN jsonb_build_object('status', 'ok', 'share', to_jsonb(v_share),
    'letter', to_jsonb(v_letter), 'is_expired', false, 'is_private', false);
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_letter_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_letter_by_token(TEXT)
  TO anon, authenticated, service_role;
