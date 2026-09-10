/**
 * Text Similarity & Guardrail Engine for Chithi Lekhi AI
 *
 * Implements token-level and character n-gram similarity metrics
 * optimized for Bengali and English scripts. Used to verify that
 * AI letter enhancements preserve the user's authentic voice,
 * personal memories, and relationship context without hallucinating
 * or rewriting the letter completely.
 */

/**
 * Tokenizes text into words, supporting Bengali unicode characters,
 * English words, numbers, and basic punctuation stripping.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return []

  // Normalize: lower-case English, strip diacritics where appropriate,
  // replace Bengali dori (।), exclamation, commas, etc. with space
  const cleaned = text
    .toLowerCase()
    .replace(/[।,?!:;"'“”‘’()\[\]{}—–\-_/\\#@$%^&*+=\`~|<>]/g, ' ')

  // Extract unicode word tokens (letters and numbers)
  const tokens = cleaned.match(/[\p{L}\p{N}]+/gu) || []
  return tokens.filter((t) => t.length > 0)
}

/**
 * Common stop words in Bengali and English to distinguish
 * functional particles from core emotional & semantic vocabulary.
 */
const STOP_WORDS = new Set([
  // English
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as', 'into',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their',
  // Bengali common function words
  'এবং', 'ও', 'কিন্তু', 'বা', 'তবে', 'যে', 'সে', 'তা', 'এই', 'সেই',
  'একটি', 'এক', 'না', 'হয়', 'হয়ে', 'ছিল', 'আছে', 'হবে', 'করতে',
  'করে', 'থেকে', 'দিয়ে', 'জন্য', 'মতো', 'মত', 'পর', 'আগে', 'এখন',
  'কী', 'কি', 'কেন', 'কিভাবে', 'কোথায়', 'যখন', 'তখন', 'যদি', 'এমন',
  'তেমন', 'সব', 'কিছু', 'কোন', 'কোনো', 'শুধু', 'আর', 'যা', 'যার'
])

/**
 * Filters out common function words to highlight content-bearing vocabulary.
 */
export function extractContentTokens(tokens: string[]): string[] {
  return tokens.filter((token) => !STOP_WORDS.has(token) && token.length > 1)
}

/**
 * Extracts character n-grams from normalized text for sub-word
 * and morphological similarity (especially effective for inflected Bengali).
 */
export function extractCharNgrams(text: string, n = 3): Set<string> {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim()
  const ngrams = new Set<string>()

  if (normalized.length < n) {
    if (normalized.length > 0) ngrams.add(normalized)
    return ngrams
  }

  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.add(normalized.substring(i, i + n))
  }

  return ngrams
}

/**
 * Computes Jaccard similarity between two sets: |A ∩ B| / |A ∪ B|
 */
export function computeJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0
  if (setA.size === 0 || setB.size === 0) return 0.0

  let intersectionCount = 0
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++
    }
  }

  const unionCount = setA.size + setB.size - intersectionCount
  return unionCount === 0 ? 1.0 : intersectionCount / unionCount
}

/**
 * Computes vocabulary retention (containment): |A ∩ B| / |A|
 * Measures how much of original A is preserved in enhanced B.
 */
export function computeVocabularyRetention(originalTokens: Set<string>, enhancedTokens: Set<string>): number {
  if (originalTokens.size === 0) return 1.0
  let retainedCount = 0
  for (const item of originalTokens) {
    if (enhancedTokens.has(item)) {
      retainedCount++
    }
  }
  return retainedCount / originalTokens.size
}

/**
 * Calculates a composite similarity score between original letter
 * and enhanced letter in range [0.0, 1.0].
 *
 * Combines:
 * 1. Content vocabulary Jaccard similarity (30%)
 * 2. Original vocabulary retention / containment (40%)
 * 3. Character trigram Dice similarity for morphological preservation (30%)
 */
export function calculateLetterSimilarity(original: string, enhanced: string): number {
  if (!original && !enhanced) return 1.0
  if (!original || !enhanced) return 0.0

  const origTokens = tokenizeText(original)
  const enhTokens = tokenizeText(enhanced)

  if (origTokens.length === 0 && enhTokens.length === 0) return 1.0
  if (origTokens.length === 0 || enhTokens.length === 0) return 0.0

  // 1. Content tokens
  const origContent = extractContentTokens(origTokens)
  const enhContent = extractContentTokens(enhTokens)

  const origContentSet = new Set(origContent.length > 0 ? origContent : origTokens)
  const enhContentSet = new Set(enhContent.length > 0 ? enhContent : enhTokens)

  const jaccard = computeJaccardSimilarity(origContentSet, enhContentSet)
  const retention = computeVocabularyRetention(origContentSet, enhContentSet)

  // 2. Character n-gram dice coefficient
  const origNgrams = extractCharNgrams(original, 3)
  const enhNgrams = extractCharNgrams(enhanced, 3)

  let ngramsIntersection = 0
  for (const ng of origNgrams) {
    if (enhNgrams.has(ng)) ngramsIntersection++
  }

  const dice = (origNgrams.size + enhNgrams.size) === 0
    ? 1.0
    : (2 * ngramsIntersection) / (origNgrams.size + enhNgrams.size)

  // Weighted composite score
  const compositeScore = (jaccard * 0.30) + (retention * 0.40) + (dice * 0.30)

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, Math.round(compositeScore * 1000) / 1000))
}

export interface GuardrailResult {
  passed: boolean
  score: number
  threshold: number
  reason?: string
}

/**
 * Verifies that an enhanced letter respects the similarity guardrail threshold.
 * Default threshold is 0.55 according to Master Technical Specification v2 §4.3.
 */
export function verifyEnhancementGuardrail(
  original: string,
  enhanced: string,
  threshold = 0.55
): GuardrailResult {
  const score = calculateLetterSimilarity(original, enhanced)

  if (score >= threshold) {
    return {
      passed: true,
      score,
      threshold,
    }
  }

  return {
    passed: false,
    score,
    threshold,
    reason: `Enhanced version diverged significantly from the original draft (similarity score: ${score.toFixed(2)}, required: >= ${threshold}). Original emotions, relationships, and context must be strictly preserved.`,
  }
}
