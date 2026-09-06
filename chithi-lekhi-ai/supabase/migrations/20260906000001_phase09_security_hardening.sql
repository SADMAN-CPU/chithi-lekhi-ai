-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 09: SECURITY HARDENING & PERFORMANCE OPTIMIZATION
-- Chithi Lekhi AI — Database RLS tightening and index enhancements
-- ══════════════════════════════════════════════════════

-- 1. Tighten SELECT Policy on letters
-- Ensures non-public letters are NEVER accessible by unauthorized third parties.
DROP POLICY IF EXISTS "Letters are viewable by owner or if shared" ON public.letters;
DROP POLICY IF EXISTS "Letters are viewable by owner or if public" ON public.letters;

CREATE POLICY "Letters are viewable by owner or if public" 
  ON public.letters FOR SELECT 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (is_public = true)
  );

-- 2. Strict UPDATE Policy: Only authenticated owner can update their own letters
DROP POLICY IF EXISTS "Users can update own letters" ON public.letters;
CREATE POLICY "Users can update own letters" 
  ON public.letters FOR UPDATE 
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 3. Strict DELETE Policy: Only authenticated owner can delete their own letters
DROP POLICY IF EXISTS "Users can delete own letters" ON public.letters;
CREATE POLICY "Users can delete own letters" 
  ON public.letters FOR DELETE 
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 4. INSERT Policy: Authenticated users can insert their own letters, or unlinked guest letters
DROP POLICY IF EXISTS "Users can insert letters" ON public.letters;
CREATE POLICY "Users can insert letters" 
  ON public.letters FOR INSERT 
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (user_id IS NULL)
  );

-- 5. Additional Performance Indexes
CREATE INDEX IF NOT EXISTS idx_letters_public_slug ON public.letters(is_public, share_slug);
CREATE INDEX IF NOT EXISTS idx_letters_user_created ON public.letters(user_id, created_at DESC);
