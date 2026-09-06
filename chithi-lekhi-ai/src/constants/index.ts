import type {
  LetterCategory,
  WritingStyle,
  Language,
  LetterEmoji,
  Relationship,
  LetterLength,
  EraStyle,
  RefinementType,
} from '../types'

// ─── Letter Categories ────────────────────────────────────────────────────────

export const LETTER_CATEGORIES: Array<{
  value: LetterCategory
  label: string
  labelEn: string
  emoji: string
  description: string
}> = [
  {
    value: 'love',
    label: 'ভালোবাসা',
    labelEn: 'Love',
    emoji: '💕',
    description: 'হৃদয়ের গভীর থেকে',
  },
  {
    value: 'friendship',
    label: 'বন্ধুত্ব',
    labelEn: 'Friendship',
    emoji: '🤝',
    description: 'বন্ধুর জন্য বিশেষ চিঠি',
  },
  {
    value: 'family',
    label: 'পরিবার',
    labelEn: 'Family',
    emoji: '👨‍👩‍👧',
    description: 'পরিবারের প্রিয়জনের জন্য',
  },
  {
    value: 'apology',
    label: 'ক্ষমাপ্রার্থনা',
    labelEn: 'Apology',
    emoji: '🙏',
    description: 'মনের ভার হালকা করুন',
  },
  {
    value: 'missing',
    label: 'মিস করছি',
    labelEn: 'Missing Someone',
    emoji: '🌙',
    description: 'দূরের প্রিয়জনের জন্য',
  },
  {
    value: 'motivation',
    label: 'অনুপ্রেরণা',
    labelEn: 'Motivation',
    emoji: '✨',
    description: 'সাহস ও শক্তি যোগান',
  },
  {
    value: 'secret',
    label: 'গোপন চিঠি',
    labelEn: 'Secret Letter',
    emoji: '🔐',
    description: 'যা কখনো বলা হয়নি',
  },
] as const

// ─── Relationships (Phase 02 & 03) ──────────────────────────────────────────

export const RELATIONSHIP_OPTIONS: Array<{
  value: Relationship
  label: string
  labelEn: string
  emoji: string
  description: string
}> = [
  {
    value: 'first-love',
    label: 'প্রথম ভালোবাসা',
    labelEn: 'First Love',
    emoji: '🌸',
    description: 'কৈশোরের প্রথম স্পন্দন ও নিষ্পাপ স্মৃতি',
  },
  {
    value: 'husband-wife',
    label: 'স্বামী / স্ত্রী',
    labelEn: 'Husband / Wife',
    emoji: '💍',
    description: 'জীবনের সাথী, একসাথে চলার গভীর বন্ধন',
  },
  {
    value: 'best-friend',
    label: 'প্রিয় বন্ধু',
    labelEn: 'Best Friend',
    emoji: '☕',
    description: 'যার কাছে মনের সব না-বলা কথা বলা যায়',
  },
  {
    value: 'family',
    label: 'পরিবার / আত্মীয়',
    labelEn: 'Family',
    emoji: '🏡',
    description: 'মা, বাবা, ভাই, বোন বা প্রিয় স্বজন',
  },
  {
    value: 'lost-connection',
    label: 'হারিয়ে যাওয়া যোগাযোগ',
    labelEn: 'Lost Connection',
    emoji: '🍂',
    description: 'সময়ের স্রোতে দূরে সরে যাওয়া কেউ',
  },
  {
    value: 'someone-special',
    label: 'বিশেষ কেউ',
    labelEn: 'Someone Special',
    emoji: '✨',
    description: 'যাকে দূর থেকে ভালোবেসেছি বা গোপনে ভাবি',
  },
] as const

// ─── Era Styles (Phase 03) ──────────────────────────────────────────────────

export const ERA_STYLE_OPTIONS: Array<{
  value: EraStyle
  label: string
  labelEn: string
  emoji: string
  tagline: string
  description: string
}> = [
  {
    value: '90s-handwritten',
    label: '৯০-এর হাতে লেখা',
    labelEn: '90s Handwritten',
    emoji: '✉️',
    tagline: 'নস্টালজিক ও হৃদয়ের গভীর স্পর্শ',
    description: 'নীল খামে ঝরনা কলমে লেখা চিঠির মতো মধুর ও আবেগঘন সুর।',
  },
  {
    value: 'vintage',
    label: 'ভিন্টেজ ক্লাসিক্যাল',
    labelEn: 'Vintage Classic',
    emoji: '📜',
    tagline: 'কাব্যিক সৌন্দর্য ও গভীর সাহিত্যিক আমেজ',
    description: 'রবীন্দ্রনাথ বা জীবনানন্দের আবহ, গভীর অনুভব ও নান্দনিক বাক্যবিন্যাস।',
  },
  {
    value: 'modern',
    label: 'আধুনিক প্রকাশ',
    labelEn: 'Modern Heartfelt',
    emoji: '✨',
    tagline: 'সহজ, আন্তরিক ও প্রাণবন্ত',
    description: 'আজকের সময়ের আন্তরিক সহজ কথন, সরাসরি মন ছুঁয়ে যাওয়া ভাষা।',
  },
] as const

// ─── Letter Lengths (Phase 03) ──────────────────────────────────────────────

export const LETTER_LENGTH_OPTIONS: Array<{
  value: LetterLength
  label: string
  labelEn: string
  emoji: string
  wordRange: string
  description: string
}> = [
  {
    value: 'short',
    label: 'ছোট ও মিষ্টি',
    labelEn: 'Short',
    emoji: '🍃',
    wordRange: '১০০–১৫০ শব্দ',
    description: 'সংক্ষিপ্ত তবে প্রতিটি শব্দে গভীর অনুভূতির প্রকাশ।',
  },
  {
    value: 'medium',
    label: 'আদর্শ চিঠি',
    labelEn: 'Medium',
    emoji: '💌',
    wordRange: '২০০–৩০০ শব্দ',
    description: 'মন খুলে অনুভূতি ও স্মৃতি ব্যক্ত করার পারফেক্ট পরিধি।',
  },
  {
    value: 'long',
    label: 'দীর্ঘ হৃদয়স্পর্শী',
    labelEn: 'Long',
    emoji: '📖',
    wordRange: '৩৫০–৫০০ শব্দ',
    description: 'পূর্ণাঙ্গ মনকাড়া গল্প, স্মৃতি ও আবেগের নিখুঁত সমাহার।',
  },
] as const

// ─── Storytelling Suggestions & Inspirations (Phase 03) ───────────────────────

export const MEMORY_SUGGESTIONS: string[] = [
  'একসাথে বৃষ্টিভেজা বিকেলে এক ছাতার নিচে হাঁটা',
  'প্রথমবার যখন দুজনের চোখে চোখ পড়েছিল',
  'শহরের পুরোনো চায়ের দোকানে ঘণ্টার পর ঘণ্টা আড্ডা',
  'রেলস্টেশনে বিদায়বেলার শেষ মুহূর্তের নীরবতা',
  'মধ্যরাতের মৃদু ফিসফিস করা দীর্ঘ ফোনালাপ',
  'শীতের ভোরে কুয়াশার মাঝে হাত ধরে পথ চলা',
  'পরীক্ষার দিনগুলোতে একে অপরকে সাহস যোগানো',
  'সেই বিশেষ গানটি যা শুনলেই তোমার কথা মনে পড়ে',
]

export const SITUATION_SUGGESTIONS: string[] = [
  'আমরা এখন অনেক দূরে থাকি, দূরত্ব অনেক বেড়েছে',
  'অনেক দিন কথা হয় না, কিন্তু মনে প্রতিদিন থাকো',
  'একটি অনাকাঙ্ক্ষিত ভুল বোঝাবুঝির পর এই চিঠি',
  'আজ তোমার একটি বিশেষ দিন বা শুভক্ষণ',
  'নীরব নিস্তব্ধ একাকী রাতে হঠাৎ স্মৃতির ভিড়',
  'অনেক দিন পর আবার পুরোনো ঠিকানায় ফিরছি',
  'কাছে থেকেও মুখে বলতে পারছি না মনের কথাগুলো',
]

export const FEELING_SUGGESTIONS: string[] = [
  'তীব্র মিস করছি তোমাকে, প্রতিটি মুহূর্তে',
  'হৃদয়ে গোপন ভালোবাসার স্বীকারোক্তি জানাতে চাই',
  'হৃদয়ের গভীর থেকে ক্ষমা প্রার্থনা ও অনুশোচনা',
  'জীবনের প্রতিটি পদক্ষেপে তোমার প্রতি কৃতজ্ঞতা',
  'অভিমান ভেঙে ভালোবাসায় জড়িয়ে নেওয়ার ইচ্ছা',
  'নীরব শুভকামনা ও তোমাকে ভালো রাখার প্রার্থনা',
  'একাকিত্বে তোমার উপস্থিতি তীব্রভাবে অনুভব করা',
]

// ─── Writing Styles ───────────────────────────────────────────────────────────

export const WRITING_STYLES: Array<{
  value: WritingStyle
  label: string
  labelEn: string
  description: string
}> = [
  {
    value: 'vintage',
    label: 'ভিনটেজ ৯০স',
    labelEn: 'Vintage 90s',
    description: 'হাতে লেখা চিঠির অনুভূতি',
  },
  {
    value: 'romantic',
    label: 'রোমান্টিক',
    labelEn: 'Romantic',
    description: 'ভালোবাসাময় ও আবেগপূর্ণ',
  },
  {
    value: 'emotional',
    label: 'আবেগময়',
    labelEn: 'Emotional',
    description: 'গভীর অনুভূতি প্রকাশ',
  },
  {
    value: 'deep',
    label: 'গভীর',
    labelEn: 'Deep',
    description: 'অর্থবহ ও দার্শনিক',
  },
  {
    value: 'simple',
    label: 'সহজ',
    labelEn: 'Simple',
    description: 'সরল ও স্বাভাবিক',
  },
  {
    value: 'mature',
    label: 'পরিণত',
    labelEn: 'Mature',
    description: 'পরিপক্ক ও বোধসম্পন্ন',
  },
  {
    value: 'poetic',
    label: 'কাব্যিক',
    labelEn: 'Poetic',
    description: 'ছন্দ ও সৌন্দর্যময়',
  },
  {
    value: 'funny',
    label: 'মজাদার',
    labelEn: 'Funny',
    description: 'হালকা ও আনন্দময়',
  },
] as const

// ─── Languages ────────────────────────────────────────────────────────────────

export const LANGUAGES: Array<{
  value: Language
  label: string
  nativeLabel: string
}> = [
  { value: 'bengali', label: 'Bengali', nativeLabel: 'বাংলা' },
  { value: 'english', label: 'English', nativeLabel: 'English' },
  { value: 'banglish', label: 'Banglish', nativeLabel: 'বাংলিশ' },
] as const

// ─── Emotions ─────────────────────────────────────────────────────────────────

export const EMOTIONS: string[] = [
  'ভালোবাসা',
  'দুঃখ',
  'আনন্দ',
  'আশা',
  'নস্টালজিয়া',
  'কৃতজ্ঞতা',
  'একাকীত্ব',
  'উত্তেজনা',
  'অনুশোচনা',
  'গর্ব',
] as const

// ─── App Config ───────────────────────────────────────────────────────────────

export const APP_CONFIG = {
  name: 'Chithi Lekhi AI',
  tagline: 'যে কথা মুখে বলা যায় না, চিঠিতে লিখে ফেলুন।',
  taglineEn: 'When words fail, letters prevail.',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  maxLetterLength: 1000,
  freeGenerationsPerDay: 3,
} as const

// ─── Category Emoji Map ───────────────────────────────────────────────────────

export const CATEGORY_EMOJI: LetterEmoji = {
  love: '💕',
  friendship: '🤝',
  family: '👨‍👩‍👧',
  apology: '🙏',
  missing: '🌙',
  motivation: '✨',
  secret: '🔐',
} as const

// ─── AI Letter Refinement Options (Phase 04) ──────────────────────────────────

export const REFINEMENT_OPTIONS: Array<{
  value: RefinementType
  label: string
  labelEn: string
  emoji: string
  description: string
}> = [
  {
    value: 'more-emotional',
    label: 'আরও আবেগময় করুন',
    labelEn: 'Make More Emotional',
    emoji: '💧',
    description: 'অনুভূতির গভীরতা ও আকুলতা বাড়িয়ে দিন',
  },
  {
    value: 'more-romantic',
    label: 'আরও রোমান্টিক করুন',
    labelEn: 'Make More Romantic',
    emoji: '💖',
    description: 'প্রেম, অনুরাগ ও মধুর কথন বৃদ্ধি করুন',
  },
  {
    value: 'simpler',
    label: 'আরও সহজ ও স্বাভাবিক',
    labelEn: 'Make Simpler',
    emoji: '🍃',
    description: 'জটিলতা এড়িয়ে আন্তরিক ও সহজ ভাষায় রূপ দিন',
  },
  {
    value: 'longer',
    label: 'চিঠি দীর্ঘ করুন',
    labelEn: 'Make Longer',
    emoji: '📜',
    description: 'আরও বিস্তারিত অনুভূতি ও স্মৃতির বিস্তার ঘটান',
  },
  {
    value: 'shorter',
    label: 'সংক্ষিপ্ত করুন',
    labelEn: 'Make Shorter',
    emoji: '✂️',
    description: 'মূল কথাগুলো রেখে সংক্ষেপ ও নিবিড় করুন',
  },
  {
    value: 'vintage-90s',
    label: '৯০-এর ভিন্টেজ রূপ',
    labelEn: 'Convert to 90s Vintage',
    emoji: '✉️',
    description: 'ঝরনা কলমে নীল খামে লেখা নস্টালজিক আমেজ দিন',
  },
] as const

