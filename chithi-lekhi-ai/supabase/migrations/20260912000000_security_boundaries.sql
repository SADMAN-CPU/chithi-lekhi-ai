-- Replace cumulative permissive policies: PostgreSQL combines them with OR.
-- Guest persistence and quota/cache/analytics writes go through validated server
-- services using service_role. Existing public sharing RPCs remain available.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
$$;

-- RLS controls rows, not columns. A profile owner may edit their profile but
-- must never promote themselves, including through an INSERT/UPSERT.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.role IS DISTINCT FROM 'user' THEN
        RAISE EXCEPTION 'Profile roles are managed by the server'
          USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Profile roles are managed by the server'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- A time-limited share must not permanently publish its source letter.
-- Share access is controlled by shares.is_public/expires_at and its token RPC.
DROP TRIGGER IF EXISTS trg_sync_letter_on_share ON public.shares;

-- Repair the recognizable legacy auto-publish path. A private or expiring
-- share whose token was copied onto the letter must not leave a permanent
-- public URL behind. Owners can explicitly publish the letter again if needed.
UPDATE public.letters AS letter
SET is_public = false
WHERE letter.is_public = true AND EXISTS (
  SELECT 1 FROM public.shares AS share
  WHERE share.letter_id = letter.id
    AND (share.is_public = false OR share.expires_at IS NOT NULL)
    AND (share.share_token = letter.share_id OR share.share_token = letter.share_slug)
);

DO $$
DECLARE
  existing_policy RECORD;
  table_name TEXT;
BEGIN
  FOR existing_policy IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'letters', 'shares', 'public_letters',
        'user_usage', 'ai_usage', 'voice_cache', 'share_analytics'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I',
      existing_policy.policyname, existing_policy.tablename);
  END LOOP;

  FOREACH table_name IN ARRAY ARRAY[
    'profiles', 'letters', 'shares', 'public_letters',
    'user_usage', 'ai_usage', 'voice_cache', 'share_analytics'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY service_role_access ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      table_name
    );
  END LOOP;
END;
$$;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND role = 'user');
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY letters_select_own ON public.letters
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY letters_select_public ON public.letters
  FOR SELECT TO anon, authenticated USING (is_public = true);
CREATE POLICY letters_insert_own ON public.letters
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY letters_update_own ON public.letters
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY letters_delete_own ON public.letters
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Do not expose the share-token inventory. Public readers use the existing
-- get_shared_letter_by_token RPC, which checks privacy and expiry.
CREATE POLICY shares_select_own ON public.shares
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY shares_insert_own ON public.shares
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.letters
      WHERE letters.id = shares.letter_id AND letters.user_id = auth.uid()
    )
  );
CREATE POLICY shares_update_own ON public.shares
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.letters
      WHERE letters.id = shares.letter_id AND letters.user_id = auth.uid()
    )
  );
CREATE POLICY shares_delete_own ON public.shares
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY public_letters_select_own ON public.public_letters
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY public_letters_select_public ON public.public_letters
  FOR SELECT TO anon, authenticated
  USING (is_public = true AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY public_letters_insert_own ON public.public_letters
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND (letter_id IS NULL OR EXISTS (
      SELECT 1 FROM public.letters
      WHERE letters.id = public_letters.letter_id AND letters.user_id = auth.uid()
    ))
  );
CREATE POLICY public_letters_update_own ON public.public_letters
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (
    user_id = auth.uid() AND (letter_id IS NULL OR EXISTS (
      SELECT 1 FROM public.letters
      WHERE letters.id = public_letters.letter_id AND letters.user_id = auth.uid()
    ))
  );
CREATE POLICY public_letters_delete_own ON public.public_letters
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY user_usage_select_own ON public.user_usage
  FOR SELECT TO authenticated
  USING (identifier = 'user:' || auth.uid()::text);
CREATE POLICY ai_usage_select_own ON public.ai_usage
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- RLS does not protect TRUNCATE or other table-level privileges. Grant only
-- the operations used by clients; service_role retains server access.
REVOKE ALL ON public.profiles, public.letters, public.shares,
  public.public_letters, public.user_usage, public.ai_usage,
  public.voice_cache, public.share_analytics FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.letters, public.public_letters TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.letters, public.shares,
  public.public_letters TO authenticated;
GRANT SELECT ON public.user_usage, public.ai_usage TO authenticated;
GRANT ALL ON public.profiles, public.letters, public.shares,
  public.public_letters, public.user_usage, public.ai_usage,
  public.voice_cache, public.share_analytics TO service_role;

-- Compatibility views otherwise run with the view owner's privileges and
-- bypass the policies on profiles, ai_usage and admin_audit_logs.
ALTER VIEW public.users SET (security_invoker = true);
ALTER VIEW public.usage_logs SET (security_invoker = true);
ALTER VIEW public.admin_logs SET (security_invoker = true);
REVOKE ALL ON public.users, public.usage_logs, public.admin_logs
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.users, public.usage_logs TO authenticated;
GRANT ALL ON public.users, public.usage_logs, public.admin_logs TO service_role;

-- SECURITY DEFINER functions are executable by PUBLIC unless explicitly revoked.
-- Caller-provided identifiers, limits and analytics data are trusted only on
-- the server, after authentication/ownership/quota checks.
REVOKE ALL ON FUNCTION public.consume_ai_quota(TEXT, DATE, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(TEXT, DATE, TEXT, INTEGER)
  TO service_role;

REVOKE ALL ON FUNCTION public.record_letter_view(TEXT, TEXT, TEXT),
  public.increment_letter_view_count(TEXT),
  public.increment_public_letter_views(TEXT),
  public.increment_share_event(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_letter_view(TEXT, TEXT, TEXT),
  public.increment_letter_view_count(TEXT),
  public.increment_public_letter_views(TEXT),
  public.increment_share_event(TEXT, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.is_admin(), public.protect_profile_role(),
  public.handle_new_user(), public.sync_letter_on_share()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.protect_profile_role(),
  public.handle_new_user(), public.sync_letter_on_share() TO service_role;

REVOKE ALL ON FUNCTION public.get_shared_letter_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_letter_by_token(TEXT)
  TO anon, authenticated, service_role;

ALTER FUNCTION public.record_letter_view(TEXT, TEXT, TEXT) SET search_path = '';
ALTER FUNCTION public.increment_letter_view_count(TEXT) SET search_path = '';
ALTER FUNCTION public.increment_public_letter_views(TEXT) SET search_path = '';
ALTER FUNCTION public.increment_share_event(TEXT, TEXT) SET search_path = '';
ALTER FUNCTION public.get_shared_letter_by_token(TEXT) SET search_path = '';
