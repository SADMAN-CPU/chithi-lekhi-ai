-- ══════════════════════════════════════════════════════════════════════════════
-- SAAS CORE SYSTEM MIGRATION: SUBSCRIPTION, PUBLIC SHARING, USAGE & DASHBOARD
-- Chithi Lekhi AI
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable uuid and pgcrypto extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. PLANS TABLE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  daily_letter_limit INTEGER NOT NULL DEFAULT 5, -- 5 for free, -1 for unlimited
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Free and Premium plans
INSERT INTO public.plans (id, name, name_bn, price, daily_letter_limit, features)
VALUES 
  ('free', 'Free Plan', 'ফ্রি প্ল্যান', 0, 5, '["5 AI letters/day", "Standard exports", "Basic styles"]'::jsonb),
  ('premium', 'Chithi Lekhi Premium', 'প্রিমিয়াম প্ল্যান', 199, -1, '["Unlimited letters", "Premium vintage themes", "HD 300 DPI exports", "Voice letter", "Advanced AI styles"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  daily_letter_limit = EXCLUDED.daily_letter_limit,
  features = EXCLUDED.features;

-- ── 2. USER SUBSCRIPTIONS TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  plan_id TEXT REFERENCES public.plans(id) NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due'
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. USER USAGE TRACKING TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- User UUID or hashed IP for guests
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  letters_generated INTEGER NOT NULL DEFAULT 0,
  voice_letters_used INTEGER NOT NULL DEFAULT 0,
  hd_exports_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_identifier_date UNIQUE(identifier, date)
);

CREATE INDEX IF NOT EXISTS idx_user_usage_date ON public.user_usage(date);
CREATE INDEX IF NOT EXISTS idx_user_usage_identifier ON public.user_usage(identifier);

-- ── 4. PUBLIC LETTERS TABLE (SHAREABLE LETTERS) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.public_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  letter_id UUID REFERENCES public.letters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  letter_content TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'vintage', -- 'vintage', 'old-love', 'mother-letter', '90s-post', 'royal-vintage'
  is_public BOOLEAN NOT NULL DEFAULT true,
  expiration TEXT NOT NULL DEFAULT 'permanent', -- '24h', '7d', 'permanent'
  expires_at TIMESTAMPTZ,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_letters_short_id ON public.public_letters(short_id);
CREATE INDEX IF NOT EXISTS idx_public_letters_created_at ON public.public_letters(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_letters_expires_at ON public.public_letters(expires_at);

-- ── 5. DOWNLOAD HISTORY TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.download_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  letter_id UUID REFERENCES public.letters(id) ON DELETE SET NULL,
  format TEXT NOT NULL, -- 'pdf', 'png', 'txt'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_download_history_user ON public.download_history(user_id, created_at DESC);

-- ── 6. UPGRADE LETTERS TABLE WITH STATUS ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='status') THEN
    ALTER TABLE public.letters ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='letters' AND column_name='updated_at') THEN
    ALTER TABLE public.letters ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_letters_user_status ON public.letters(user_id, status);
CREATE INDEX IF NOT EXISTS idx_letters_created_at_desc ON public.letters(created_at DESC);

-- ── 7. ROW LEVEL SECURITY POLICIES ───────────────────────────────────────────
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_history ENABLE ROW LEVEL SECURITY;

-- Plans are readable by all
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
CREATE POLICY "Plans are viewable by everyone" ON public.plans FOR SELECT USING (true);

-- User subscriptions viewable by owner
DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Public letters viewable if public & not expired
DROP POLICY IF EXISTS "Public letters viewable by everyone" ON public.public_letters;
CREATE POLICY "Public letters viewable by everyone" ON public.public_letters FOR SELECT
  USING (is_public = true AND (expires_at IS NULL OR expires_at > now()));

-- Insert public letters
DROP POLICY IF EXISTS "Anyone can create public letters" ON public.public_letters;
CREATE POLICY "Anyone can create public letters" ON public.public_letters FOR INSERT WITH CHECK (true);

-- Download history viewable by user
DROP POLICY IF EXISTS "Users can view own download history" ON public.download_history;
CREATE POLICY "Users can view own download history" ON public.download_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own download history" ON public.download_history;
CREATE POLICY "Users can insert own download history" ON public.download_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Atomic view increment function
CREATE OR REPLACE FUNCTION public.increment_public_letter_views(target_short_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.public_letters
  SET views = views + 1
  WHERE short_id = target_short_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
