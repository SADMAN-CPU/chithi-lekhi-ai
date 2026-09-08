-- ══════════════════════════════════════════════════════════════════════════════
-- AUTH PROFILES & RLS HARDENING MIGRATION
-- Chithi Lekhi AI — Allow Authenticated Profile Insertion & Service Role Access
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Enable RLS on profiles if not already enabled
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Allow authenticated users to insert their own profile record (needed for upsert in ensureUserProfile)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" 
      ON public.profiles 
      FOR INSERT 
      WITH CHECK (auth.uid() = id);
  END IF;

  -- 3. Grant service_role full administrative access to profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Service role has full access to profiles'
  ) THEN
    CREATE POLICY "Service role has full access to profiles" 
      ON public.profiles 
      FOR ALL 
      TO service_role 
      USING (true) 
      WITH CHECK (true);
  END IF;

  -- 4. Grant service_role full administrative access to letters
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'letters' 
      AND policyname = 'Service role has full access to letters'
  ) THEN
    CREATE POLICY "Service role has full access to letters" 
      ON public.letters 
      FOR ALL 
      TO service_role 
      USING (true) 
      WITH CHECK (true);
  END IF;

  -- 5. Grant service_role full administrative access to ai_usage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'ai_usage' 
      AND policyname = 'Service role has full access to ai_usage'
  ) THEN
    CREATE POLICY "Service role has full access to ai_usage" 
      ON public.ai_usage 
      FOR ALL 
      TO service_role 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;
