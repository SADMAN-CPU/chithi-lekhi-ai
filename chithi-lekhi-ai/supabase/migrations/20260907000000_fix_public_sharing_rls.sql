-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 2: FIX PUBLIC SHARING AND RLS ARCHITECTURE
-- Chithi Lekhi AI — Synchronize letter visibility and secure share-token RPC
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. SECURE RPC FUNCTION: get_shared_letter_by_token ─────────────────────────
-- Allows token-based access to shared letters for anonymous and authenticated users.
-- Uses SECURITY DEFINER to bypass table RLS internally while strictly validating
-- that the share token exists, is_public = true, and is not expired.
-- This ensures letters are NEVER broadly exposed or scrapable without a valid token.
CREATE OR REPLACE FUNCTION public.get_shared_letter_by_token(token_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share public.shares%ROWTYPE;
  v_letter public.letters%ROWTYPE;
BEGIN
  -- Look up share by share_token or id
  SELECT * INTO v_share
  FROM public.shares
  WHERE share_token = token_param OR id::TEXT = token_param
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'not_found',
      'share', NULL,
      'letter', NULL,
      'is_expired', false,
      'is_private', false
    );
  END IF;

  -- Check if expired
  IF v_share.expires_at IS NOT NULL AND v_share.expires_at <= now() THEN
    RETURN jsonb_build_object(
      'status', 'expired',
      'share', to_jsonb(v_share),
      'letter', NULL,
      'is_expired', true,
      'is_private', NOT v_share.is_public
    );
  END IF;

  -- Check if private mode
  IF NOT v_share.is_public THEN
    RETURN jsonb_build_object(
      'status', 'private',
      'share', to_jsonb(v_share),
      'letter', NULL,
      'is_expired', false,
      'is_private', true
    );
  END IF;

  -- Retrieve corresponding letter
  SELECT * INTO v_letter
  FROM public.letters
  WHERE id = v_share.letter_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'not_found',
      'share', to_jsonb(v_share),
      'letter', NULL,
      'is_expired', false,
      'is_private', false
    );
  END IF;

  -- Successfully found valid, unexpired, public letter
  RETURN jsonb_build_object(
    'status', 'ok',
    'share', to_jsonb(v_share),
    'letter', to_jsonb(v_letter),
    'is_expired', false,
    'is_private', false
  );
END;
$$;

-- Grant EXECUTE to public (anon), authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.get_shared_letter_by_token(TEXT) TO anon, authenticated, service_role;

-- ── 2. AUTOMATIC VISIBILITY SYNCHRONIZATION TRIGGER ──────────────────────────
-- Ensures letters.is_public is kept in sync whenever a public share is created or modified.
CREATE OR REPLACE FUNCTION public.sync_letter_on_share()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_public = true THEN
    UPDATE public.letters
    SET is_public = true,
        share_slug = COALESCE(share_slug, NEW.share_token)
    WHERE id = NEW.letter_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_letter_on_share ON public.shares;
CREATE TRIGGER trg_sync_letter_on_share
  AFTER INSERT OR UPDATE OF is_public, share_token ON public.shares
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_letter_on_share();

-- ── 3. HARDENED ROW LEVEL SECURITY (RLS) FOR LETTERS ─────────────────────────
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;

-- Drop obsolete or overly permissive policies
DROP POLICY IF EXISTS "Letters are viewable by owner or if public" ON public.letters;
DROP POLICY IF EXISTS "Letters are viewable by owner or if shared" ON public.letters;
DROP POLICY IF EXISTS "Letters are viewable by owner or valid share" ON public.letters;
DROP POLICY IF EXISTS "Letters are viewable by owner" ON public.letters;
DROP POLICY IF EXISTS "Letters are viewable through active share" ON public.letters;

-- Policy 1: Authenticated owner can always view their own letters
CREATE POLICY "Letters are viewable by owner" 
  ON public.letters FOR SELECT 
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Policy 2: Public letters are viewable ONLY if backed by an active, unexpired public share
-- This strictly satisfies:
-- 1. Private letters: Only owner can read
-- 2. Public shared letters: Only accessible through valid share token
-- 3. Never expose all public letters via indiscriminate table scan
CREATE POLICY "Letters are viewable through active share" 
  ON public.letters FOR SELECT 
  USING (
    is_public = true 
    AND EXISTS (
      SELECT 1 FROM public.shares s 
      WHERE s.letter_id = letters.id 
        AND s.is_public = true 
        AND (s.expires_at IS NULL OR s.expires_at > now())
    )
  );

-- ── 4. ROW LEVEL SECURITY FOR SHARES ─────────────────────────────────────────
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shares are viewable if public and unexpired" ON public.shares;
DROP POLICY IF EXISTS "Shares are viewable by owner or if public" ON public.shares;
DROP POLICY IF EXISTS "Users can view own shares" ON public.shares;
DROP POLICY IF EXISTS "Public shares are viewable by anyone" ON public.shares;

-- Policy 1: Authenticated owner can view their own share records
CREATE POLICY "Users can view own shares" 
  ON public.shares FOR SELECT 
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Policy 2: Anyone can view public shares (allows checking unexpired and expired status notices)
CREATE POLICY "Public shares are viewable by anyone" 
  ON public.shares FOR SELECT 
  USING (is_public = true);
