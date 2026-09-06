-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 3: AI USAGE QUOTA AND COST PROTECTION SYSTEM
-- Chithi Lekhi AI — Robust quota verification, post-generation deduction, and AI usage audit
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. AI USAGE AUDIT TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  identifier TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'generation', 'refinement', 'voice'
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON public.ai_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_identifier ON public.ai_usage(identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_action ON public.ai_usage(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON public.ai_usage(created_at DESC);

-- ── 2. ADD REFINEMENTS_USED TO USER_USAGE TABLE ─────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name='user_usage' AND column_name='refinements_used'
  ) THEN
    ALTER TABLE public.user_usage ADD COLUMN refinements_used INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ── 3. ATOMIC QUOTA CONSUMPTION FUNCTION (RACE-CONDITION SAFE) ──────────────
CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_identifier TEXT,
  p_date DATE,
  p_action_type TEXT,
  p_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used INTEGER;
  v_allowed BOOLEAN;
  v_row public.user_usage%ROWTYPE;
BEGIN
  -- Insert or lock row for update
  INSERT INTO public.user_usage (identifier, date, letters_generated, refinements_used, voice_letters_used, hd_exports_used)
  VALUES (p_identifier, p_date, 0, 0, 0, 0)
  ON CONFLICT (identifier, date) DO NOTHING;

  SELECT * INTO v_row
  FROM public.user_usage
  WHERE identifier = p_identifier AND date = p_date
  FOR UPDATE;

  IF p_action_type = 'refinement' THEN
    v_used := v_row.refinements_used;
  ELSE
    v_used := v_row.letters_generated;
  END IF;

  -- Unlimited check (-1)
  IF p_limit = -1 THEN
    v_allowed := true;
  ELSE
    v_allowed := (v_used < p_limit);
  END IF;

  IF v_allowed THEN
    IF p_action_type = 'refinement' THEN
      UPDATE public.user_usage
      SET refinements_used = refinements_used + 1,
          updated_at = now()
      WHERE id = v_row.id;
      v_used := v_used + 1;
    ELSE
      UPDATE public.user_usage
      SET letters_generated = letters_generated + 1,
          updated_at = now()
      WHERE id = v_row.id;
      v_used := v_used + 1;
    END IF;

    RETURN jsonb_build_object(
      'consumed', true,
      'used', v_used,
      'limit', p_limit,
      'remaining', CASE WHEN p_limit = -1 THEN -1 ELSE GREATEST(0, p_limit - v_used) END
    );
  ELSE
    RETURN jsonb_build_object(
      'consumed', false,
      'used', v_used,
      'limit', p_limit,
      'remaining', 0
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_ai_quota(TEXT, DATE, TEXT, INTEGER) TO anon, authenticated, service_role;

-- ── 4. ROW LEVEL SECURITY (RLS) FOR AI_USAGE ─────────────────────────────────
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai_usage" ON public.ai_usage;
CREATE POLICY "Users can view own ai_usage" 
  ON public.ai_usage FOR SELECT 
  USING (auth.uid() IS NOT NULL AND auth.uid()::TEXT = user_id::TEXT);

DROP POLICY IF EXISTS "System can insert ai_usage" ON public.ai_usage;
CREATE POLICY "System can insert ai_usage" 
  ON public.ai_usage FOR INSERT 
  WITH CHECK (true);
