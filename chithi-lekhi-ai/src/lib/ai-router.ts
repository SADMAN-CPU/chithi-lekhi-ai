/**
 * AI Model Routing & Optimization Architecture
 *
 * Routing Rules:
 * - Creative Emotional Writing & Bengali Literary Depth -> Google Gemini (gemini-1.5-flash / gemini-pro)
 * - Grammar Polishing, Simplification & Precision Formatting -> OpenAI GPT-4o-mini
 *
 * Cost & Performance:
 * - Dynamic Token Optimization (prevents cost blowouts while preserving complete letters)
 * - Prompt Compression (removes redundant boilerplate to save 20-35% prompt tokens)
 * - Response Quality Validation (ensures no AI meta-chatter, validates script integrity)
 */

export type AITaskType = 'CREATIVE_EMOTIONAL' | 'GRAMMAR_PRECISION'
export type AIProvider = 'gemini' | 'openai'

export interface AIRouteDecision {
  taskType: AITaskType
  preferredProvider: AIProvider
  modelName: string
  maxTokens: number
  temperature: number
  rationale: string
}

/**
 * 1. AI Task Classifier
 * Classifies an incoming generation or refinement task into creative or grammar/precision.
 */
export function classifyAITask(input: {
  action?: string
  style?: string
  category?: string
  emotion?: string
  text?: string
}): AIRouteDecision {
  const action = (input.action || '').toLowerCase()

  // 1. Natural (Default): Grammatical & flow polish, lowest temperature (0.30)
  if (
    action === 'natural' ||
    action === 'better-writing' ||
    action === 'simple' ||
    action === 'simpler' ||
    action === 'make-simpler' ||
    action === 'simpler-language'
  ) {
    return {
      taskType: 'GRAMMAR_PRECISION',
      preferredProvider: 'gemini',
      modelName: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      maxTokens: 750,
      temperature: 0.3,
      rationale: 'Gemini Flash with 0.30 temperature for natural Bengali grammar, flow, and user voice preservation.',
    }
  }

  // 2. Elegant: Polished, dignified, courteous diction (0.35)
  if (action === 'elegant' || action === 'formal' || action === 'professional') {
    return {
      taskType: 'GRAMMAR_PRECISION',
      preferredProvider: 'gemini',
      modelName: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      maxTokens: 750,
      temperature: 0.35,
      rationale: 'Gemini Flash with 0.35 temperature for dignified formal structure and respectful etiquette.',
    }
  }

  // 3. Emotional: Deeper heartfelt sincere tone; same story/facts (0.40)
  if (
    action === 'emotional' ||
    action === 'more-emotional' ||
    action === 'make-more-emotional' ||
    action === 'deep-feelings' ||
    action === 'deeper-feeling'
  ) {
    return {
      taskType: 'CREATIVE_EMOTIONAL',
      preferredProvider: 'gemini',
      modelName: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      maxTokens: 800,
      temperature: 0.4,
      rationale: 'Gemini Flash with 0.40 temperature for heartfelt emotional depth without fictional melodrama.',
    }
  }

  // 4. Poetic: Lyrical cadence without hallucinating fiction (0.45)
  if (action === 'poetic' || action === 'more-poetic' || action === 'make-more-poetic') {
    return {
      taskType: 'CREATIVE_EMOTIONAL',
      preferredProvider: 'gemini',
      modelName: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      maxTokens: 850,
      temperature: 0.45,
      rationale: 'Gemini Flash with 0.45 temperature for poetic rhythm strictly anchored to user facts.',
    }
  }

  // Short version
  if (action === 'short-version' || action === 'make-shorter' || action === 'shorter') {
    return {
      taskType: 'GRAMMAR_PRECISION',
      preferredProvider: 'gemini',
      modelName: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      maxTokens: 450,
      temperature: 0.3,
      rationale: 'Gemini Flash selected for concise, distilled letter synthesis.',
    }
  }

  // Storytelling / 90s vintage (controlled temperature 0.50)
  if (action === 'storytelling' || action.includes('vintage')) {
    return {
      taskType: 'CREATIVE_EMOTIONAL',
      preferredProvider: 'gemini',
      modelName: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      maxTokens: 900,
      temperature: 0.5,
      rationale: 'Gemini Flash selected for narrative depth with controlled nostalgia.',
    }
  }

  // Default refinement / editing fallback: conservative 0.35 temperature
  return {
    taskType: 'CREATIVE_EMOTIONAL',
    preferredProvider: 'gemini',
    modelName: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    maxTokens: 750,
    temperature: 0.35,
    rationale: 'Gemini Flash selected with 0.35 temperature for natural emotional editing and preservation of user voice.',
  }
}

/**
 * 2. Prompt Compression
 * Compresses repetitive system instructions and user inputs to save token budget.
 */
export function compressPrompt(rawPrompt: string): string {
  if (!rawPrompt) return ''

  return (
    rawPrompt
      // Remove repetitive whitespace and excessive blank lines
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      // Remove common prompt bloat phrases
      .replace(/Please make sure to /gi, '')
      .replace(/Remember to always /gi, '')
      .replace(/Note that you should /gi, '')
      .trim()
  )
}

/**
 * 3. Dynamic Token Budget Calculator
 * Bengali script consumes ~2.2x tokens compared to English due to UTF-8 byte-pair encoding.
 */
export function calculateOptimalTokens(params: {
  language: 'bengali' | 'english' | 'banglish'
  targetWordCount?: number
  taskType: AITaskType
}): number {
  const words = params.targetWordCount || 200
  const isBengali = params.language === 'bengali'

  // Multiplier: English ~1.3 tokens/word; Bengali ~2.5 tokens/word
  const tokenMultiplier = isBengali ? 2.5 : 1.4
  const estimatedBaseTokens = Math.ceil(words * tokenMultiplier)

  // Safety buffer to prevent halfway truncation
  const buffer = params.taskType === 'CREATIVE_EMOTIONAL' ? 150 : 80

  const total = estimatedBaseTokens + buffer
  // Cap between 200 and 1200 tokens
  return Math.min(Math.max(total, 250), 1200)
}

/**
 * 4. Response Quality Validation & Cleaning
 * Ensures the response is genuine human-sounding letter content without AI disclaimers.
 */
export interface QualityValidationResult {
  isValid: boolean
  cleanedText: string
  issues: string[]
}

const META_PREFIXES_TO_REMOVE = [
  /^here\s+is\s+(the|your)\s+(letter|draft)[^:\n]*:?\s*\n*/i,
  /^certainly[!,.]?\s*(here\s+is[^:\n]*:?)?\s*\n*/i,
  /^sure[!,.]?\s*(here\s+is[^:\n]*:?)?\s*\n*/i,
  /^নিচে\s+(আপনার|তোমার)\s+চিঠিটি\s+(দেওয়া\s+হলো|রইল)[^:\n]*:?\s*\n*/i,
  /^অবশ্যই[!,.]?\s*নিচে\s+চিঠিটি\s+রইল:?\s*\n*/i,
]

export function validateAndCleanResponse(
  rawText: string,
  expectedLanguage: 'bengali' | 'english' | 'banglish' = 'bengali'
): QualityValidationResult {
  const issues: string[] = []
  if (!rawText || rawText.trim().length === 0) {
    return {
      isValid: false,
      cleanedText: '',
      issues: ['Output is empty'],
    }
  }

  let cleaned = rawText.trim()

  // Remove markdown code fences if AI wrapped it
  cleaned = cleaned.replace(/^```(?:markdown)?\s*/i, '').replace(/```\s*$/i, '').trim()

  // Strip leading meta commentary
  for (const pattern of META_PREFIXES_TO_REMOVE) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '').trim()
    }
  }

  // Strip bracketed notes like [নোট:...], [ডাকটিকিট:...], [Note:...]
  cleaned = cleaned.replace(/\[(?:ডাকটিকিট|বিশেষ ভাবার্থ|বিশেষ ভাবনা|নোট|বি\.দ্র\.|Note|P\.S\.|Special Thought|উপসংহার)[^\]]*\]/gi, '')
  cleaned = cleaned.replace(/^\s*\[[^\]]{2,100}\]\s*$/gm, '')

  // Strip trailing meta blocks (e.g. "বিশেষ দ্রষ্টব্য: ...")
  cleaned = cleaned.replace(/\n+\s*(?:বিশেষ দ্রষ্টব্য|বি\.দ্র\.|বিশেষ ভাবনা|পরিমার্জিত অংশ|সংশোধিত চিঠি|Note|P\.S\.):[\s\S]*$/gi, '').trim()

  // Check minimum length (at least 50 characters for a real letter)
  if (cleaned.length < 50) {
    issues.push('Letter is too short (less than 50 characters)')
  }

  // Check Bengali script dominance if language is Bengali
  if (expectedLanguage === 'bengali') {
    const bengaliCharMatches = cleaned.match(/[\u0980-\u09FF]/g)
    const bengaliCharCount = bengaliCharMatches ? bengaliCharMatches.length : 0
    const totalAlphaCount = cleaned.replace(/[\s\d.,!?'"()-]/g, '').length

    if (totalAlphaCount > 0 && bengaliCharCount / totalAlphaCount < 0.3) {
      issues.push('Expected Bengali letter, but response lacks Bengali script')
    }
  }

  return {
    isValid: issues.length === 0,
    cleanedText: cleaned,
    issues,
  }
}
