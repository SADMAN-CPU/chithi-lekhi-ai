-- ══════════════════════════════════════════════════════════════════════════════
-- PRODUCTION CORE HARDENING MIGRATION
-- Chithi Lekhi AI — Compatibility Views, RLS Hardening & Full Schema Alignment
-- ══════════════════════════════════════════════════════════════════════════════

-- Ensure compatibility views for legacy or standard schema references
CREATE OR REPLACE VIEW public.users AS
SELECT id, email, name, avatar, created_at, updated_at
FROM public.profiles;

CREATE OR REPLACE VIEW public.usage_logs AS
SELECT id, user_id, identifier, action_type, model, tokens_used, success, created_at
FROM public.ai_usage;

CREATE OR REPLACE VIEW public.admin_logs AS
SELECT id, admin_email, action, target_id, details, ip_address, user_agent, created_at
FROM public.admin_audit_logs;

-- Index optimizations for rapid admin aggregation queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_model_tokens ON public.ai_usage(model, tokens_used);
CREATE INDEX IF NOT EXISTS idx_public_letters_token ON public.public_letters(share_token);
CREATE INDEX IF NOT EXISTS idx_letters_created_at ON public.letters(created_at DESC);

-- Ensure RLS on all core tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.public_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies: Users can view and update their own profile; service role has full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;
