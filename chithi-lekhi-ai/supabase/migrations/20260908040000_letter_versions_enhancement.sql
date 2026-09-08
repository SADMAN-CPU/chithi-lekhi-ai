-- ══════════════════════════════════════════════════════════════════════════════
-- LETTER DUAL-VERSIONING & ENHANCEMENT STYLE SUPPORT
-- Chithi Lekhi AI — Support original_letter, enhanced_letter, and enhancement_style
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- original_letter (stores user's authentic raw letter)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'original_letter') THEN
    ALTER TABLE public.letters ADD COLUMN original_letter TEXT;
  END IF;

  -- enhanced_letter (stores polished AI editor output)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'enhanced_letter') THEN
    ALTER TABLE public.letters ADD COLUMN enhanced_letter TEXT;
  END IF;

  -- enhancement_style (natural, emotional, elegant, poetic, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'letters' AND column_name = 'enhancement_style') THEN
    ALTER TABLE public.letters ADD COLUMN enhancement_style TEXT;
  END IF;
END $$;

-- Populate original_letter from existing content if null
UPDATE public.letters
SET original_letter = COALESCE(letter_content, content)
WHERE original_letter IS NULL;

-- Update trigger function to preserve original_letter defaults
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

  -- Default original_letter to content on initial creation if not explicitly set
  IF NEW.original_letter IS NULL THEN
    NEW.original_letter := COALESCE(NEW.letter_content, NEW.content);
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

