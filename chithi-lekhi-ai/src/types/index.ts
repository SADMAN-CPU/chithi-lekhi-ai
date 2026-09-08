// ─── Union Types ─────────────────────────────────────────────────────────────

export type LetterCategory =
  | 'love'
  | 'friendship'
  | 'family'
  | 'apology'
  | 'missing'
  | 'motivation'
  | 'secret'

/** Phase 02 & 03: Relationship types for emotional storytelling context */
export type Relationship =
  | 'lover'
  | 'mother'
  | 'father'
  | 'friend'
  | 'lost-person'
  | 'special-person'
  | 'first-love'
  | 'husband-wife'
  | 'best-friend'
  | 'family'
  | 'sibling'
  | 'mentor'
  | 'lost-connection'
  | 'someone-special'

/** Phase 02: Structured emotion values */
export type LetterEmotion =
  | 'love'
  | 'missing-someone'
  | 'apology'
  | 'gratitude'
  | 'sadness'
  | 'happiness'
  | 'motivation'
  | 'nostalgia'
  | 'love-confession'
  | 'goodbye'
  | 'reunion'

/** Phase 03: The 8 Advanced Writing Personalities */
export type WritingPersonality =
  | 'deep-emotional'
  | 'romantic'
  | 'poetic'
  | 'rabindranath-classical'
  | '90s-handwritten'
  | 'simple-human'
  | 'funny-friend'
  | 'mature-apology'

/** The 5 Core Writing Styles requested by user */
export type CoreWritingStyle = 'emotional' | 'simple' | 'mature' | 'poetic' | 'formal'

/** Writing style union combining advanced personalities and core styles with legacy aliases */
export type WritingStyle =
  | WritingPersonality
  | CoreWritingStyle
  | 'vintage'
  | 'romantic'
  | 'emotional'
  | 'deep'
  | 'simple'
  | 'mature'
  | 'poetic'
  | 'formal'
  | 'funny'

export type Language = 'bengali' | 'english' | 'banglish'

/** Phase 03: Letter Length options */
export type LetterLength = 'short' | 'medium' | 'long'

/** Phase 03: Era Style options */
export type EraStyle = 'modern' | '90s-handwritten' | 'vintage'

/** Phase 04: AI Letter Refinement options */
export type RefinementType =
  | 'emotional'
  | 'deep-feelings'
  | 'formal'
  | 'simple'
  | 'romantic'
  | 'professional'
  | 'short-version'
  | 'storytelling'
  | 'more-emotional'
  | 'more-romantic'
  | 'simpler'
  | 'longer'
  | 'shorter'
  | 'vintage-90s'
  | 'custom'

// ─── Mapped Types ─────────────────────────────────────────────────────────────

export type LetterEmoji = Record<LetterCategory, string>

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  name: string
  avatar?: string
  created_at: string
}

export interface Letter {
  id: string
  user_id?: string | null
  receiver_name: string
  category?: LetterCategory
  emotion?: string | null
  language: Language
  style?: WritingStyle
  relationship?: Relationship | string | null
  memory?: string
  situation?: string
  feeling?: string
  memory_context?: string | null
  letter_length?: LetterLength | null
  era_style?: EraStyle | string | null
  content: string
  favorite?: boolean
  is_public: boolean
  share_slug?: string | null
  created_at: string
}

export * from './database'

export interface Favorite {
  id: string
  user_id: string
  letter_id: string
  created_at: string
}

/** Phase 03: Complete Emotional Storytelling Input Payload */
export interface GenerateLetterRequest {
  receiverName: string
  relationship: Relationship | string
  memory?: string
  situation?: string
  feeling: string
  letterLength: LetterLength
  eraStyle: EraStyle
  language: Language
  category?: LetterCategory
  style?: WritingStyle
  writingStyle?: CoreWritingStyle | WritingStyle
  personality?: WritingPersonality | WritingStyle
  emotion?: string
}

export interface GenerateLetterResponse {
  success: boolean
  letter: string
  letterId?: string
  error?: string | ApiError
  metadata?: {
    receiverName: string
    relationship: string
    letterLength: LetterLength
    eraStyle: EraStyle
    language: Language
    wordCount: number
    provider?: 'gemini' | 'openai' | 'fallback'
    personality?: string
    emotionalTone?: string
  }
}

/** Phase 04: AI Letter Refinement Payload */
export interface RefineLetterRequest {
  letter: string
  refinementType: RefinementType
  receiverName?: string
  relationship?: Relationship | string
  language?: Language
  memory?: string
  situation?: string
  feeling?: string
}

export interface RefineLetterResponse {
  success: boolean
  letter: string
  refinementType: RefinementType
  wordCount?: number
  error?: string
}

export interface ApiError {
  message: string
  code?: string
  status: number
}
