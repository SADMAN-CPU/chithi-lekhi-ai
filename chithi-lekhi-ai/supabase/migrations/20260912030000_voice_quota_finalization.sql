-- Publish generated audio only when both persistence and quota consumption
-- succeed. Failed writes do not charge; a lost reservation cannot publish free
-- cached audio for a later request to retrieve.
CREATE OR REPLACE FUNCTION public.finalize_voice_generation(
  p_identifier TEXT,
  p_date DATE,
  p_limit INTEGER,
  p_reservation_id UUID,
  p_content_hash TEXT,
  p_voice_style TEXT,
  p_audio_base64 TEXT,
  p_audio_format TEXT,
  p_file_size_bytes INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_reservation_id IS NULL OR p_content_hash IS NULL
    OR p_content_hash !~ '^[0-9a-f]{64}$'
    OR p_voice_style IS NULL OR btrim(p_voice_style) = ''
    OR p_audio_base64 IS NULL OR p_audio_base64 = ''
    OR p_audio_format IS NULL OR p_audio_format NOT IN ('mp3', 'wav')
    OR p_file_size_bytes IS NULL OR p_file_size_bytes < 0 THEN
    RAISE EXCEPTION 'Invalid voice cache record' USING ERRCODE = '22023';
  END IF;

  BEGIN
    INSERT INTO public.voice_cache
      (content_hash, voice_style, audio_url, audio_format, file_size_bytes)
    VALUES
      (p_content_hash, p_voice_style, p_audio_base64, p_audio_format, p_file_size_bytes)
    ON CONFLICT (content_hash) DO UPDATE SET
      voice_style = EXCLUDED.voice_style,
      audio_url = EXCLUDED.audio_url,
      audio_format = EXCLUDED.audio_format,
      file_size_bytes = EXCLUDED.file_size_bytes;

    v_result := public.consume_ai_quota(
      p_identifier, p_date, 'voice', p_limit, p_reservation_id);
    IF NOT COALESCE((v_result ->> 'consumed')::boolean, false) THEN
      RAISE EXCEPTION 'Voice quota reservation was not consumed' USING ERRCODE = 'PZ001';
    END IF;

    INSERT INTO public.ai_usage
      (user_id, identifier, action_type, model, tokens_used, success)
    VALUES (
      CASE WHEN p_identifier ~ '^user:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN substring(p_identifier FROM 6)::uuid ELSE NULL END,
      p_identifier, 'voice', 'openai/tts-1', 0, true
    );
  EXCEPTION WHEN SQLSTATE 'PZ001' THEN
    -- The nested transaction rolls back the cache write, retaining this result.
    RETURN v_result;
  END;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_voice_generation(
  TEXT, DATE, INTEGER, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_voice_generation(
  TEXT, DATE, INTEGER, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER)
  TO service_role;
