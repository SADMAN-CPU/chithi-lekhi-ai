-- ══════════════════════════════════════════════════════════════════════════════
-- FIX PUBLIC SHARING PERSISTENCE, COMPATIBILITY & RLS
-- Chithi Lekhi AI — Ensure permanent letter persistence, unified share_id,
-- atomic view count increments, and unauthenticated public read access.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Ensure required columns exist on public.letters with full schema compatibility
DO $$
BEGIN
  -- share_id (compatible with share_slug)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'share_id') THEN
    ALTER TABLE public.letters ADD COLUMN share_id TEXT UNIQUE;
  END IF;

  -- recipient_name (compatible with receiver_name)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'recipient_name') THEN
    ALTER TABLE public.letters ADD COLUMN recipient_name TEXT;
  END IF;

  -- letter_content (compatible with content)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'letter_content') THEN
    ALTER TABLE public.letters ADD COLUMN letter_content TEXT;
  END IF;

  -- letter_style (compatible with era_style / style)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'letter_style') THEN
    ALTER TABLE public.letters ADD COLUMN letter_style TEXT;
  END IF;

  -- view_count (compatible with views)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'view_count') THEN
    ALTER TABLE public.letters ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'updated_at') THEN
    ALTER TABLE public.letters ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- 2. Populate compatibility columns for any existing rows
UPDATE public.letters
SET 
  share_id = COALESCE(share_id, share_slug),
  recipient_name = COALESCE(recipient_name, receiver_name),
  letter_content = COALESCE(letter_content, content),
  letter_style = COALESCE(letter_style, era_style, style),
  view_count = COALESCE(view_count, 0),
  updated_at = COALESCE(updated_at, created_at, now())
WHERE share_id IS NULL OR recipient_name IS NULL OR letter_content IS NULL;

-- 3. Automatic bidirectional synchronization trigger for letters schema compatibility
CREATE OR REPLACE FUNCTION public.sync_letters_schema_compatibility()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync receiver_name <-> recipient_name
  IF NEW.recipient_name IS NOT NULL AND NEW.receiver_name IS NULL THEN
    NEW.receiver_name := NEW.recipient_name;
  ELSIF NEW.receiver_name IS NOT NULL AND NEW.recipient_name IS NULL THEN
    NEW.recipient_name := NEW.receiver_name;
  END IF;

  -- Sync content <-> letter_content
  IF NEW.letter_content IS NOT NULL AND NEW.content IS NULL THEN
    NEW.content := NEW.letter_content;
  ELSIF NEW.content IS NOT NULL AND NEW.letter_content IS NULL THEN
    NEW.letter_content := NEW.content;
  END IF;

  -- Sync share_slug <-> share_id
  IF NEW.share_id IS NOT NULL AND NEW.share_slug IS NULL THEN
    NEW.share_slug := NEW.share_id;
  ELSIF NEW.share_slug IS NOT NULL AND NEW.share_id IS NULL THEN
    NEW.share_id := NEW.share_slug;
  END IF;

  -- Sync era_style <-> letter_style
  IF NEW.letter_style IS NOT NULL AND NEW.era_style IS NULL THEN
    NEW.era_style := NEW.letter_style;
  ELSIF NEW.era_style IS NOT NULL AND NEW.letter_style IS NULL THEN
    NEW.letter_style := NEW.era_style;
  END IF;

  -- Ensure updated_at is always current
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_letters_compatibility ON public.letters;
CREATE TRIGGER trg_sync_letters_compatibility
  BEFORE INSERT OR UPDATE ON public.letters
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_letters_schema_compatibility();

-- 4. Atomic view counter RPC function
CREATE OR REPLACE FUNCTION public.increment_letter_view_count(target_share_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_new_views INTEGER;
BEGIN
  UPDATE public.letters
  SET view_count = view_count + 1
  WHERE share_id = target_share_id OR share_slug = target_share_id OR id::TEXT = target_share_id
  RETURNING view_count INTO v_new_views;

  -- Also update shares table if exists
  UPDATE public.shares
  SET views = views + 1
  WHERE share_token = target_share_id OR id::TEXT = target_share_id;

  RETURN COALESCE(v_new_views, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_letter_view_count(TEXT) TO anon, authenticated, service_role;

-- 5. Hardened Row Level Security (RLS) on public.letters
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;

-- Drop previous restrictive policies
DROP POLICY IF EXISTS "Letters are viewable through active share" ON public.letters;
DROP POLICY IF EXISTS "Letters are viewable by owner" ON public.letters;
DROP POLICY IF EXISTS "Public shared letters are viewable by anyone" ON public.letters;
DROP POLICY IF EXISTS "Users can insert letters" ON public.letters;
DROP POLICY IF EXISTS "Users can update own letters" ON public.letters;

-- Policy A: Authenticated user can view own letters
CREATE POLICY "Users can view own letters"
  ON public.letters FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Policy B: Public can view any shared letter without authentication
CREATE POLICY "Public shared letters are viewable by anyone"
  ON public.letters FOR SELECT
  USING (
    is_public = true 
    OR share_id IS NOT NULL 
    OR share_slug IS NOT NULL
  );

-- Policy C: Anyone (guest or authenticated) can insert letters
CREATE POLICY "Anyone can insert letters"
  ON public.letters FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (user_id IS NULL)
  );

-- Policy D: Users can update their own letters, and guests can update unowned shared letters
CREATE POLICY "Users can update own or guest letters"
  ON public.letters FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (user_id IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (user_id IS NULL)
  );

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_letters_share_id ON public.letters(share_id);
CREATE INDEX IF NOT EXISTS idx_letters_share_slug ON public.letters(share_slug);
CREATE INDEX IF NOT EXISTS idx_letters_is_public ON public.letters(is_public);
