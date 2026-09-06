-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 08: USER LETTER VAULT SYSTEM MIGRATION
-- Chithi Lekhi AI — Letters, Favorites, Profiles, and View
-- ══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. PROFILES & USERS COMPATIBILITY ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW public.users AS
SELECT id, email, name, avatar, created_at FROM public.profiles;

-- ── 2. UPGRADE LETTERS TABLE ──────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='title') THEN
    ALTER TABLE public.letters ADD COLUMN title TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='personality') THEN
    ALTER TABLE public.letters ADD COLUMN personality TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='letter_content') THEN
    ALTER TABLE public.letters ADD COLUMN letter_content TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='theme') THEN
    ALTER TABLE public.letters ADD COLUMN theme TEXT NOT NULL DEFAULT 'vintage';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='image_url') THEN
    ALTER TABLE public.letters ADD COLUMN image_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='pdf_url') THEN
    ALTER TABLE public.letters ADD COLUMN pdf_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='is_favorite') THEN
    ALTER TABLE public.letters ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Synchronize content and letter_content, favorite and is_favorite if either was set
UPDATE public.letters
SET letter_content = content
WHERE letter_content IS NULL AND content IS NOT NULL;

UPDATE public.letters
SET content = letter_content
WHERE content IS NULL AND letter_content IS NOT NULL;

UPDATE public.letters
SET is_favorite = favorite
WHERE is_favorite IS FALSE AND favorite IS TRUE;

-- ── 3. FAVORITES TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  letter_id UUID REFERENCES public.letters(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_letter_favorite UNIQUE (user_id, letter_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_letter ON public.favorites(letter_id);

-- ── 4. RLS POLICIES FOR FAVORITES ────────────────────────────────────────────
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);
