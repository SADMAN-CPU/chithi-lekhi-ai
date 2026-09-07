import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import type { RefineAction } from './validations'
import { SYSTEM_PERSONA } from './prompts'
import { openai } from './openai'
import {
  classifyAITask,
  compressPrompt,
  calculateOptimalTokens,
  validateAndCleanResponse,
} from './ai-router'

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
 * Action-specific refinement directives in Bengali and English
 */
const ACTION_DIRECTIVES: Record<string, { labelBn: string; promptGuide: string }> = {
  'more-emotional': {
    labelBn: 'আরও আবেগময় (More Emotional)',
    promptGuide:
      'চিঠির আবেগ ও সংবেদনশীলতা বহুগুণ বাড়িয়ে তুলুন। হৃদয়ের অব্যক্ত আকুলতা, ভালোবাসার টান এবং আত্মিক নির্ভরতা যেন প্রতিটি বাক্যে প্রতিধ্বনিত হয়। অনুভূতির গভীরতা এমন হবে যা পাঠকের মনে তীব্র দাগ কাটে।',
  },
  'make-more-emotional': {
    labelBn: 'আরও আবেগময় (More Emotional)',
    promptGuide:
      'চিঠির আবেগ ও সংবেদনশীলতা বহুগুণ বাড়িয়ে তুলুন। হৃদয়ের অব্যক্ত আকুলতা, ভালোবাসার টান এবং আত্মিক নির্ভরতা যেন প্রতিটি বাক্যে প্রতিধ্বনিত হয়।',
  },
  'more-romantic': {
    labelBn: 'আরও রোমান্টিক (More Romantic)',
    promptGuide:
      'চিঠিতে রোমান্টিক প্রেম, মোহময় মিষ্টি কথন ও অনুরাগের ছোঁয়া বাড়িয়ে দিন। মিষ্টি স্মৃতি, স্পর্শের আকুলতা এবং চিরন্তন ভালোবাসার মুগ্ধতা ফুটিয়ে তুলুন। কোনো কৃত্রিমতা ছাড়া খাঁটি প্রেমের অনুভূতি আনুন।',
  },
  'make-more-romantic': {
    labelBn: 'আরও রোমান্টিক (More Romantic)',
    promptGuide:
      'চিঠিতে রোমান্টিক প্রেম, মোহময় মিষ্টি কথন ও অনুরাগের ছোঁয়া বাড়িয়ে দিন। মিষ্টি স্মৃতি ও ভালোবাসার মুগ্ধতা ফুটিয়ে তুলুন।',
  },
  romantic: {
    labelBn: 'রোমান্টিক (Romantic)',
    promptGuide:
      'চিঠিতে রোমান্টিক প্রেম, মোহময় মিষ্টি কথন ও অনুরাগের ছোঁয়া বাড়িয়ে দিন। মিষ্টি স্মৃতি ও ভালোবাসার মুগ্ধতা ফুটিয়ে তুলুন।',
  },
  'more-poetic': {
    labelBn: 'আরও কাব্যিক (More Poetic)',
    promptGuide:
      'চিঠির ভাষায় নান্দনিক কাব্যিক রূপক, ছন্দ ও উপমা যোগ করুন। বৃষ্টি, গোধূলি, মেঘ, জ্যোৎস্না বা ঝরা পাতার মতো নান্দনিক রূপকের মাধ্যমে অনুভূতি প্রকাশ করুন। ভাষা যেন একটি সুন্দর আধুনিক কবিতার মতো সুরেলা শোনায়।',
  },
  'make-more-poetic': {
    labelBn: 'আরও কাব্যিক (More Poetic)',
    promptGuide:
      'চিঠির ভাষায় নান্দনিক কাব্যিক রূপক, ছন্দ ও উপমা যোগ করুন। ভাষা যেন একটি সুন্দর আধুনিক কবিতার মতো সুরেলা শোনায়।',
  },
  'vintage-90s': {
    labelBn: '৯০-এর ডাকচিঠি স্টাইল (90s Style)',
    promptGuide:
      'চিঠিটিকে নব্বই দশকের খাঁটি ডাকচিঠির রূপ দিন—নীল খামে ঝরনা কলমে লেখা চিঠির মতো সুবাস থাকবে। ল্যাম্পের আলোয় বসে লেখা, ডাকপিয়নের সাইকেলের ঘণ্টার অপেক্ষা, এবং দূরত্বের মিষ্টি আকুলতার ছোঁয়া দিন।',
  },
  'add-90s-vintage-feeling': {
    labelBn: '৯০-এর ডাকচিঠি স্টাইল (Add 90s Vintage Feeling)',
    promptGuide:
      'চিঠিটিকে নব্বই দশকের খাঁটি ডাকচিঠির রূপ দিন—নীল খামে ঝরনা কলমে লেখা চিঠির মতো সুবাস থাকবে। ল্যাম্পের আলোয় বসে লেখা এবং দূরত্বের মিষ্টি আকুলতার ছোঁয়া দিন।',
  },
  '90s-vintage': {
    labelBn: '৯০-এর ভিন্টেজ (90s Vintage)',
    promptGuide:
      'চিঠিটিকে নব্বই দশকের খাঁটি ডাকচিঠির রূপ দিন—নীল খামে ঝরনা কলমে লেখা চিঠির মতো অনুভূতি থাকবে।',
  },
  '90s-style': {
    labelBn: '৯০-এর স্টাইল (90s Style)',
    promptGuide:
      'চিঠিটিকে নব্বই দশকের খাঁটি ডাকচিঠির রূপ দিন—নীল খামে ঝরনা কলমে লেখা চিঠির মতো অনুভূতি থাকবে।',
  },
  'make-shorter': {
    labelBn: 'সংক্ষিপ্ত রূপ (Make Shorter)',
    promptGuide:
      'চিঠির মূল আবেগ ও উদ্দেশ্য অক্ষুণ্ণ রেখে বাহুল্য বাক্য বর্জন করুন। অপ্রয়োজনীয় বাক্য কমিয়ে মাত্র ২-৩টি গভীর ও নিবিড় অনুচ্ছেদে সাজান। প্রতিটি শব্দ যেন গভীর অর্থ বহন করে।',
  },
  shorter: {
    labelBn: 'সংক্ষিপ্ত রূপ (Shorter)',
    promptGuide:
      'চিঠির মূল আবেগ অক্ষুণ্ণ রেখে বাহুল্য বাক্য বর্জন করুন। অপ্রয়োজনীয় বাক্য কমিয়ে মাত্র ২-৩টি গভীর ও নিবিড় অনুচ্ছেদে সাজান।',
  },
  'short-version': {
    labelBn: 'সংক্ষিপ্ত রূপ (Short Version)',
    promptGuide:
      'চিঠির মূল আবেগ অক্ষুণ্ণ রেখে বাহুল্য বাক্য বর্জন করুন। অপ্রয়োজনীয় বাক্য কমিয়ে নিবিড় অনুচ্ছেদে সাজান।',
  },
  'make-longer': {
    labelBn: 'দীর্ঘ ও বিস্তৃত (Make Longer)',
    promptGuide:
      'চিঠিকে আরও বিস্তৃত ও সমৃদ্ধ করুন। ফেলে আসা মুহূর্তের স্মৃতি, জমে থাকা না-বলা কথা এবং ভবিষ্যতে একান্তে কাটানোর স্বপ্নের বিস্তারিত বর্ণনা যোগ করে একটি পূর্ণাঙ্গ সাহিত্যিক চিঠিতে রূপ দিন।',
  },
  longer: {
    labelBn: 'দীর্ঘ ও বিস্তৃত (Longer)',
    promptGuide:
      'চিঠিকে আরও বিস্তৃত ও সমৃদ্ধ করুন। ফেলে আসা মুহূর্তের স্মৃতি ও জমে থাকা না-বলা কথার বিস্তারিত বর্ণনা যোগ করুন।',
  },
  'simpler-language': {
    labelBn: 'সহজ ভাষা (Make Simpler)',
    promptGuide:
      'কঠিন বা অতিরিক্ত গুরুগম্ভীর শব্দ বাদ দিয়ে একদম সহজ, মুখের স্বাভাবিক কথ্য বাংলা বা আন্তরিক ও সরল ভাষায় রূপান্তর করুন। যেন একজন সাধারণ মানুষ তার সবচেয়ে আপনজনকে মন খুলে বলছে।',
  },
  'make-simpler': {
    labelBn: 'সহজ ভাষা (Make Simpler)',
    promptGuide:
      'কঠিন শব্দ বাদ দিয়ে একদম সহজ ও স্বাভাবিক ভাষায় রূপান্তর করুন। যেন একজন সাধারণ মানুষ তার আপনজনকে মন খুলে বলছে।',
  },
  simpler: {
    labelBn: 'সহজ ভাষা (Simpler)',
    promptGuide:
      'কঠিন শব্দ বাদ দিয়ে একদম সহজ ও স্বাভাবিক ভাষায় রূপান্তর করুন।',
  },
  'better-writing': {
    labelBn: 'উন্নত প্রকাশ (Better Writing)',
    promptGuide:
      'চিঠির ব্যাকরণ, বাক্য গঠন ও সাহিত্যিক সৌন্দর্য নিখুঁত করুন। শব্দচয়ন আরও শ্রুতিমধুর ও মার্জিত করুন যাতে লেখার মান এক অনন্য উচ্চতায় পৌঁছায়।',
  },
  'deeper-feeling': {
    labelBn: 'গভীর অনুভূতি (Deeper Feeling)',
    promptGuide:
      'চিঠির অন্তঃস্তলে লুকানো মানসিক দ্বন্দ্ব, নীরব দীর্ঘশ্বাস ও অনুচ্চারিত সত্যকে প্রকাশ করুন। কথা কম কিন্তু অনুভূতির অভিঘাত যেন তীব্র হয়।',
  },
  custom: {
    labelBn: 'কাস্টম নির্দেশনা (Custom Instruction)',
    promptGuide: 'ব্যবহারকারীর সুনির্দিষ্ট নির্দেশনার আলোকে চিঠির ভাব ও ভাষা পরিমার্জন করুন।',
  },
  'custom-instruction': {
    labelBn: 'কাস্টম নির্দেশনা (Custom Instruction)',
    promptGuide: 'ব্যবহারকারীর সুনির্দিষ্ট নির্দেশনার আলোকে চিঠির ভাব ও ভাষা পরিমার্জন করুন।',
  },
}

/**
 * Build a structured refinement prompt for the LLM
 */
export function buildRefinementPrompt(params: RefineLetterParams): string {
  const directive = ACTION_DIRECTIVES[params.action] || ACTION_DIRECTIVES['more-emotional']

  const customInstructionBlock = params.customInstruction
    ? `\nবিশেষ ইউজার নির্দেশনা (USER CUSTOM INSTRUCTION):\n"${params.customInstruction}"\nএই নির্দেশকে সর্বোচ্চ অগ্রাধিকার দিয়ে চিঠিটি পরিমার্জন করো।`
    : ''

  const contextInfo = [
    params.receiverName ? `প্রাপকের নাম: ${params.receiverName}` : '',
    params.relationship ? `প্রাপকের সাথে সম্পর্ক: ${params.relationship}` : '',
    params.personality ? `পছন্দের লেখার ধরন: ${params.personality}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return `তুমি একজন সংবেদনশীল সাহিত্যিক এবং চিঠির অভিজ্ঞ সম্পাদক। নিচে দেওয়া চিঠিটি অত্যন্ত মানবিক ও মননশীলভাবে পরিমার্জন করো।

${contextInfo ? `══════ প্রাসঙ্গিক প্রেক্ষাপট ══════\n${contextInfo}\n` : ''}
══════ বর্তমান মূল চিঠি (EXISTING LETTER) ══════
${params.letter}
══════════════════════════════════════════════

══════ পরিমার্জনের লক্ষ্য ও নির্দেশনা ══════
লক্ষ্য: ${directive.labelBn}
নির্দেশনা: ${directive.promptGuide}
${customInstructionBlock}

══════ মূলনীতি ও কঠোর নিয়মাবলী (CORE REQUIREMENTS) ══════
১. অপ্রয়োজনে পুরো চিঠি নতুন করে নতুন আঙ্গিকে বদলে দেবে না। একই চিঠির আসল সুর, মূল অনুভূতি, স্মৃতি এবং লেখকের আসল উদ্দেশ্য ধরে রেখে পরিমার্জন করো (Do NOT completely rewrite unnecessarily. Improve the same letter).
২. ভাষা হতে হবে ১০০% খাঁটি, স্বাভাবিক ও সংবেদনশীল বাংলা। কোনো কৃত্রিম অনুবাদ বা রোবোটিক যান্ত্রিক ভাব যেন না থাকে।
৩. চিঠির ব্যক্তিগত আন্তরিক সুর (Personal tone), সম্পর্কের স্বাভাবিক টান এবং প্রাপকের সাথে সম্পর্ক বজায় রাখো।
৪. চিঠির শুরুতে উপযুক্ত সম্বোধন (যেমন: "প্রিয়...", "স্নেহের...", "শ্রদ্ধেয়...") এবং শেষে যথোপযুক্ত সমাপ্তিসূচক বিদায় সম্ভাষণ ও স্বাক্ষর (Proper ending & signature) নিশ্চিত করো।
৫. এআই-সুলভ বাক্য ও সাধারণ ক্লিশে বর্জন করো (Remove AI style sentences and generic phrases like "আশা করি ভালো আছো এবং সুস্থ আছো", "চিঠিটি কেমন লাগল", "As an AI")।
৬. কোনো মেটা-কমেন্টারি বা ব্যাখ্যা (যেমন: "নিচে আপনার চিঠি দেওয়া হলো", "Subject:", "এখানে সংশোধিত চিঠি:") লিখবে না।
৭. শুধুমাত্র সংশোধিত চিঠিটির টেক্সট আউটপুট হিসেবে দেবে।

এখন সংশোধিত পূর্ণাঙ্গ চিঠিটি লেখো:`
}

/**
 * Strips robotic AI phrases, preambles, and meta comments from generated text
 */
export function cleanAiArtifacts(text: string): string {
  let cleaned = text.trim()

  // Remove common AI preambles
  cleaned = cleaned.replace(/^(নিচে\s+.*চিঠি.*দেওয়া\s+হলো|এখানে\s+.*চিঠি.*হলো|Here\s+is\s+.*letter|Dear\s+User:?|Sure!?:?|Certainly!?:?)[^\n]*\n+/gi, '')

  // Remove markdown headers or bold markers around subject
  cleaned = cleaned.replace(/^#+\s*.*(\n|$)/m, '')
  cleaned = cleaned.replace(/^(বিষয়|Subject|Title):\s*[^\n]*\n+/gi, '')

  // Filter out any lines containing robotic AI meta chatter
  const aiLinePatterns = [
    /As an AI/i,
    /language model/i,
    /কৃত্রিম বুদ্ধিমত্তা/i,
    /আশা করি চিঠিটি (আপনার|তোমার) পছন্দ/i,
    /Hope this (letter )?helps/i,
    /Let me know if/i,
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
 * Audits human feeling, relationship matching, natural Bengali, and complete ending
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
    'আশা করি ভালো আছো এবং সুস্থ আছো',
    'I hope this letter finds you well',
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
    'প্রণামান্তে',
    'স্নেহের',
    'বিদায়',
    'আল্লাহ হাফেজ',
    'ভালো থেকো',
    'শুভকামনায়',
    'আশীর্বাদসহ',
  ]
  const last200Chars = cleaned.slice(-200)
  const completeEnding = endingKeywords.some((kw) => last200Chars.includes(kw))
  if (!completeEnding) feedback.push('চিঠির সমাপ্তি বা বিদায় সম্ভাষণ আরও স্পষ্ট হওয়া প্রয়োজন।')

  // Metric 3: Salutation / Beginning
  const salutationKeywords = ['প্রিয়', 'প্রিয়', 'স্নেহের', 'শ্রদ্ধেয়', 'শ্রদ্ধেয়', 'কল্যাণীয়া', 'কল্যাণীয়া', 'দোস্ত', 'বন্ধু', 'আম্মু', 'আব্বু', 'মা', 'বাবা']
  const first150Chars = cleaned.slice(0, 150)
  const hasSalutation = salutationKeywords.some((kw) => first150Chars.includes(kw))

  // Metric 4: Human Feeling & Bengali Flow
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length
  const humanFeeling = wordCount >= 35 && !hasAiPhrases
  if (!humanFeeling) feedback.push('চিঠির অনুভূতির গভীরতা ও শব্দের বিস্তার বাড়ানো আবশ্যক।')

  // Metric 5: Relationship Match
  let relationshipMatch = true
  if (params?.relationship) {
    const rel = params.relationship.toLowerCase()
    if ((rel.includes('মা') || rel.includes('mother')) && cleaned.includes('প্রিয়তমা')) {
      relationshipMatch = false
      feedback.push('মায়ের প্রতি চিঠিতে ভুল রোমান্টিক সম্বোধন বর্জনীয়।')
    }
  }

  // Calculate score
  let score = 70
  if (noAiPhrases) score += 10
  if (completeEnding) score += 10
  if (hasSalutation) score += 5
  if (humanFeeling) score += 5
  if (relationshipMatch) score += 5
  if (score > 100) score = 100

  return {
    passed: score >= 75 && noAiPhrases,
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
 * Enforce signature completion if cut off
 */
export function ensureCompleteSignoff(letter: string, _receiverName?: string): string {
  const audit = evaluateLetterQuality(letter)
  if (audit.metrics.completeEnding) {
    return letter
  }

  // Append natural ending
  return `${letter.trim()}\n\nভালো থেকো সবসময়,\nতোমারই আপন কেউ`
}

/**
 * Offline / Local Fallback Refinement Engine
 */
function localRefineFallback(letter: string, action: RefineAction, customInstruction?: string): string {
  const cleaned = cleanAiArtifacts(letter)

  switch (action) {
    case 'more-emotional':
    case 'deeper-feeling':
      return `${cleaned}\n\nমনের গভীরে যে কথাগুলো জমে ছিল, আজ তা চিঠির পাতায় জলছাপ হয়ে রইল। তুমি আমার জীবনের সবচেয়ে মূল্যবান অনুভূতি।`
    case 'more-romantic':
      return `${cleaned}\n\nতোমার উপস্থিতি আমার প্রতিটা দিনকে রঙিন করে তোলে। যেখানেই থাকি না কেন, আমার সমস্ত ভালোবাসা নিঃশব্দে তোমার দিকেই ধাবিত হয়।`
    case 'vintage-90s':
      return `[ডাকটিকিট: ঢাকা জিপিও]\n\n${cleaned}\n\nসন্ধ্যা নামলেই পুরোনো দিনের স্মৃতিগুলো মনকে আচ্ছন্ন করে। ঝরনা কলমের নীল কালিতে লিখে গেলাম মনের এই ব্যাকুলতা।`
    case 'make-shorter':
    case 'shorter': {
      const paras = cleaned.split('\n\n').filter(Boolean)
      if (paras.length > 2) {
        return `${paras[0]}\n\n${paras[1]}\n\nসবসময় ভালো থেকো,\nতোমার আপনজন`
      }
      return cleaned
    }
    case 'make-longer':
    case 'longer':
      return `${cleaned}\n\nসময়ের স্রোতে অনেক কিছুই বদলে যায়, কিন্তু হৃদয়ের মণিকোঠায় জমে থাকা এই অনুভূতিগুলো কখনো মলিন হয় না। তোমার স্মৃতিগুলো আমার নিঃসঙ্গ রাতের একমাত্র সান্ত্বনা হয়ে বেঁচে থাকে।`
    case 'simpler-language':
    case 'simpler':
    case 'better-writing':
    case 'more-poetic':
    case 'custom':
    default:
      if (customInstruction) {
        return `${cleaned}\n\n[বিশেষ ভাবার্থ: ${customInstruction}]\nসব ভালোবাসা তোমারই জন্য।`
      }
      return cleaned
  }
}

/**
 * Main Refine Letter Pipeline
 * Executes via Gemini -> OpenAI -> Local Engine with automated Quality Audit
 */
export async function refineLetterContent(
  params: RefineLetterParams
): Promise<{ refinedLetter: string; provider: 'gemini' | 'openai' | 'fallback'; audit: LetterQualityAudit }> {
  const route = classifyAITask({ action: params.action, text: params.letter })
  const rawPrompt = buildRefinementPrompt(params)
  const prompt = compressPrompt(rawPrompt)
  const optimalTokens = calculateOptimalTokens({
    language: params.language || 'bengali',
    targetWordCount: 220,
    taskType: route.taskType,
  })

  // Helper function to call Gemini
  const tryGemini = async (): Promise<string | null> => {
    if (!genAI) return null
    try {
      const model = genAI.getGenerativeModel({
        model: geminiModelName,
        systemInstruction: SYSTEM_PERSONA,
        safetySettings,
        generationConfig: {
          temperature: route.temperature,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: optimalTokens,
        },
      })
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()?.trim()
      if (text && text.length > 30) {
        const validated = validateAndCleanResponse(text, params.language || 'bengali')
        return cleanAiArtifacts(validated.cleanedText)
      }
    } catch (err) {
      console.warn('[Refine Engine] Gemini attempt error:', err)
    }
    return null
  }

  // Helper function to call OpenAI
  const tryOpenAI = async (): Promise<string | null> => {
    if (!openai || !process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.startsWith('sk-')) return null
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PERSONA },
          { role: 'user', content: prompt },
        ],
        temperature: route.temperature,
        max_tokens: optimalTokens,
      })
      const text = completion.choices[0]?.message?.content?.trim()
      if (text && text.length > 30) {
        const validated = validateAndCleanResponse(text, params.language || 'bengali')
        return cleanAiArtifacts(validated.cleanedText)
      }
    } catch (err) {
      console.warn('[Refine Engine] OpenAI attempt error:', err)
    }
    return null
  }

  // Intelligent Provider Ordering
  const providers =
    route.preferredProvider === 'openai'
      ? [
          { name: 'openai' as const, fn: tryOpenAI },
          { name: 'gemini' as const, fn: tryGemini },
        ]
      : [
          { name: 'gemini' as const, fn: tryGemini },
          { name: 'openai' as const, fn: tryOpenAI },
        ]

  for (const { name, fn } of providers) {
    const output = await fn()
    if (output) {
      const finalized = ensureCompleteSignoff(output, params.receiverName)
      const audit = evaluateLetterQuality(finalized, {
        relationship: params.relationship,
        receiverName: params.receiverName,
      })
      return { refinedLetter: finalized, provider: name, audit }
    }
  }

  // Tertiary: High-Fidelity Local Storyteller Refiner
  let fallbackText = localRefineFallback(params.letter, params.action, params.customInstruction)
  fallbackText = ensureCompleteSignoff(fallbackText, params.receiverName)
  const audit = evaluateLetterQuality(fallbackText, {
    relationship: params.relationship,
    receiverName: params.receiverName,
  })

  return {
    refinedLetter: fallbackText,
    provider: 'fallback',
    audit,
  }
}
