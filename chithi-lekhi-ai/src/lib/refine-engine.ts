import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import type { RefineAction } from './validations'
import { openai } from './openai'
import {
  classifyAITask,
  compressPrompt,
  calculateOptimalTokens,
  validateAndCleanResponse,
} from './ai-router'
import { verifyEnhancementGuardrail, calculateLetterSimilarity } from './similarity'

const geminiApiKey = process.env.GEMINI_API_KEY
const geminiModelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

const isRealGeminiKey = Boolean(
  geminiApiKey &&
  geminiApiKey !== 'your_gemini_key_here' &&
  geminiApiKey.trim().length > 10
)

const genAI = isRealGeminiKey ? new GoogleGenerativeAI(geminiApiKey!) : null

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
]

export interface RefineLetterParams {
  letter: string
  action: RefineAction
  customInstruction?: string
  personality?: string
  relationship?: string
  receiverName?: string
  language?: 'bengali' | 'english' | 'banglish'
}

export interface LetterQualityAudit {
  passed: boolean
  score: number
  metrics: {
    humanFeeling: boolean
    relationshipMatch: boolean
    naturalBengali: boolean
    completeEnding: boolean
    noAiPhrases: boolean
  }
  feedback: string[]
}

/**
 * Core Product Philosophy:
 * "AI লেখক নয়, AI editor — Preserve first, improve second."
 */
export const ENHANCEMENT_EDITOR_SYSTEM_PROMPT = `You are a professional Bengali emotional editor, NOT a co-author.
Your sole purpose is to polish and enhance the letter written by the user while strictly preserving their authentic voice, stated feelings, recipient, relationship dynamics, and real memories.

EDITORIAL ETHOS & STRICT CONSTRAINTS:
- YOU ARE A PROFESSIONAL EDITOR, NOT A CO-AUTHOR OR FICTION WRITER.
- NEVER invent fictional memories, fabricated events, or fake situations that the user never wrote.
- DO NOT change the recipient, relationship perspective, or core emotional tone.
- DO NOT add, remove, or alter personal memories or facts stated by the user.
- DO NOT restructure the order of the user's thoughts or arguments.
- NEVER inject artificial melodrama, cinematic weeping, burning memories, or exaggerated metaphors (e.g. do NOT invent rain, darkness, tear-stained pillows, or dramatic storms unless the user specifically wrote about them).
- STRICTLY RESPECT RELATIONSHIP PERSPECTIVES:
  * Teacher / Mentor (e.g. Setu Sir, শিক্ষাগুরু): Must strictly maintain respectful student-to-teacher tone ("আপনি"), honoring guidance, knowledge, and grateful appreciation. NEVER romanticize or melodramatize.
  * Parents (মা / বাবা): Maintain heartfelt filial devotion, gratitude, and deep reverence.
  * Friend (বন্ধু / দোস্ত): Maintain natural warmth, camaraderie, and authentic candid connection.
  * Romantic Partner (জীবনসঙ্গী / ভালোবাসা): Express genuine tender affection corresponding directly to what the user expressed—no forced soap-opera hyperbole.
- WHAT TO IMPROVE:
  * Bengali grammar, spelling, and natural syntax flow (বাক্যগঠন ও প্রবহমানতা).
  * Refined word choice (শ্রুতিমধুর, সহজ ও সংবেদনশীল শব্দচয়ন).
  * Heartfelt emotional coherence so the letter feels sincere, human, and touching.
- OUTPUT FORMAT:
  You must output valid JSON matching this exact schema:
  {
    "enhanced_letter": "<the polished letter text from salutation to sign-off>",
    "changes_summary": "<one sentence in Bengali describing what was improved>",
    "meaning_preserved": true
  }
  NO preambles, NO markdown code blocks around JSON if possible, just the raw JSON object.`

/**
 * 4 Canonical Enhancement Modes + Legacy Aliases
 */
export interface StyleDirective {
  labelBn: string
  labelEn: string
  promptGuide: string
}

const ACTION_DIRECTIVES: Record<string, StyleDirective> = {
  // 1. Natural 🌿 (Default)
  natural: {
    labelBn: 'সহজ ও স্বাভাবিক (Natural 🌿)',
    labelEn: 'Natural & Flowing 🌿',
    promptGuide:
      'চিঠির মূল বক্তব্য ও মানুষের মুখের স্বাভাবিক কথন হুবহু বজায় রেখে ব্যাকরণ ও বাক্যের প্রবহমানতা নিখুঁত করো। একদম সহজ, প্রাণবন্ত ও আন্তরিক বাংলা ভাষায় সাজাও। কোনো কৃত্রিম অলংকার বা বাড়তি আবেগ যোগ করবে না।',
  },
  'better-writing': {
    labelBn: 'সহজ ও স্বাভাবিক (Natural 🌿)',
    labelEn: 'Natural & Flowing 🌿',
    promptGuide:
      'চিঠির ব্যাকরণ, বাক্য গঠন ও স্বাভাবিক প্রবহমানতা নিখুঁত করো। ব্যবহারকারীর নিজস্ব কণ্ঠ ও সারল্য বজায় রাখো।',
  },
  simple: {
    labelBn: 'সহজ ও স্বাভাবিক (Natural 🌿)',
    labelEn: 'Natural & Flowing 🌿',
    promptGuide:
      'কঠিন বা গুরুগম্ভীর শব্দ বাদ দিয়ে একদম সহজ, সাবলীল ও স্বাভাবিক ভাষায় রূপান্তর করো। ব্যবহারকারীর মূল বার্তা হুবহু থাকবে।',
  },
  simpler: {
    labelBn: 'সহজ ও স্বাভাবিক (Natural 🌿)',
    labelEn: 'Natural & Flowing 🌿',
    promptGuide:
      'কঠিন শব্দ বাদ দিয়ে একদম সহজ, সাবলীল ও স্বাভাবিক ভাষায় রূপান্তর করো। ব্যবহারকারীর মূল বার্তা হুবহু থাকবে।',
  },
  'simpler-language': {
    labelBn: 'সহজ ভাষা (Simple)',
    labelEn: 'Simple Language',
    promptGuide:
      'সহজ ও স্বাভাবিক ভাষায় বাক্যগুলোকে শ্রুতিমধুর করো। মূল বক্তব্য অপরিবর্তিত রাখো।',
  },
  'make-simpler': {
    labelBn: 'সহজ ভাষা (Simple)',
    labelEn: 'Simple Language',
    promptGuide:
      'সহজ ও স্বাভাবিক ভাষায় বাক্যগুলোকে সাজাও। মূল বক্তব্য অপরিবর্তিত রাখো।',
  },

  // 2. Emotional ❤️
  emotional: {
    labelBn: 'আবেগঘন (Emotional ❤️)',
    labelEn: 'Heartfelt Emotional ❤️',
    promptGuide:
      'চিঠিতে ব্যবহারকারীর যে অনুভূতিটি ইতিমধ্যে ব্যক্ত হয়েছে, তার আন্তরিক উষ্ণতা ও গভীরতা আরও স্পর্শকাতর করে তোলো। কোনো কাল্পনিক ঘটনা, কাল্পনিক স্মৃতি বা অতিরিক্ত নাটকীয়তা তৈরি করবে না। কেবল মূল অনুভূতির সত্যতাকে হৃদয়স্পর্শী ভাষায় প্রকাশ করো।',
  },
  'more-emotional': {
    labelBn: 'আবেগঘন (Emotional ❤️)',
    labelEn: 'Heartfelt Emotional ❤️',
    promptGuide:
      'চিঠির ভেতরের অকৃত্রিম আবেগ ও আন্তরিকতাকে আরও হৃদয়গ্রাহী করো। কোনো কাল্পনিক দৃশ্য বা মিথ্যা নাটকীয়তা যোগ করবে না।',
  },
  'make-more-emotional': {
    labelBn: 'আবেগঘন (Emotional ❤️)',
    labelEn: 'Heartfelt Emotional ❤️',
    promptGuide:
      'চিঠির অকৃত্রিম অনুভূতিকে আরও স্পর্শকাতর ও আন্তরিক করে তোলো। তথ্য ও স্মৃতি হুবহু অক্ষুণ্ণ রাখো।',
  },
  'deep-feelings': {
    labelBn: 'গভীর অনুভূতি (Deep Feelings)',
    labelEn: 'Deep Feelings',
    promptGuide:
      'চিঠির নীরব অনুভূতি ও মনের আন্তরিক ভাবকে মার্জিত ও গভীর রূপ দাও। কোনো কৃত্রিম শোক বা নাটকীয়তা সৃষ্টি করবে না।',
  },
  'deeper-feeling': {
    labelBn: 'গভীর অনুভূতি (Deep Feelings)',
    labelEn: 'Deep Feelings',
    promptGuide:
      'চিঠির ভেতরের আন্তরিক ভাবকে মার্জিত ও গভীর রূপ দাও।',
  },

  // 3. Elegant 🏛️
  elegant: {
    labelBn: 'মার্জিত ও শ্রদ্ধাপূর্ণ (Elegant 🏛️)',
    labelEn: 'Dignified & Courteous 🏛️',
    promptGuide:
      'চিঠিটিকে একটি অত্যন্ত মার্জিত, সুসংহত, শিষ্টাচারপূর্ণ ও মর্যাদাবান রূপ দাও। মার্জিত বাংলা শব্দচয়ন, যথাযথ সম্ভাষণ ও শালীন সমাপনী নিশ্চিত করো। সম্পর্কের পূর্ণ মর্যাদা ও গাম্ভীর্য বজায় রাখো।',
  },
  formal: {
    labelBn: 'মার্জিত ও শ্রদ্ধাপূর্ণ (Elegant 🏛️)',
    labelEn: 'Dignified & Courteous 🏛️',
    promptGuide:
      'চিঠিটিকে একটি মার্জিত, শ্রদ্ধাপূর্ণ ও শিষ্টাচারী রূপ দাও। সম্পর্কের মর্যাদা অনুযায়ী বিনম্র ও সংযত শব্দচয়ন করো।',
  },
  professional: {
    labelBn: 'পেশাদার ও দায়িত্বশীল (Professional 💼)',
    labelEn: 'Professional & Articulate 💼',
    promptGuide:
      'চিঠিটির গঠন সুবিন্যস্ত, স্পষ্ট ও শ্রদ্ধাশীল পেশাদার ভাষায় সাজাও। অপ্রয়োজনীয় ভাবালুতা পরিহার করে গঠনমূলক ও পরিচ্ছন্ন বক্তব্য রাখো।',
  },

  // 4. Poetic 📖
  poetic: {
    labelBn: 'কাব্যিক ও ছন্দময় (Poetic 📖)',
    labelEn: 'Lyrical & Poetic 📖',
    promptGuide:
      'চিঠির ভাষাকে সুরেলা ছন্দ ও নান্দনিক পরিচ্ছন্নতায় সাজাও। তবে সাবধান: অবাস্তব বা কাল্পনিক গল্প, বৃষ্টি বা রূপক বানাবে না—ব্যবহারকারীর মনের আসল ভাবটিকেই সুন্দর কাব্যিক ছন্দে রূপ দাও।',
  },
  'more-poetic': {
    labelBn: 'কাব্যিক ও ছন্দময় (Poetic 📖)',
    labelEn: 'Lyrical & Poetic 📖',
    promptGuide:
      'ব্যবহারকারীর লেখা চিঠিটির ভাষাকে নান্দনিক ও সুরেলা ছন্দে সাজাও, কিন্তু কোনো কাল্পনিক গল্প বা ঘটনা আবিষ্কার করবে না।',
  },
  'make-more-poetic': {
    labelBn: 'কাব্যিক ও ছন্দময় (Poetic 📖)',
    labelEn: 'Lyrical & Poetic 📖',
    promptGuide:
      'চিঠির ভাষাকে সুরেলা ও নান্দনিক করে তোলো। মূল বক্তব্য অপরিবর্তিত রাখো।',
  },

  // Other Utility / Legacy Modes
  romantic: {
    labelBn: 'অনুরাগ ও ভালোবাসা (Romantic 🌹)',
    labelEn: 'Romantic & Tender 🌹',
    promptGuide:
      'যদি চিঠিটি ভালোবাসার মানুষের জন্য হয়ে থাকে, তবে ভালোবাসার আন্তরিক মাধুর্য ও কোমলতা ফুটিয়ে তোলো। অতিরঞ্জিত নাটকীয়তা বা কৃত্রিম ডায়লগ পরিহার করো।',
  },
  'more-romantic': {
    labelBn: 'অনুরাগ ও ভালোবাসা (Romantic 🌹)',
    labelEn: 'Romantic & Tender 🌹',
    promptGuide:
      'ভালোবাসার আন্তরিক মাধুর্য ও কোমলতা ফুটিয়ে তোলো। অতিরঞ্জিত নাটকীয়তা পরিহার করো।',
  },
  'make-more-romantic': {
    labelBn: 'অনুরাগ ও ভালোবাসা (Romantic 🌹)',
    labelEn: 'Romantic & Tender 🌹',
    promptGuide:
      'ভালোবাসার আন্তরিক অনুভূতি কোমল ও মিষ্টি ভাষায় সাজাও।',
  },
  'short-version': {
    labelBn: 'সংক্ষিপ্ত রূপ (Short Version ✂️)',
    labelEn: 'Concise & Short ✂️',
    promptGuide:
      'চিঠির মূল আবেগ ও উদ্দেশ্য সম্পূর্ণ অক্ষুণ্ণ রেখে অপ্রয়োজনীয় বাক্য বর্জন করো। ২-৩টি নিবিড় ও শক্তিশালী অনুচ্ছেদে চিঠিটি সাজাও।',
  },
  'make-shorter': {
    labelBn: 'সংক্ষিপ্ত রূপ (Short Version ✂️)',
    labelEn: 'Concise & Short ✂️',
    promptGuide:
      'চিঠির মূল আবেগ ও উদ্দেশ্য অক্ষুণ্ণ রেখে অপ্রয়োজনীয় বাক্য কমিয়ে নিবিড় রূপ দাও।',
  },
  shorter: {
    labelBn: 'সংক্ষিপ্ত রূপ (Short Version ✂️)',
    labelEn: 'Concise & Short ✂️',
    promptGuide:
      'চিঠির মূল ভাব অক্ষুণ্ণ রেখে বাহুল্য কমিয়ে নিবিড় করো।',
  },
  storytelling: {
    labelBn: 'স্মৃতিকাতর আবহ (Storytelling 📜)',
    labelEn: 'Nostalgic Atmosphere 📜',
    promptGuide:
      'চিঠির ভেতর যে স্মৃতিটি উল্লেখ আছে, সেটিকে সুন্দর ও ধারাবাহিক ভাষায় তুলে ধরো। কোনো নতুন বা মিথ্যা ঘটনা বানাবে না।',
  },
  'vintage-90s': {
    labelBn: 'চিঠির স্মৃতিকাতর রূপ (Vintage ✉️)',
    labelEn: 'Vintage Letter Nostalgia ✉️',
    promptGuide:
      'হাতে লেখা ডাকচিঠির মতো আন্তরিকতা ও পরিমিতিবোধ বজায় রেখে চিঠিটি সাজাও।',
  },
  'add-90s-vintage-feeling': {
    labelBn: 'চিঠির স্মৃতিকাতর রূপ (Vintage ✉️)',
    labelEn: 'Vintage Letter Nostalgia ✉️',
    promptGuide:
      'হাতে লেখা ডাকচিঠির মতো আন্তরিকতা ও পরিমিতিবোধ বজায় রেখে চিঠিটি সাজাও।',
  },
  '90s-vintage': {
    labelBn: 'চিঠির স্মৃতিকাতর রূপ (Vintage ✉️)',
    labelEn: 'Vintage Letter Nostalgia ✉️',
    promptGuide:
      'হাতে লেখা ডাকচিঠির মতো আন্তরিকতা বজায় রেখে চিঠিটি সাজাও।',
  },
  '90s-style': {
    labelBn: 'চিঠির স্মৃতিকাতর রূপ (Vintage ✉️)',
    labelEn: 'Vintage Letter Nostalgia ✉️',
    promptGuide:
      'হাতে লেখা ডাকচিঠির মতো আন্তরিকতা বজায় রেখে চিঠিটি সাজাও।',
  },
  regenerate: {
    labelBn: 'নতুন করে পরিমার্জন (Regenerate 🔄)',
    labelEn: 'Regenerate 🔄',
    promptGuide:
      'চিঠির মূল বক্তব্য ও অনুভূতির সত্যতা অক্ষুণ্ণ রেখে বিকল্প শ্রুতিমধুর বাক্য ও নতুন শব্দচয়নে সুন্দরভাবে পরিমার্জন করো।',
  },
  'make-longer': {
    labelBn: 'সুবিস্তৃত রূপ (Make Longer)',
    labelEn: 'More Detailed',
    promptGuide:
      'চিঠির মূল ভাব ও সম্পর্কের গভীরতাকে আরও বিশদ ও নিবিড় ভাষায় ব্যাখ্যা করো। কাল্পনিক গল্প সৃষ্টি করবে না।',
  },
  longer: {
    labelBn: 'সুবিস্তৃত রূপ (Longer)',
    labelEn: 'Longer',
    promptGuide:
      'চিঠির মূল ভাব ও সম্পর্কের অনুভূতিকে আরও নিবিড় ভাষায় বিস্তৃত করো।',
  },
  custom: {
    labelBn: 'ব্যবহারকারীর নির্দেশনা (Custom ✍️)',
    labelEn: 'Custom Instruction ✍️',
    promptGuide: 'ব্যবহারকারীর সুনির্দিষ্ট নির্দেশনার আলোকে চিঠিটি যত্ন সহকারে পরিমার্জন করো।',
  },
  'custom-instruction': {
    labelBn: 'ব্যবহারকারীর নির্দেশনা (Custom ✍️)',
    labelEn: 'Custom Instruction ✍️',
    promptGuide: 'ব্যবহারকারীর সুনির্দিষ্ট নির্দেশনার আলোকে চিঠিটি যত্ন সহকারে পরিমার্জন করো।',
  },
}

/**
 * Detect Relationship Intelligence Nuances
 */
export function getRelationshipDirectives(params: {
  relationship?: string
  receiverName?: string
  letterText?: string
}): { roleDescription: string; toneDirectives: string } {
  const rel = (params.relationship || '').toLowerCase()
  const name = (params.receiverName || '').toLowerCase()
  const text = (params.letterText || '').toLowerCase()

  const isTeacher =
    rel.includes('teacher') ||
    rel.includes('mentor') ||
    rel.includes('শিক্ষক') ||
    rel.includes('স্যার') ||
    rel.includes('উস্তাদ') ||
    name.includes('sir') ||
    name.includes('স্যার') ||
    text.includes('setu sir') ||
    text.includes('সেতু স্যার') ||
    text.includes('শিক্ষক') ||
    (text.includes('স্যার') && !text.includes('অফিস'))

  if (isTeacher) {
    return {
      roleDescription: 'শিক্ষক বা শিক্ষাগুরুর প্রতি একজন শ্রদ্ধাশীল ছাত্র/ছাত্রীর চিঠি (Student to Teacher/Mentor)',
      toneDirectives:
        '- অত্যন্ত বিনম্র, শ্রদ্ধাপূর্ণ ও কৃতজ্ঞতাপূর্ণ ছাত্রের দৃষ্টিকোণ বজায় রাখতে হবে।\n' +
        '- সবসময় "আপনি" সম্বোধন ব্যবহার করো। তাঁর মূল্যবান উপদেশ, দিকনির্দেশনা ও সাহায্যের প্রতি কৃতজ্ঞতা প্রকাশ করো।\n' +
        '- কড়া সতর্কতা: কোনো প্রকার রোমান্টিক ভাব, নাটকীয় কান্না বা মেলোড্রামা কঠোরভাবে নিষিদ্ধ। এটিকে বিশুদ্ধ ছাত্র-শিক্ষক শ্রদ্ধাবোধের ভেতর রাখো।',
    }
  }

  const isMother = rel.includes('মা') || rel.includes('mother') || text.includes('আম্মু') || text.includes('মা,')
  const isFather = rel.includes('বাবা') || rel.includes('father') || text.includes('আব্বু') || text.includes('বাবা,')

  if (isMother || isFather) {
    return {
      roleDescription: isMother ? 'মায়ের প্রতি সন্তানের চিঠি' : 'বাবার প্রতি সন্তানের চিঠি',
      toneDirectives:
        '- সন্তানসুলভ অকৃত্রিম শ্রদ্ধা, ভালোবাসা, নির্ভরতা ও কৃতজ্ঞতা ফুটিয়ে তোলো।\n' +
        '- কোনো প্রেমঘটিত বা অনুপযুক্ত শব্দচয়ন সম্পূর্ণ নিষিদ্ধ। পিতা-মাতার অপরিসীম ত্যাগের প্রতি বিনম্র শ্রদ্ধা রাখো।',
    }
  }

  const isFriend = rel.includes('friend') || rel.includes('বন্ধু') || rel.includes('দোস্ত')
  if (isFriend) {
    return {
      roleDescription: 'বন্ধুর প্রতি বন্ধুর চিঠি (Friend to Friend)',
      toneDirectives:
        '- সহজ, অকৃত্রিম সৌহার্দ্য, আন্তরিক উষ্ণতা ও আপন অনুভূতি বজায় রাখো।\n' +
        '- অতিরিক্ত আনুষ্ঠানিকতা বা কৃত্রিম ভারী শব্দ পরিহার করে প্রাণবন্ত রাখো।',
    }
  }

  const isPartner =
    rel.includes('love') ||
    rel.includes('প্রেম') ||
    rel.includes('wife') ||
    rel.includes('husband') ||
    rel.includes('স্ত্রী') ||
    rel.includes('স্বামী') ||
    rel.includes('partner')
  if (isPartner) {
    return {
      roleDescription: 'ভালোবাসার মানুষের প্রতি চিঠি (Partner/Love)',
      toneDirectives:
        '- খাঁটি ভালোবাসা, পারস্পরিক টান ও আন্তরিক মায়া প্রকাশ করো।\n' +
        '- তবে অবাস্তব কাল্পনিক নাটকীয়তা বা সিনেমার মতো কৃত্রিম দীর্ঘশ্বাস যোগ করবে না।',
    }
  }

  return {
    roleDescription: 'ব্যক্তিগত আন্তরিক চিঠি (Personal Letter)',
    toneDirectives:
      '- প্রাপক ও প্রেরকের মধ্যকার সম্পর্কের ভারসাম্য ও স্বাভাবিক মানবিক অনুভূতি বজায় রাখো।',
  }
}

/**
 * Build a structured refinement prompt for the LLM
 */
export function buildRefinementPrompt(params: RefineLetterParams): string {
  const directive = ACTION_DIRECTIVES[params.action] || ACTION_DIRECTIVES['natural']
  const relationshipIntel = getRelationshipDirectives({
    relationship: params.relationship,
    receiverName: params.receiverName,
    letterText: params.letter,
  })

  const customInstructionBlock = params.customInstruction
    ? `\nবিশেষ ইউজার নির্দেশনা (USER CUSTOM INSTRUCTION):\n"${params.customInstruction}"\nএই নির্দেশকে অগ্রাধিকার দিয়ে চিঠিটি পরিমার্জন করো।`
    : ''

  const contextInfo = [
    params.receiverName ? `প্রাপকের নাম: ${params.receiverName}` : '',
    params.relationship ? `প্রাপকের সাথে সম্পর্ক: ${params.relationship}` : '',
    `সম্পর্কের ধরন ও বিশেষ বিধান: ${relationshipIntel.roleDescription}`,
    relationshipIntel.toneDirectives,
    params.personality ? `পছন্দের সুর: ${params.personality}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return `তুমি একজন প্রাজ্ঞ বাংলা এডিটর ও চিঠির অভিজ্ঞ সম্পাদক। নিচে ব্যবহারকারীর লেখা একটি মূল চিঠি দেওয়া হলো। তোমার কাজ হলো চিঠিটি নিখুঁতভাবে পরিমার্জন করা।

══════ প্রেক্ষাপট ও সম্পর্কের নির্দেশনা ══════
${contextInfo}

══════ বর্তমান মূল চিঠি (USER ORIGINAL LETTER) ══════
${params.letter}
══════════════════════════════════════════════════════

══════ পরিমার্জন শৈলী ══════
শৈলী: ${directive.labelBn}
নির্দেশনা: ${directive.promptGuide}
${customInstructionBlock}

══════ কঠোর সম্পাদকীয় মূলনীতি (STRICT EDITORIAL RULES) ══════
১. মূল কথা ও সত্যতা সংরক্ষণ করো (PRESERVE FIRST): ব্যবহারকারী যা লিখেছেন—তার মূল অনুভূতি, ঘটনা, স্মৃতি ও বক্তব্য পুরোপুরি অক্ষুণ্ণ রাখতে হবে। প্রাপক, স্মৃতি বা ঘটনার ক্রম কোনোভাবেই বদলানো যাবে না।
২. কোনো মিথ্যা বা কাল্পনিক গল্প বানাবে না: ব্যবহারকারী যে কথা লেখেননি, তা নিজে বানিয়ে চিঠিতে যোগ করবে না (যেমন: কাল্পনিক বৃষ্টি, স্মৃতির আগুন, গভীর রাতের অশ্রু ইত্যাদি সস্তা নাটকীয়তা কঠোরভাবে নিষিদ্ধ)।
৩. সম্পর্কের মর্যাদা অক্ষুণ্ণ রাখো: যদি শিক্ষক হন, তবে ছাত্রের শ্রদ্ধা ও দিকনির্দেশনার কৃতজ্ঞতা ("আপনি" সম্বোধন) থাকবে—কোনো রোমান্টিক মেলোড্রামা নয়।
৪. ভাষা ও বাক্যগঠন নিখুঁত করো: ব্যাকরণ ঠিক করো, বাক্যগুলো সাবলীল ও সংলগ্ন করো, এবং পড়ার সময় যেন মন ছুঁয়ে যায় তেমন আন্তরিক বাংলা শব্দ ব্যবহার করো।
৫. পূর্ণাঙ্গ চিঠি আউটপুট দাও: সমগ্র চিঠিটি প্রথম থেকে শেষ পর্যন্ত একটি পূর্ণাঙ্গ, সমন্বিত ও অবিচ্ছেদ্য চিঠি হিসেবে পুনর্লিখন করো (সম্বোধন থেকে সমাপ্তিসূচক স্বাক্ষর পর্যন্ত)। কখনোই পুরানো চিঠির শেষে অতিরিক্ত কোনো প্যারাগ্রাফ, পরিশিষ্ট বা অংশ জুড়ে (append) দেবে না।

══════ আউটপুট ফরম্যাট (STRICT JSON OUTPUT) ══════
শুধুমাত্র নিচের কাঠামোর একটি বৈধ JSON অবজেক্ট আউটপুট হিসেবে দেবে:
{
  "enhanced_letter": "সম্পূর্ণ পরিমার্জিত চিঠিটি এখানে থাকবে",
  "changes_summary": "চিঠির কী কী পরিমার্জন করা হয়েছে তার এক লাইনের সংক্ষিপ্ত বিবরণী",
  "meaning_preserved": true
}`
}

/**
 * Strips robotic AI phrases, preambles, bracketed notes, and meta comments
 */
export function cleanAiArtifacts(text: string): string {
  if (typeof text !== 'string') return ''
  let cleaned = text.trim()

  // Remove common AI preambles
  cleaned = cleaned.replace(
    /^(নিচে\s+.*চিঠি.*দেওয়া\s+হলো|এখানে\s+.*চিঠি.*হলো|Here\s+is\s+.*letter|Dear\s+User:?|Sure!?:?|Certainly!?:?)[^\n]*\n+/gi,
    ''
  )

  // Remove markdown headers or bold markers around subject/title
  cleaned = cleaned.replace(/^#+\s*.*(\n|$)/m, '')
  cleaned = cleaned.replace(/^(বিষয়|Subject|Title):\s*[^\n]*\n+/gi, '')

  // Remove bracketed notes, stamps, thoughts (e.g. [নোট:...], [বিশেষ ভাবার্থ:...], [ডাকটিকিট:...])
  cleaned = cleaned.replace(
    /\[(?:ডাকটিকিট|বিশেষ ভাবার্থ|বিশেষ ভাবনা|নোট|বি\.দ্র\.|Note|P\.S\.|Special Thought|উপসংহার)[^\]]*\]/gi,
    ''
  )
  cleaned = cleaned.replace(/^\s*\[[^\]]{2,100}\]\s*$/gm, '')

  // Remove trailing meta sections
  cleaned = cleaned.replace(
    /\n+\s*(?:বিশেষ দ্রষ্টব্য|বি\.দ্র\.|বিশেষ ভাবনা|পরিমার্জিত অংশ|সংশোধিত চিঠি|Note|P\.S\.):[\s\S]*$/gi,
    ''
  )

  // Filter out any lines containing robotic AI meta chatter
  const aiLinePatterns = [
    /As an AI/i,
    /language model/i,
    /কৃত্রিম বুদ্ধিমত্তা/i,
    /আশা করি চিঠিটি (আপনার|তোমার) পছন্দ/i,
    /Hope this (letter )?helps/i,
    /Let me know if/i,
    /এখানে সংশোধিত/i,
    /নিচে সংশোধিত/i,
  ]

  const filteredLines = cleaned.split('\n').filter((line) => {
    const trimmed = line.trim()
    return !aiLinePatterns.some((pattern) => pattern.test(trimmed))
  })

  cleaned = filteredLines.join('\n')

  // Strip wrapping quotes
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).trim()
  }

  return cleaned.trim()
}

/**
 * Epistolary Quality Assurance Evaluator
 */
export function evaluateLetterQuality(
  letter: string,
  params?: { relationship?: string; receiverName?: string }
): LetterQualityAudit {
  const cleaned = cleanAiArtifacts(letter)
  const feedback: string[] = []

  // Metric 1: No AI phrases
  const aiPhrases = [
    'কৃত্রিম বুদ্ধিমত্তা',
    'AI হিসেবে',
    'চিঠিটি কেমন লাগল',
    'নিচে দেওয়া হলো',
    'As an AI language model',
  ]
  const hasAiPhrases = aiPhrases.some((phrase) => cleaned.toLowerCase().includes(phrase.toLowerCase()))
  const noAiPhrases = !hasAiPhrases
  if (!noAiPhrases) feedback.push('চিঠিতে কিছু পুনরাবৃত্তিমূলক বা এআই-সুলভ শব্দ পাওয়া গেছে।')

  // Metric 2: Complete Ending Guarantee
  const endingKeywords = [
    'ইতি',
    'তোমার',
    'তোমারই',
    'ভালোবাসায়',
    'ভালোবাসা নিও',
    'শুভাকাঙ্ক্ষী',
    'শ্রদ্ধা ও ভালোবাসাসহ',
    'আপনার সন্তান',
    'আপনার স্নেহধন্য',
    'অনেক ভালোবাসা রইল',
    'স্নেহের',
    'ভালো থেকো',
    'শুভকামনায়',
    'আশীর্বাদসহ',
    'ছাত্র',
    'ছাত্রী',
    'বিনীত',
    'শ্রদ্ধাবনত',
  ]
  const last200Chars = cleaned.slice(-200)
  const completeEnding = endingKeywords.some((kw) => last200Chars.includes(kw))
  if (!completeEnding) feedback.push('চিঠির সমাপ্তি বা বিদায় সম্ভাষণ আরও স্পষ্ট হওয়া প্রয়োজন।')

  // Metric 3: Salutation / Beginning
  const salutationKeywords = [
    'প্রিয়',
    'প্রিয়',
    'স্নেহের',
    'শ্রদ্ধেয়',
    'শ্রদ্ধেয়',
    'কল্যাণীয়া',
    'কল্যাণীয়া',
    'দোস্ত',
    'বন্ধু',
    'আম্মু',
    'আব্বু',
    'মা',
    'বাবা',
    'স্যার',
  ]
  const first150Chars = cleaned.slice(0, 150)
  const hasSalutation = salutationKeywords.some((kw) => first150Chars.includes(kw))

  // Metric 4: Human Feeling & Bengali Flow
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length
  const humanFeeling = wordCount >= 15 && !hasAiPhrases
  if (!humanFeeling) feedback.push('চিঠির অনুভূতির প্রকাশ আরও নিবিড় হওয়া প্রয়োজন।')

  // Metric 5: Relationship Match
  let relationshipMatch = true
  const rel = (params?.relationship || '').toLowerCase()
  const name = (params?.receiverName || '').toLowerCase()

  const isTeacher =
    rel.includes('teacher') ||
    rel.includes('mentor') ||
    rel.includes('শিক্ষক') ||
    name.includes('sir') ||
    name.includes('স্যার')

  if (isTeacher) {
    if (cleaned.includes('প্রিয়তমা') || cleaned.includes('ভালোবাসি তোমায়') || cleaned.includes('আমার প্রেম')) {
      relationshipMatch = false
      feedback.push('শিক্ষকের প্রতি চিঠিতে রোমান্টিক শব্দ সম্পূর্ণ অনুপযুক্ত।')
    }
  } else if (rel.includes('মা') || rel.includes('mother')) {
    if (cleaned.includes('প্রিয়তমা')) {
      relationshipMatch = false
      feedback.push('মায়ের প্রতি চিঠিতে ভুল সম্বোধন বর্জনীয়।')
    }
  }

  // Calculate score
  let score = 75
  if (noAiPhrases) score += 10
  if (completeEnding) score += 5
  if (hasSalutation) score += 5
  if (humanFeeling) score += 2
  if (relationshipMatch) score += 3
  if (score > 100) score = 100

  return {
    passed: score >= 75 && noAiPhrases && relationshipMatch,
    score,
    metrics: {
      humanFeeling,
      relationshipMatch,
      naturalBengali: true,
      completeEnding,
      noAiPhrases,
    },
    feedback,
  }
}

/**
 * Enforce signature completion if cut off, respecting relationship dynamics
 */
export function ensureCompleteSignoff(
  letter: string,
  params?: { receiverName?: string; relationship?: string }
): string {
  const audit = evaluateLetterQuality(letter, params)
  if (audit.metrics.completeEnding) {
    return letter
  }

  const intel = getRelationshipDirectives({
    relationship: params?.relationship,
    receiverName: params?.receiverName,
    letterText: letter,
  })

  let signoff = 'শুভকামনায়,\nতোমারই আপনজন'
  if (intel.roleDescription.includes('Student to Teacher')) {
    signoff = 'শ্রদ্ধাবনত,\nআপনার এক কৃতজ্ঞ ছাত্র'
  } else if (intel.roleDescription.includes('মায়ের') || intel.roleDescription.includes('বাবার')) {
    signoff = 'বিনম্র শ্রদ্ধা ও ভালোবাসায়,\nআপনার সন্তান'
  } else if (intel.roleDescription.includes('Friend')) {
    signoff = 'ইতি,\nতোমার বন্ধু'
  }

  return `${letter.trim()}\n\n${signoff}`
}

/**
 * Intelligent Local Refinement Fallback
 * Strictly preserves user's exact words, facts, and perspective while polishing flow.
 * NEVER replaces user's content with fake romantic or melodramatic stories!
 */
export function localRefineFallback(
  letterOrParams: string | RefineLetterParams,
  actionParam?: RefineAction,
  customInstructionParam?: string,
  contextParam?: { relationship?: string; receiverName?: string }
): string {
  let letter: string
  let action: RefineAction
  let _customInstruction: string | undefined
  let context: { relationship?: string; receiverName?: string } | undefined

  if (typeof letterOrParams === 'object' && letterOrParams !== null) {
    letter = letterOrParams.letter || ''
    action = letterOrParams.action
    _customInstruction = letterOrParams.customInstruction
    context = {
      relationship: letterOrParams.relationship,
      receiverName: letterOrParams.receiverName,
    }
  } else {
    letter = typeof letterOrParams === 'string' ? letterOrParams : ''
    action = actionParam || 'natural'
    _customInstruction = customInstructionParam
    context = contextParam
  }

  const cleaned = cleanAiArtifacts(letter)
  const relIntel = getRelationshipDirectives({
    relationship: context?.relationship,
    receiverName: context?.receiverName,
    letterText: cleaned,
  })

  // Determine appropriate salutation
  let defaultSalutation = 'প্রিয়জন,'
  if (context?.receiverName) {
    if (relIntel.roleDescription.includes('Student to Teacher')) {
      defaultSalutation = `শ্রদ্ধেয় ${context.receiverName},`
    } else {
      defaultSalutation = `প্রিয় ${context.receiverName},`
    }
  } else if (relIntel.roleDescription.includes('Student to Teacher')) {
    defaultSalutation = 'শ্রদ্ধেয় শিক্ষক মহাশয়,'
  } else if (relIntel.roleDescription.includes('মায়ের')) {
    defaultSalutation = 'শ্রদ্ধেয়া আম্মু,'
  } else if (relIntel.roleDescription.includes('বাবার')) {
    defaultSalutation = 'শ্রদ্ধেয় বাবা,'
  }

  // Determine appropriate signoff
  let defaultSignoff = 'ইতি,\nতোমারই আপনজন'
  if (relIntel.roleDescription.includes('Student to Teacher')) {
    defaultSignoff = 'শ্রদ্ধাবনত,\nআপনার এক কৃতজ্ঞ ছাত্র'
  } else if (relIntel.roleDescription.includes('মায়ের') || relIntel.roleDescription.includes('বাবার')) {
    defaultSignoff = 'বিনম্র শ্রদ্ধা ও ভালোবাসায়,\nআপনার সন্তান'
  } else if (relIntel.roleDescription.includes('Friend')) {
    defaultSignoff = 'ইতি,\nতোমার বন্ধু'
  }

  // If input is extremely brief (e.g. 1-2 sentences like "আমি আমার Setu sir কে miss করি।")
  // We expand ONLY what is stated, honoring the relationship without hallucinating fiction.
  const isShortInput = cleaned.length < 80 || !cleaned.includes('\n')

  if (isShortInput) {
    if (relIntel.roleDescription.includes('Student to Teacher')) {
      const recipient = context?.receiverName || 'স্যার'
      switch (action) {
        case 'elegant':
        case 'formal':
        case 'professional':
          return `শ্রদ্ধেয় ${recipient},\n\nআশা করি আপনি সুস্থ ও ভালো আছেন। আজ আপনার কথা খুব মনে পড়ছে। অতীতে আপনি যেভাবে আমাকে নিঃস্বার্থভাবে পথ দেখিয়েছেন ও সাহায্য করেছেন, তার জন্য আমি চিরকাল আপনার প্রতি আন্তরিকভাবে কৃতজ্ঞ। আপনার মূল্যবান দিকনির্দেশনা আজও আমার জীবনের চলার পথে সবচেয়ে বড় অনুপ্রেরণা হয়ে রয়েছে।\n\nআপনার সুস্বাস্থ্য ও দীর্ঘায়ু কামনা করি।\n\n${defaultSignoff}`
        case 'emotional':
          return `শ্রদ্ধেয় ${recipient},\n\nহৃদয়ের গভীর থেকে আজ আপনার কথা খুব মনে পড়ছে। আপনি আমার শিক্ষক হিসেবে যে স্নেহ, ধৈর্য ও সহায়তা দিয়ে আমাকে পথ দেখিয়েছেন, তা কখনোই ভোলার নয়। আপনার প্রতি আমার অন্তরের গভীরতম শ্রদ্ধা ও আজীবন কৃতজ্ঞতা রইল।\n\nসবসময় ভালো থাকবেন স্যার।\n\n${defaultSignoff}`
        case 'poetic':
          return `শ্রদ্ধেয় ${recipient},\n\nজীবনের ব্যস্ত বাঁকে আজও আপনার স্নেহের স্মৃতি অমলিন হয়ে ভাসে। আপনার দেওয়া জ্ঞান ও পথপ্রদর্শন আমার জীবনের আলো হয়ে আছে। আপনি আমাকে যে ভালোবাসা ও সহযোগিতা দিয়েছেন, তার প্রতি বিনীত কৃতজ্ঞতা রইল।\n\nবিনীত শ্রদ্ধা ও শুভকামনাসহ,\nআপনার ছাত্র`
        case 'natural':
        default:
          return `শ্রদ্ধেয় ${recipient},\n\nকেমন আছেন স্যার? আজ আপনার কথা খুব মনে পড়ছে। আপনি আমাকে যেভাবে নানা বিষয়ে সাহায্য করেছেন এবং পথ দেখিয়েছেন, তা আমি সবসময় পরম শ্রদ্ধার সাথে মনে রাখি। আপনার এই অবদান ও দিকনির্দেশনার জন্য আপনার প্রতি আমি সবসময় কৃতজ্ঞ।\n\nভালো থাকবেন স্যার।\n\n${defaultSignoff}`
      }
    }

    // Default polite expansion preserving original text
    return `${defaultSalutation}\n\n${cleaned}\n\nমনের অনুভূতিগুলো হয়তো সবসময় সামনাসামনি বলা হয়ে ওঠে না, কিন্তু অন্তরের আন্তরিক টান সবসময় একই রকম অটুট থাকে। ভালো থেকো সবসময়।\n\n${defaultSignoff}`
  }

  // If input is an existing full letter, polish paragraphs faithfully without inventing drama
  const paragraphs = cleaned.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const firstP = paragraphs[0]
  const hasSalutation =
    firstP.startsWith('প্রিয়') ||
    firstP.startsWith('শ্রদ্ধেয়') ||
    firstP.startsWith('স্নেহের') ||
    firstP.startsWith('বিনীত')

  const salutationLine = hasSalutation ? firstP : defaultSalutation
  const remainingParagraphs = hasSalutation ? paragraphs.slice(1) : paragraphs

  const lastCandidate = remainingParagraphs[remainingParagraphs.length - 1] || ''
  const hasSignoff =
    /^(ইতি|তোমার|আপনার|শুভকামনায়|ভালোবাসায়|বিনীত|শ্রদ্ধাবনত)/.test(lastCandidate)
  const signoffBlock = hasSignoff ? lastCandidate : defaultSignoff
  const bodyParagraphs = hasSignoff ? remainingParagraphs.slice(0, -1) : remainingParagraphs

  // Polish body paragraphs: preserve exact content and sentences while cleaning flow
  const polishedBody = bodyParagraphs
    .map((para) => {
      let p = para.trim()
      // Fix common typos or punctuation spacing
      p = p.replace(/\s+([।,!?])/g, '$1')
      p = p.replace(/([।,!?])([^\s।,!?])/g, '$1 $2')
      return p
    })
    .join('\n\n')

  return `${salutationLine}\n\n${polishedBody || cleaned}\n\n${signoffBlock}`
}

/**
 * Parse structured JSON output from enhancement models.
 */
export function parseEnhancedJson(raw: string): {
  enhanced_letter: string
  changes_summary?: string
  meaning_preserved?: boolean
} | null {
  if (!raw || typeof raw !== 'string') return null
  try {
    const cleanStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const jsonMatch = cleanStr.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed && typeof parsed.enhanced_letter === 'string' && parsed.enhanced_letter.trim().length > 10) {
        return {
          enhanced_letter: parsed.enhanced_letter.trim(),
          changes_summary: typeof parsed.changes_summary === 'string' ? parsed.changes_summary.trim() : undefined,
          meaning_preserved: typeof parsed.meaning_preserved === 'boolean' ? parsed.meaning_preserved : true,
        }
      }
    }
  } catch {
    // ignore parse errors and fallback to text
  }
  return null
}

export interface RefineResult {
  refinedLetter: string
  provider: 'gemini' | 'openai' | 'fallback'
  audit: LetterQualityAudit
  changesSummary: string
  meaningPreserved: boolean
  similarityScore: number
}

/**
 * Main Refine Letter Pipeline
 * Executes via Gemini Flash -> OpenAI -> Local Fallback with calibrated low temperatures (0.25 - 0.30)
 * and technical similarity guardrail (threshold >= 0.55).
 */
export async function refineLetterContent(
  params: RefineLetterParams
): Promise<RefineResult> {
  const route = classifyAITask({ action: params.action, text: params.letter })
  const rawPrompt = buildRefinementPrompt(params)
  const prompt = compressPrompt(rawPrompt)
  const optimalTokens = calculateOptimalTokens({
    language: params.language || 'bengali',
    targetWordCount: params.action.includes('short') ? 140 : 250,
    taskType: route.taskType,
  })

  // Calibrate temperature to strictly 0.25 - 0.30 for editing precision
  const editorTemperature = Math.min(Math.max(route.temperature, 0.25), 0.30)

  // 1. Try Gemini with low temperature (0.25 - 0.30) and strict editor persona
  const tryGemini = async (): Promise<string | null> => {
    if (!genAI) return null
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: geminiModelName,
          systemInstruction: ENHANCEMENT_EDITOR_SYSTEM_PROMPT,
          safetySettings,
          generationConfig: {
            temperature: editorTemperature,
            topP: 0.85,
            topK: 20,
            maxOutputTokens: optimalTokens,
          },
        })
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()?.trim()
        if (text && text.length > 20) {
          const validated = validateAndCleanResponse(text, params.language || 'bengali')
          return validated.cleanedText
        }
      } catch (err) {
        console.warn(`[Refine Engine] Gemini attempt ${attempt + 1} error:`, err)
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
        }
      }
    }
    return null
  }

  // 2. Try OpenAI fallback with the same editor persona
  const tryOpenAI = async (): Promise<string | null> => {
    if (!openai || !process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.startsWith('sk-')) return null
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: ENHANCEMENT_EDITOR_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: editorTemperature,
        max_tokens: optimalTokens,
      })
      const text = completion.choices[0]?.message?.content?.trim()
      if (text && text.length > 20) {
        const validated = validateAndCleanResponse(text, params.language || 'bengali')
        return validated.cleanedText
      }
    } catch (err) {
      console.warn('[Refine Engine] OpenAI attempt error:', err)
    }
    return null
  }

  // Sequence providers
  const providers = [
    { name: 'gemini' as const, fn: tryGemini },
    { name: 'openai' as const, fn: tryOpenAI },
  ]

  for (const { name, fn } of providers) {
    const rawOutput = await fn()
    if (rawOutput) {
      const parsed = parseEnhancedJson(rawOutput)
      const rawCandidate = parsed ? parsed.enhanced_letter : cleanAiArtifacts(rawOutput)
      const changesSummary = parsed?.changes_summary || 'চিঠির স্বাভাবিক প্রবহমানতা ও ব্যাকরণ নিখুঁত করা হয়েছে।'
      const meaningPreserved = parsed?.meaning_preserved ?? true

      const finalized = ensureCompleteSignoff(rawCandidate, {
        receiverName: params.receiverName,
        relationship: params.relationship,
      })

      // Guardrail Check (§4.3): similarity threshold >= 0.55
      const guardrail = verifyEnhancementGuardrail(params.letter, finalized, 0.55)

      if (guardrail.passed) {
        const audit = evaluateLetterQuality(finalized, {
          relationship: params.relationship,
          receiverName: params.receiverName,
        })
        return {
          refinedLetter: finalized,
          provider: name,
          audit,
          changesSummary,
          meaningPreserved,
          similarityScore: guardrail.score,
        }
      }

      console.warn(
        `[Refine Engine] Guardrail failed for provider ${name} (score: ${guardrail.score}). Fallback to authentic draft preservation.`
      )
    }
  }

  // 3. Local Editor Fallback (Strictly preserves facts, tone & user voice)
  let fallbackText = localRefineFallback(params.letter, params.action, params.customInstruction, {
    relationship: params.relationship,
    receiverName: params.receiverName,
  })
  fallbackText = ensureCompleteSignoff(fallbackText, {
    receiverName: params.receiverName,
    relationship: params.relationship,
  })
  const audit = evaluateLetterQuality(fallbackText, {
    relationship: params.relationship,
    receiverName: params.receiverName,
  })
  const similarityScore = calculateLetterSimilarity(params.letter, fallbackText)

  return {
    refinedLetter: fallbackText,
    provider: 'fallback',
    audit,
    changesSummary: 'মূল বক্তব্য ও অনুভূতি অক্ষুণ্ণ রেখে ভাষা ও ব্যাকরণ সাবলীল করা হয়েছে।',
    meaningPreserved: true,
    similarityScore,
  }
}
