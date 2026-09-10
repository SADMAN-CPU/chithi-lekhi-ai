-- ══════════════════════════════════════════════════════════════════════════════
-- CHITHI LEKHI AI — SECURITY, PERSISTENCE & QUOTA HARDENING MIGRATION
-- Fixes:
-- 1. Admin Privilege Escalation (disallow role self-assignment in handle_new_user)
-- 2. Non-recursive is_admin() SECURITY DEFINER function for public.profiles RLS
-- 3. Preserve manual user edits in sync_letters_canonical_v2() trigger
-- 4. Enable and grant proper RLS policies on public.user_usage
-- 5. Support 'voice' action type in consume_ai_quota() procedure
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Hardened handle_new_user() Trigger Function ──────────────────────────
-- Explicitly defaults role to 'user'. Never trusts raw_user_meta_data->>'role'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    'user', -- SECURITY: Force default role to 'user'. Never allow self-assigned 'admin'.
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    -- Role cannot be changed by user metadata update; retain existing database role
    role = COALESCE(public.profiles.role, 'user'),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ── 2. Non-Recursive Admin Verification & Profile RLS ────────────────────────
-- Eliminates infinite recursion caused by querying public.profiles inside a profiles RLS policy.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Fast path: Check JWT app_metadata (managed only by Supabase service_role)
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' THEN
    RETURN true;
  END IF;

  -- 2. Authoritative check on public.profiles using SECURITY DEFINER (bypasses RLS)
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update profiles admin policy to use non-recursive function
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());


-- ── 3. Canonical Trigger: Preserve User Edits to Content ────────────────────
-- Prevents generated_content from overwriting manual edits made to content.
CREATE OR REPLACE FUNCTION public.sync_letters_canonical_v2()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync recipient names
  IF NEW.recipient_name IS NOT NULL AND (NEW.receiver_name IS NULL OR NEW.receiver_name = '') THEN
    NEW.receiver_name := NEW.recipient_name;
  ELSIF NEW.receiver_name IS NOT NULL AND (NEW.recipient_name IS NULL OR NEW.recipient_name = '') THEN
    NEW.recipient_name := NEW.receiver_name;
  END IF;

  -- Sync raw original input
  IF NEW.original_input IS NOT NULL AND NEW.original_input != '' THEN
    NEW.original_letter := NEW.original_input;
    IF NEW.memory_context IS NULL THEN
      NEW.memory_context := NEW.original_input;
    END IF;
  ELSIF NEW.original_letter IS NOT NULL AND NEW.original_letter != '' THEN
    NEW.original_input := NEW.original_letter;
  END IF;

  -- Sync content vs generated_content
  IF TG_OP = 'UPDATE' THEN
    -- If user intentionally edited 'content', preserve it and DO NOT overwrite with generated_content
    IF NEW.content IS DISTINCT FROM OLD.content AND NEW.generated_content IS NOT DISTINCT FROM OLD.generated_content THEN
      NEW.letter_content := NEW.content;
    ELSIF NEW.generated_content IS DISTINCT FROM OLD.generated_content AND NEW.content IS NOT DISTINCT FROM OLD.content THEN
      NEW.content := NEW.generated_content;
      NEW.letter_content := NEW.generated_content;
    ELSIF NEW.letter_content IS DISTINCT FROM OLD.letter_content AND NEW.content IS NOT DISTINCT FROM OLD.content THEN
      NEW.content := NEW.letter_content;
      NEW.generated_content := NEW.letter_content;
    ELSE
      -- Fallback: if content is set, ensure legacy column matches
      IF NEW.content IS NOT NULL AND NEW.content != '' THEN
        NEW.letter_content := NEW.content;
      ELSIF NEW.generated_content IS NOT NULL AND NEW.generated_content != '' THEN
        NEW.content := NEW.generated_content;
        NEW.letter_content := NEW.generated_content;
      END IF;
    END IF;
  ELSE -- INSERT
    IF NEW.content IS NOT NULL AND NEW.content != '' THEN
      IF NEW.generated_content IS NULL OR NEW.generated_content = '' THEN
        NEW.generated_content := NEW.content;
      END IF;
      NEW.letter_content := NEW.content;
    ELSIF NEW.generated_content IS NOT NULL AND NEW.generated_content != '' THEN
      NEW.content := NEW.generated_content;
      NEW.letter_content := NEW.generated_content;
    ELSIF NEW.letter_content IS NOT NULL AND NEW.letter_content != '' THEN
      NEW.content := NEW.letter_content;
      NEW.generated_content := NEW.letter_content;
    END IF;
  END IF;

  -- Sync enhanced content
  IF NEW.enhanced_content IS NOT NULL AND NEW.enhanced_content != '' THEN
    NEW.enhanced_letter := NEW.enhanced_content;
  ELSIF NEW.enhanced_letter IS NOT NULL AND NEW.enhanced_letter != '' THEN
    NEW.enhanced_content := NEW.enhanced_letter;
  END IF;

  -- Sync share_id
  IF NEW.share_id IS NOT NULL AND NEW.share_id != '' THEN
    NEW.share_slug := NEW.share_id;
  ELSIF NEW.share_slug IS NOT NULL AND NEW.share_slug != '' THEN
    NEW.share_id := NEW.share_slug;
  ELSIF NEW.share_id IS NULL THEN
    NEW.share_id := substring(replace(NEW.id::text, '-', ''), 1, 6);
    NEW.share_slug := NEW.share_id;
  END IF;

  -- Auto-update timestamp
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 4. RLS Policies on public.user_usage ────────────────────────────────────
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- Allow service role full administrative access
DROP POLICY IF EXISTS "Service role has full access to user_usage" ON public.user_usage;
CREATE POLICY "Service role has full access to user_usage"
  ON public.user_usage FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to view their own usage records
DROP POLICY IF EXISTS "Users can view own usage" ON public.user_usage;
CREATE POLICY "Users can view own usage"
  ON public.user_usage FOR SELECT
  TO authenticated
  USING (identifier = 'user:' || auth.uid()::text);


-- ── 5. Hardened consume_ai_quota() with 'voice' Support ──────────────────────
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
  ELSIF p_action_type = 'voice' THEN
    v_used := v_row.voice_letters_used;
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
    ELSIF p_action_type = 'voice' THEN
      UPDATE public.user_usage
      SET voice_letters_used = voice_letters_used + 1,
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
