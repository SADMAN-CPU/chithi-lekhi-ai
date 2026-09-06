-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 05: DATABASE UPGRADE MIGRATION
-- Chithi Lekhi AI — Letters and Profiles Schema
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable pgcrypto / uuid extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. PROFILES TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 2. LETTERS TABLE (UPGRADED) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  receiver_name TEXT NOT NULL,
  relationship TEXT,
  emotion TEXT,
  style TEXT,
  era_style TEXT,
  language TEXT NOT NULL DEFAULT 'bengali',
  memory_context TEXT,
  content TEXT NOT NULL,
  favorite BOOLEAN NOT NULL DEFAULT false,
  share_slug TEXT UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe column additions in case letters table already existed (Do not break existing data)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='relationship') THEN
    ALTER TABLE public.letters ADD COLUMN relationship TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='era_style') THEN
    ALTER TABLE public.letters ADD COLUMN era_style TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='memory_context') THEN
    ALTER TABLE public.letters ADD COLUMN memory_context TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='favorite') THEN
    ALTER TABLE public.letters ADD COLUMN favorite BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='share_slug') THEN
    ALTER TABLE public.letters ADD COLUMN share_slug TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='is_public') THEN
    ALTER TABLE public.letters ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- ── 3. PERFORMANCE INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_letters_user_id ON public.letters(user_id);
CREATE INDEX IF NOT EXISTS idx_letters_user_favorite ON public.letters(user_id, favorite);
CREATE INDEX IF NOT EXISTS idx_letters_share_slug ON public.letters(share_slug);
CREATE INDEX IF NOT EXISTS idx_letters_created_at ON public.letters(created_at DESC);

-- ── 4. ROW LEVEL SECURITY (RLS) POLICIES ─────────────────────────────────────
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;

-- Select Policy: Users can view their own letters OR letters that are public / shared
DROP POLICY IF EXISTS "Letters are viewable by owner or if shared" ON public.letters;
CREATE POLICY "Letters are viewable by owner or if shared" 
  ON public.letters FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR is_public = true 
    OR share_slug IS NOT NULL
  );

-- Insert Policy: Authenticated users can insert their own letters, or guests can insert unlinked letters
DROP POLICY IF EXISTS "Users can insert letters" ON public.letters;
CREATE POLICY "Users can insert letters" 
  ON public.letters FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    OR user_id IS NULL
  );

-- Update Policy: Users can only update their own letters
DROP POLICY IF EXISTS "Users can update own letters" ON public.letters;
CREATE POLICY "Users can update own letters" 
  ON public.letters FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete Policy: Users can only delete their own letters
DROP POLICY IF EXISTS "Users can delete own letters" ON public.letters;
CREATE POLICY "Users can delete own letters" 
  ON public.letters FOR DELETE 
  USING (auth.uid() = user_id);
