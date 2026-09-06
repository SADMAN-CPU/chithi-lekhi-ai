-- ══════════════════════════════════════════════════════════════════════════════
-- PUBLIC SHARING GROWTH SYSTEM & AI VOICE CACHE MIGRATION
-- Chithi Lekhi AI
-- ══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. SHARES TABLE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID REFERENCES public.letters(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  share_token TEXT UNIQUE NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  expiration TEXT NOT NULL DEFAULT 'never', -- '24h', '7d', 'never'
  expires_at TIMESTAMPTZ,
  views INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shares_token ON public.shares(share_token);
CREATE INDEX IF NOT EXISTS idx_shares_letter_id ON public.shares(letter_id);
CREATE INDEX IF NOT EXISTS idx_shares_created_at ON public.shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shares_expires_at ON public.shares(expires_at);

-- ── 2. SHARE ANALYTICS TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.share_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES public.shares(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'view', 'share', 'download', 'audio_play', 'audio_generate'
  platform TEXT, -- 'whatsapp', 'facebook', 'copy_link', 'image', 'audio', 'pdf'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_analytics_token ON public.share_analytics(share_token);
CREATE INDEX IF NOT EXISTS idx_share_analytics_event ON public.share_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_share_analytics_created ON public.share_analytics(created_at DESC);

-- ── 3. VOICE CACHE TABLE (COST OPTIMIZATION) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.voice_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT UNIQUE NOT NULL,
  voice_style TEXT NOT NULL, -- 'warm', 'emotional', 'storytelling', 'vintage-radio'
  audio_url TEXT NOT NULL,
  audio_format TEXT NOT NULL DEFAULT 'mp3',
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_cache_hash ON public.voice_cache(content_hash);

-- ── 4. ATOMIC EVENT INCREMENT FUNCTIONS ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_share_event(
  target_token TEXT,
  event_type_param TEXT
)
RETURNS void AS $$
BEGIN
  IF event_type_param = 'view' THEN
    UPDATE public.shares
    SET views = views + 1
    WHERE share_token = target_token;
  ELSIF event_type_param = 'share' THEN
    UPDATE public.shares
    SET shares_count = shares_count + 1
    WHERE share_token = target_token;
  ELSIF event_type_param = 'download' THEN
    UPDATE public.shares
    SET downloads_count = downloads_count + 1
    WHERE share_token = target_token;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. ROW LEVEL SECURITY (RLS) POLICIES ─────────────────────────────────────
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_cache ENABLE ROW LEVEL SECURITY;

-- Shares viewable if public and not expired
DROP POLICY IF EXISTS "Shares are viewable if public and unexpired" ON public.shares;
CREATE POLICY "Shares are viewable if public and unexpired" ON public.shares FOR SELECT
  USING (
    is_public = true 
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Anyone can create a share
DROP POLICY IF EXISTS "Anyone can create shares" ON public.shares;
CREATE POLICY "Anyone can create shares" ON public.shares FOR INSERT WITH CHECK (true);

-- Analytics events can be recorded by anyone
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.share_analytics;
CREATE POLICY "Anyone can insert analytics events" ON public.share_analytics FOR INSERT WITH CHECK (true);

-- Voice cache is viewable by all
DROP POLICY IF EXISTS "Voice cache viewable by everyone" ON public.voice_cache;
CREATE POLICY "Voice cache viewable by everyone" ON public.voice_cache FOR SELECT USING (true);
DROP POLICY IF EXISTS "System can insert voice cache" ON public.voice_cache;
CREATE POLICY "System can insert voice cache" ON public.voice_cache FOR INSERT WITH CHECK (true);
