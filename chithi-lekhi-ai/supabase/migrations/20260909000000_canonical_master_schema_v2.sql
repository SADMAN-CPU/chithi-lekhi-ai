-- ══════════════════════════════════════════════════════════════════════════════
-- CHITHI LEKHI AI — CANONICAL MASTER DATABASE SCHEMA (v2)
-- Implementation of Master Technical Specification v2
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Profiles Table Hardening
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-provision profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    role = COALESCE(public.profiles.role, EXCLUDED.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;


-- 2. Letters Table: Ensure Canonical Columns Exist
DO $$
BEGIN
  -- original_input
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'original_input') THEN
    ALTER TABLE public.letters ADD COLUMN original_input TEXT;
  END IF;

  -- generated_content
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'generated_content') THEN
    ALTER TABLE public.letters ADD COLUMN generated_content TEXT;
  END IF;

  -- enhanced_content
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'enhanced_content') THEN
    ALTER TABLE public.letters ADD COLUMN enhanced_content TEXT;
  END IF;

  -- share_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'share_id') THEN
    ALTER TABLE public.letters ADD COLUMN share_id TEXT;
  END IF;

  -- recipient_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'recipient_name') THEN
    ALTER TABLE public.letters ADD COLUMN recipient_name TEXT;
  END IF;

  -- view_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'view_count') THEN
    ALTER TABLE public.letters ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- is_public
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'is_public') THEN
    ALTER TABLE public.letters ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'updated_at') THEN
    ALTER TABLE public.letters ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- 3. Backfill Data Between Canonical and Legacy Columns
UPDATE public.letters
SET
  recipient_name = COALESCE(recipient_name, receiver_name, 'প্রিয়জন'),
  receiver_name = COALESCE(receiver_name, recipient_name, 'প্রিয়জন'),
  original_input = COALESCE(original_input, original_letter, memory_context, ''),
  generated_content = COALESCE(generated_content, letter_content, content, ''),
  enhanced_content = COALESCE(enhanced_content, enhanced_letter),
  content = COALESCE(content, generated_content, letter_content, ''),
  letter_content = COALESCE(letter_content, generated_content, content, ''),
  share_id = COALESCE(share_id, share_slug, substring(replace(id::text, '-', ''), 1, 6)),
  share_slug = COALESCE(share_slug, share_id, substring(replace(id::text, '-', ''), 1, 6)),
  view_count = COALESCE(view_count, 0),
  is_public = COALESCE(is_public, false),
  updated_at = COALESCE(updated_at, created_at, now())
WHERE
  recipient_name IS NULL
  OR receiver_name IS NULL
  OR original_input IS NULL
  OR generated_content IS NULL
  OR share_id IS NULL;


-- 4. Bidirectional Sync Trigger for Backward Compatibility
CREATE OR REPLACE FUNCTION public.sync_letters_canonical_v2()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync names
  IF NEW.recipient_name IS NOT NULL AND (NEW.receiver_name IS NULL OR NEW.receiver_name = '') THEN
    NEW.receiver_name := NEW.recipient_name;
  ELSIF NEW.receiver_name IS NOT NULL AND (NEW.recipient_name IS NULL OR NEW.recipient_name = '') THEN
    NEW.recipient_name := NEW.receiver_name;
  END IF;

  -- Sync raw input
  IF NEW.original_input IS NOT NULL AND NEW.original_input != '' THEN
    NEW.original_letter := NEW.original_input;
    IF NEW.memory_context IS NULL THEN
      NEW.memory_context := NEW.original_input;
    END IF;
  ELSIF NEW.original_letter IS NOT NULL AND NEW.original_letter != '' THEN
    NEW.original_input := NEW.original_letter;
  END IF;

  -- Sync generated content
  IF NEW.generated_content IS NOT NULL AND NEW.generated_content != '' THEN
    NEW.content := NEW.generated_content;
    NEW.letter_content := NEW.generated_content;
  ELSIF NEW.content IS NOT NULL AND NEW.content != '' THEN
    NEW.generated_content := NEW.content;
    NEW.letter_content := NEW.content;
  ELSIF NEW.letter_content IS NOT NULL AND NEW.letter_content != '' THEN
    NEW.generated_content := NEW.letter_content;
    NEW.content := NEW.letter_content;
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

DROP TRIGGER IF EXISTS trg_sync_letters_canonical ON public.letters;
CREATE TRIGGER trg_sync_letters_canonical
  BEFORE INSERT OR UPDATE ON public.letters
  FOR EACH ROW EXECUTE FUNCTION public.sync_letters_canonical_v2();


-- 5. Canonical Indexes
CREATE UNIQUE INDEX IF NOT EXISTS letters_share_id_idx ON public.letters (share_id);
CREATE INDEX IF NOT EXISTS letters_user_id_idx ON public.letters (user_id);
CREATE INDEX IF NOT EXISTS letters_public_idx ON public.letters (is_public) WHERE is_public = true;


-- 6. Canonical Row Level Security (RLS) Policies on Letters
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "letters_select_own" ON public.letters;
CREATE POLICY "letters_select_own"
  ON public.letters FOR SELECT
  USING (auth.uid() = user_id);

-- THIS IS THE CANONICAL PUBLIC READ POLICY FIXING THE 404 BUG
DROP POLICY IF EXISTS "letters_select_public" ON public.letters;
CREATE POLICY "letters_select_public"
  ON public.letters FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS "letters_insert_own" ON public.letters;
CREATE POLICY "letters_insert_own"
  ON public.letters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "letters_update_own" ON public.letters;
CREATE POLICY "letters_update_own"
  ON public.letters FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "letters_delete_own" ON public.letters;
CREATE POLICY "letters_delete_own"
  ON public.letters FOR DELETE
  USING (auth.uid() = user_id);


-- 7. letter_views — Public Reading Analytics Table
CREATE TABLE IF NOT EXISTS public.letter_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id   UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
  ip_hash     TEXT,          -- sha256(ip + daily salt), never store raw IP
  device      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS letter_views_letter_id_idx ON public.letter_views (letter_id);
CREATE INDEX IF NOT EXISTS letter_views_ip_hash_idx ON public.letter_views (ip_hash);
ALTER TABLE public.letter_views ENABLE ROW LEVEL SECURITY;


-- 8. voice_history — TTS Usage Tracking Table
CREATE TABLE IF NOT EXISTS public.voice_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id   UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
  voice_type  TEXT,
  duration    INTEGER,       -- seconds
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_history_letter_id_idx ON public.voice_history (letter_id);
ALTER TABLE public.voice_history ENABLE ROW LEVEL SECURITY;


-- 9. Atomic View Increment Function with Daily Deduping
CREATE OR REPLACE FUNCTION public.record_letter_view(
  target_share_id TEXT,
  viewer_ip_hash TEXT DEFAULT NULL,
  viewer_device TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  found_letter_id UUID;
  already_viewed_today BOOLEAN := false;
  current_views INT;
BEGIN
  -- Find letter by share_id
  SELECT id, view_count INTO found_letter_id, current_views
  FROM public.letters
  WHERE share_id = target_share_id OR share_slug = target_share_id
  LIMIT 1;

  IF found_letter_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Letter not found');
  END IF;

  -- Check deduplication for today
  IF viewer_ip_hash IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.letter_views
      WHERE letter_id = found_letter_id
        AND ip_hash = viewer_ip_hash
        AND created_at >= (now() - interval '24 hours')
    ) INTO already_viewed_today;
  END IF;

  -- Record view history
  INSERT INTO public.letter_views (letter_id, ip_hash, device, created_at)
  VALUES (found_letter_id, viewer_ip_hash, viewer_device, now());

  -- If not duplicate within 24h, increment view_count
  IF NOT already_viewed_today THEN
    UPDATE public.letters
    SET view_count = view_count + 1
    WHERE id = found_letter_id
    RETURNING view_count INTO current_views;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'letter_id', found_letter_id,
    'view_count', current_views,
    'deduplicated', already_viewed_today
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
