-- Keep one compatibility trigger. Running both old triggers could restore a
-- cleared alias or overwrite a legacy edit after the canonical trigger ran.
DROP TRIGGER IF EXISTS trg_sync_letters_compatibility ON public.letters;

CREATE OR REPLACE FUNCTION public.sync_letters_canonical_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  enhanced_changed BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.recipient_name := COALESCE(NEW.recipient_name, NEW.receiver_name);
    NEW.receiver_name := NEW.recipient_name;
    NEW.enhanced_content := COALESCE(NEW.enhanced_content, NEW.enhanced_letter);
    NEW.enhanced_letter := NEW.enhanced_content;
    NEW.content := COALESCE(NEW.content, NEW.letter_content, NEW.enhanced_content, NEW.generated_content, '');
    NEW.letter_content := NEW.content;
    NEW.generated_content := COALESCE(NEW.generated_content, NEW.content);
    NEW.original_input := COALESCE(NEW.original_input, NEW.original_letter, NEW.content);
    NEW.original_letter := NEW.original_input;
    NEW.share_id := COALESCE(NEW.share_id, NEW.share_slug,
      substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    NEW.share_slug := NEW.share_id;
    NEW.letter_style := COALESCE(NEW.letter_style, NEW.era_style, NEW.style);
    NEW.era_style := NEW.letter_style;
    NEW.favorite := COALESCE(NEW.favorite, false) OR COALESCE(NEW.is_favorite, false);
    NEW.is_favorite := NEW.favorite;
  ELSE
    IF NEW.recipient_name IS DISTINCT FROM OLD.recipient_name THEN
      NEW.receiver_name := NEW.recipient_name;
    ELSIF NEW.receiver_name IS DISTINCT FROM OLD.receiver_name THEN
      NEW.recipient_name := NEW.receiver_name;
    END IF;

    IF NEW.original_input IS DISTINCT FROM OLD.original_input THEN
      NEW.original_letter := NEW.original_input;
    ELSIF NEW.original_letter IS DISTINCT FROM OLD.original_letter THEN
      NEW.original_input := NEW.original_letter;
    END IF;

    enhanced_changed := NEW.enhanced_content IS DISTINCT FROM OLD.enhanced_content
      OR NEW.enhanced_letter IS DISTINCT FROM OLD.enhanced_letter;
    IF NEW.enhanced_content IS DISTINCT FROM OLD.enhanced_content THEN
      NEW.enhanced_letter := NEW.enhanced_content;
    ELSIF NEW.enhanced_letter IS DISTINCT FROM OLD.enhanced_letter THEN
      NEW.enhanced_content := NEW.enhanced_letter;
    END IF;

    -- Current text and the generation snapshot have distinct purposes.
    -- Only an explicit new generated_content write replaces that snapshot.
    IF NEW.content IS DISTINCT FROM OLD.content THEN
      NEW.letter_content := NEW.content;
      IF NOT enhanced_changed THEN
        NEW.enhanced_content := NULL;
        NEW.enhanced_letter := NULL;
      END IF;
    ELSIF NEW.letter_content IS DISTINCT FROM OLD.letter_content THEN
      NEW.content := NEW.letter_content;
      IF NOT enhanced_changed THEN
        NEW.enhanced_content := NULL;
        NEW.enhanced_letter := NULL;
      END IF;
    ELSIF enhanced_changed AND NEW.enhanced_content IS NOT NULL THEN
      NEW.content := NEW.enhanced_content;
      NEW.letter_content := NEW.content;
    ELSIF NEW.generated_content IS DISTINCT FROM OLD.generated_content
      AND NEW.generated_content IS NOT NULL THEN
      NEW.content := NEW.generated_content;
      NEW.letter_content := NEW.content;
      IF NOT enhanced_changed THEN
        NEW.enhanced_content := NULL;
        NEW.enhanced_letter := NULL;
      END IF;
    END IF;

    IF NEW.share_id IS DISTINCT FROM OLD.share_id THEN
      NEW.share_slug := NEW.share_id;
    ELSIF NEW.share_slug IS DISTINCT FROM OLD.share_slug THEN
      NEW.share_id := NEW.share_slug;
    END IF;

    IF NEW.letter_style IS DISTINCT FROM OLD.letter_style THEN
      NEW.era_style := NEW.letter_style;
    ELSIF NEW.era_style IS DISTINCT FROM OLD.era_style THEN
      NEW.letter_style := NEW.era_style;
    END IF;

    IF NEW.favorite IS DISTINCT FROM OLD.favorite THEN
      NEW.is_favorite := NEW.favorite;
    ELSIF NEW.is_favorite IS DISTINCT FROM OLD.is_favorite THEN
      NEW.favorite := NEW.is_favorite;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_letters_canonical ON public.letters;
CREATE TRIGGER trg_sync_letters_canonical
  BEFORE INSERT OR UPDATE ON public.letters
  FOR EACH ROW EXECUTE FUNCTION public.sync_letters_canonical_v2();
