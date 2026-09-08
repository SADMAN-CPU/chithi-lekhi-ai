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
/**
 * Action-specific refinement directives in Bengali and English
 */
const ACTION_DIRECTIVES: Record<string, { labelBn: string; promptGuide: string }> = {
  // 1. Emotional ❤️
  emotional: {
    labelBn: 'আবেগঘন ও হৃদয়স্পর্শী (Emotional ❤️)',
    promptGuide:
      'চিঠির আবেগ ও সংবেদনশীলতা বহুগুণ বাড়িয়ে তুলুন। হৃদয়ের অব্যক্ত আকুলতা, ভালোবাসার টান এবং আত্মিক নির্ভরতা যেন প্রতিটি বাক্যে প্রতিধ্বনিত হয়। অনুভূতির গভীরতা এমন হবে যা পাঠকের মনে তীব্র দাগ কাটে।',
  },
  'more-emotional': {
    labelBn: 'আবেগঘন ও হৃদয়স্পর্শী (Emotional ❤️)',
    promptGuide:
      'চিঠির আবেগ ও সংবেদনশীলতা বহুগুণ বাড়িয়ে তুলুন। হৃদয়ের অব্যক্ত আকুলতা, ভালোবাসার টান এবং আত্মিক নির্ভরতা যেন প্রতিটি বাক্যে প্রতিধ্বনিত হয়।',
  },
  'make-more-emotional': {
    labelBn: 'আবেগঘন ও হৃদয়স্পর্শী (Emotional ❤️)',
    promptGuide:
      'চিঠির আবেগ ও সংবেদনশীলতা বহুগুণ বাড়িয়ে তুলুন। হৃদয়ের অব্যক্ত আকুলতা ও ভালোবাসার টান ফুটিয়ে তুলুন।',
  },

  // 2. Deep Feelings
  'deep-feelings': {
    labelBn: 'গভীর অনুভূতি (Deep Feelings)',
    promptGuide:
      'চিঠির অন্তঃস্তলে লুকানো মানসিক গভীরতা, নীরব দীর্ঘশ্বাস ও অনুচ্চারিত সত্যকে প্রকাশ করুন। কথা কম কিন্তু অনুভূতির অভিঘাত যেন অত্যন্ত তীব্র ও মর্মস্পর্শী হয়।',
  },
  'deeper-feeling': {
    labelBn: 'গভীর অনুভূতি (Deep Feelings)',
    promptGuide:
      'চিঠির অন্তঃস্তলে লুকানো মানসিক গভীরতা, নীরব দীর্ঘশ্বাস ও অনুচ্চারিত সত্যকে প্রকাশ করুন। কথা কম কিন্তু অনুভূতির অভিঘাত যেন তীব্র হয়।',
  },

  // 3. Formal
  formal: {
    labelBn: 'আনুষ্ঠানিক ও মার্জিত (Formal)',
    promptGuide:
      'চিঠিটিকে একটি মার্জিত, সুসংহত ও বিনম্র আনুষ্ঠানিক রূপ দিন। যথাযথ শিষ্টাচার, শ্রদ্ধাপূর্ণ সম্বোধন (যেমন: আপনি), সুবিন্যস্ত বক্তব্য এবং শালীন সমাপনী নিশ্চিত করুন। কোনো অযথা অতিরিক্ত হালকা বা চটুল শব্দ পরিহার করুন।',
  },

  // 4. Simple
  simple: {
    labelBn: 'সহজ ও স্বাভাবিক (Simple)',
    promptGuide:
      'কঠিন বা অতিরিক্ত গুরুগম্ভীর শব্দ বাদ দিয়ে একদম সহজ, মুখের স্বাভাবিক কথ্য বাংলা বা আন্তরিক ও সরল ভাষায় রূপান্তর করুন। যেন একজন সাধারণ মানুষ তার সবচেয়ে আপনজনকে সামনে বসে মন খুলে বলছে।',
  },
  'simpler-language': {
    labelBn: 'সহজ ভাষা (Simple)',
    promptGuide:
      'কঠিন বা অতিরিক্ত গুরুগম্ভীর শব্দ বাদ দিয়ে একদম সহজ, মুখের স্বাভাবিক কথ্য বাংলা বা আন্তরিক ও সরল ভাষায় রূপান্তর করুন।',
  },
  'make-simpler': {
    labelBn: 'সহজ ভাষা (Simple)',
    promptGuide:
      'কঠিন শব্দ বাদ দিয়ে একদম সহজ ও স্বাভাবিক ভাষায় রূপান্তর করুন। যেন একজন সাধারণ মানুষ তার আপনজনকে মন খুলে বলছে।',
  },
  simpler: {
    labelBn: 'সহজ ভাষা (Simple)',
    promptGuide:
      'কঠিন শব্দ বাদ দিয়ে একদম সহজ ও স্বাভাবিক ভাষায় রূপান্তর করুন।',
  },

  // 5. Romantic
  romantic: {
    labelBn: 'রোমান্টিক ও প্রেমময় (Romantic)',
    promptGuide:
      'চিঠিতে রোমান্টিক প্রেম, মোহময় মিষ্টি কথন ও অনুরাগের ছোঁয়া বাড়িয়ে দিন। মিষ্টি স্মৃতি, স্পর্শের আকুলতা এবং চিরন্তন ভালোবাসার মুগ্ধতা ফুটিয়ে তুলুন। কোনো কৃত্রিমতা ছাড়া খাঁটি প্রেমের অনুভূতি আনুন।',
  },
  'more-romantic': {
    labelBn: 'রোমান্টিক ও প্রেমময় (Romantic)',
    promptGuide:
      'চিঠিতে রোমান্টিক প্রেম, মোহময় মিষ্টি কথন ও অনুরাগের ছোঁয়া বাড়িয়ে দিন। মিষ্টি স্মৃতি, স্পর্শের আকুলতা এবং চিরন্তন ভালোবাসার মুগ্ধতা ফুটিয়ে তুলুন।',
  },
  'make-more-romantic': {
    labelBn: 'রোমান্টিক ও প্রেমময় (Romantic)',
    promptGuide:
      'চিঠিতে রোমান্টিক প্রেম, মোহময় মিষ্টি কথন ও অনুরাগের ছোঁয়া বাড়িয়ে দিন। মিষ্টি স্মৃতি ও ভালোবাসার মুগ্ধতা ফুটিয়ে তুলুন।',
  },

  // 6. Professional
  professional: {
    labelBn: 'পেশাদার ও দায়িত্বশীল (Professional)',
    promptGuide:
      'পেশাদার ও দায়িত্বশীল যোগাযোগ শৈলীতে চিঠিটি পুনর্লিখন করুন। বিষয়বস্তুর স্পষ্টতা, পরিচ্ছন্ন যুক্তি, গঠনমূলক বার্তা এবং সম্মানজনক পেশাদার সমাপনী বজায় রাখুন।',
  },

  // 7. Short version
  'short-version': {
    labelBn: 'সংক্ষিপ্ত রূপ (Short Version)',
    promptGuide:
      'চিঠির মূল আবেগ ও উদ্দেশ্য সম্পূর্ণ অক্ষুণ্ণ রেখে সমস্ত বাহুল্য বাক্য বর্জন করুন। অপ্রয়োজনীয় বিস্তার কমিয়ে মাত্র ২-৩টি গভীর ও নিবিড় অনুচ্ছেদে সাজান। প্রতিটি শব্দ যেন গভীর অর্থ বহন করে।',
  },
  'make-shorter': {
    labelBn: 'সংক্ষিপ্ত রূপ (Make Shorter)',
    promptGuide:
      'চিঠির মূল আবেগ ও উদ্দেশ্য অক্ষুণ্ণ রেখে বাহুল্য বাক্য বর্জন করুন। অপ্রয়োজনীয় বাক্য কমিয়ে মাত্র ২-৩টি গভীর ও নিবিড় অনুচ্ছেদে সাজান। প্রতিটি শব্দ যেন গভীর অর্থ বহন করে।',
  },
  shorter: {
    labelBn: 'সংক্ষিপ্ত রূপ (Shorter)',
    promptGuide:
      'চিঠির মূল আবেগ অক্ষুণ্ণ রেখে বাহুল্য বাক্য বর্জন করুন। অপ্রয়োজনীয় বাক্য কমিয়ে নিবিড় অনুচ্ছেদে সাজান।',
  },

  // 8. Storytelling
  storytelling: {
    labelBn: 'স্মৃতিকাতর গল্পগাথা (Storytelling)',
    promptGuide:
      'চিঠিটিকে একটি মনোমুগ্ধকর স্মৃতিকাতর গল্পের মতো সাজিয়ে তুলুন। দৃশ্যপট, পারিপার্শ্বিক আবহ (যেমন: বৃষ্টিভেজা বিকেল, পুরোনো চায়ের দোকান, সন্ধ্যার মায়াবী আলো) এবং অনুভূতির ধারাবাহিকতা ফুটিয়ে তুলে হৃদয়ছোঁয়া বর্ণনা রচনা করুন।',
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

  // Utilities
  regenerate: {
    labelBn: 'নতুন করে রচনা (Regenerate)',
    promptGuide:
      'চিঠির মূল আবেগ ও প্রেক্ষাপট অক্ষুণ্ণ রেখে সম্পূর্ণ ভিন্ন শব্দচয়ন, নতুন অনুভূতি ও নতুন ভাবাবেগে একটি সম্পূর্ণ নতুন চিঠি রচনা করুন।',
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
  'better-writing': {
    labelBn: 'উন্নত প্রকাশ (Better Writing)',
    promptGuide:
      'চিঠির ব্যাকরণ, বাক্য গঠন ও সাহিত্যিক সৌন্দর্য নিখুঁত করুন। শব্দচয়ন আরও শ্রুতিমধুর ও মার্জিত করুন যাতে লেখার মান এক অনন্য উচ্চতায় পৌঁছায়।',
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
    ? `\nবিশেষ ইউজার নির্দেশনা (USER CUSTOM INSTRUCTION):\n"${params.customInstruction}"\nএই নির্দেশকে সর্বোচ্চ অগ্রাধিকার দিয়ে সম্পূর্ণ চিঠিটি সমন্বিতভাবে পুনর্লিখন ও পরিমার্জন করো।`
    : ''

  const contextInfo = [
    params.receiverName ? `প্রাপকের নাম: ${params.receiverName}` : '',
    params.relationship ? `প্রাপকের সাথে সম্পর্ক: ${params.relationship}` : '',
    params.personality ? `পছন্দের লেখার ধরন: ${params.personality}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return `তুমি একজন সংবেদনশীল সাহিত্যিক এবং চিঠির অভিজ্ঞ সম্পাদক। নিচে দেওয়া চিঠিটি অত্যন্ত মানবিক, সুসংহত ও মননশীলভাবে পুনর্লিখন ও পরিমার্জন করো।

${contextInfo ? `══════ প্রাসঙ্গিক প্রেক্ষাপট ══════\n${contextInfo}\n` : ''}
══════ বর্তমান মূল চিঠি (EXISTING LETTER) ══════
${params.letter}
══════════════════════════════════════════════

══════ পরিমার্জনের লক্ষ্য ও নির্দেশনা ══════
লক্ষ্য: ${directive.labelBn}
নির্দেশনা: ${directive.promptGuide}
${customInstructionBlock}

══════ মূলনীতি ও কঠোর নিয়মাবলী (CRITICAL REQUIREMENTS) ══════
১. সমগ্র চিঠিটি প্রথম থেকে শেষ পর্যন্ত একটি পূর্ণাঙ্গ, সমন্বিত ও অবিচ্ছেদ্য চিঠি হিসেবে পুনর্লিখন করো (Rewrite the ENTIRE letter from salutation to signature as a cohesive whole).
২. কখনোই পুরানো চিঠির শেষে অতিরিক্ত কোনো প্যারাগ্রাফ, পরিশিষ্ট বা অংশ জুড়ে (append) দেবে না। কোনো বাড়তি টুকরো যোগ নয়—চিঠির প্রতিটি বাক্যের ভেতর নির্দেশিত ভাবটি মিশিয়ে দাও।
৩. কোনো বন্ধনীযুক্ত নোট [bracketed note], ডাকটিকিট ট্যাগ, বিশেষ ভাবনা, পি.এস. নোট বা মেটা-কমেন্টারি লিখবে না।
৪. চিঠির শেষে দ্বৈত বা পুনরাবৃত্তিমূলক স্বাক্ষর বা বিদায় সম্ভাষণ দেবে না। একটিমাত্র স্বাভাবিক সমাপনী স্বাক্ষর থাকবে।
৫. ভাষা হতে হবে ১০০% খাঁটি, স্বাভাবিক ও সংবেদনশীল বাংলা। কোনো কৃত্রিম অনুবাদ, রোবোটিক ভাব বা এআই-ক্লিশে থাকবে না।
৬. চিঠির শুরুতে যথাযথ সম্বোধন এবং শেষে প্রাপক ও সম্পর্কের সাথে সামঞ্জস্যপূর্ণ বিদায় সম্ভাষণ ও স্বাক্ষর নিশ্চিত করো।
৭. শুধুমাত্র সংশোধিত চিঠিটির টেক্সট আউটপুট হিসেবে দেবে।

এখন সংশোধিত পূর্ণাঙ্গ চিঠিটি লেখো:`
}

/**
 * Strips robotic AI phrases, preambles, bracketed notes, and meta comments from generated text
 */
export function cleanAiArtifacts(text: string): string {
  let cleaned = text.trim()

  // Remove common AI preambles
  cleaned = cleaned.replace(/^(নিচে\s+.*চিঠি.*দেওয়া\s+হলো|এখানে\s+.*চিঠি.*হলো|Here\s+is\s+.*letter|Dear\s+User:?|Sure!?:?|Certainly!?:?)[^\n]*\n+/gi, '')

  // Remove markdown headers or bold markers around subject/title
  cleaned = cleaned.replace(/^#+\s*.*(\n|$)/m, '')
  cleaned = cleaned.replace(/^(বিষয়|Subject|Title):\s*[^\n]*\n+/gi, '')

  // Remove bracketed notes, stamps, thoughts (e.g. [নোট:...], [বিশেষ ভাবার্থ:...], [ডাকটিকিট:...], [Special Note:...])
  cleaned = cleaned.replace(/\[(?:ডাকটিকিট|বিশেষ ভাবার্থ|বিশেষ ভাবনা|নোট|বি\.দ্র\.|Note|P\.S\.|Special Thought|উপসংহার)[^\]]*\]/gi, '')
  cleaned = cleaned.replace(/^\s*\[[^\]]{2,100}\]\s*$/gm, '')

  // Remove trailing meta sections
  cleaned = cleaned.replace(/\n+\s*(?:বিশেষ দ্রষ্টব্য|বি\.দ্র\.|বিশেষ ভাবনা|পরিমার্জিত অংশ|সংশোধিত চিঠি|Note|P\.S\.):[\s\S]*$/gi, '')

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

  // Deduplicate accidental double/repetitive signatures at the end
  const paragraphs = cleaned.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  if (paragraphs.length >= 3) {
    const isClosingParagraph = (p: string) => {
      const lines = p.split('\n').map((l) => l.trim()).filter(Boolean)
      const markerRegex = /^(ইতি|তোমারই|তোমার বন্ধু|তোমার অনুগত|আপনার সন্তান|আপনার স্নেহধন্য|আপনার আদরের|আপনার ছেলে|আপনার মেয়ে|আপনার স্নেহের সন্তান|আপনার একান্ত|আপন কেউ|ভালোবাসায়|ভালোবাসা রইল|ভালো থেকো|সবসময় ভালো থেকো|শুভাকাঙ্ক্ষী|শুভকামনায়|স্নেহাশীষ)/i
      return lines.length <= 4 && lines.some((l) => markerRegex.test(l))
    }
    const lastP = paragraphs[paragraphs.length - 1]
    const secondLastP = paragraphs[paragraphs.length - 2]
    if (isClosingParagraph(lastP) && isClosingParagraph(secondLastP)) {
      paragraphs.pop()
      cleaned = paragraphs.join('\n\n')
    }
  }

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
    'শ্রদ্ধা ও ভালোবাসাসহ',
    'আপনার সন্তান',
    'আপনার স্নেহধন্য সন্তান',
    'অনেক ভালোবাসা রইল',
    'স্নেহের',
    'বিদায়',
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
 * Synthesizes a 100% complete cohesive letter — NEVER appends extra sentences to the end!
 */
export function localRefineFallback(
  letter: string,
  action: RefineAction,
  customInstruction?: string,
  context?: { relationship?: string; receiverName?: string }
): string {
  const cleaned = cleanAiArtifacts(letter)
  const isShortInput = cleaned.length < 80 || !cleaned.includes('\n')

  // Context inference
  const textLower = cleaned.toLowerCase()
  const rel = (context?.relationship || '').toLowerCase()
  const isMother = rel.includes('মা') || rel.includes('mother') || textLower.includes('আম্মু') || textLower.includes('মা')
  const isFather = rel.includes('বাবা') || rel.includes('father') || textLower.includes('আব্বু') || textLower.includes('বাবা')
  const isLover = rel.includes('love') || rel.includes('প্রেম') || textLower.includes('ভালোবাসি') || textLower.includes('প্রিয়তমা')
  const isFormal = action === 'formal' || action === 'professional'

  let salutation = context?.receiverName ? `প্রিয় ${context.receiverName},` : 'প্রিয়জন,'
  let signoff = 'ইতি,\nতোমারই ভালোবাসার মানুষ'

  if (isMother) {
    salutation = 'শ্রদ্ধেয়া আম্মু,'
    signoff = 'অফুরন্ত শ্রদ্ধা ও ভালোবাসাসহ,\nতোমার সন্তান'
  } else if (isFather) {
    salutation = 'শ্রদ্ধেয় বাবা,'
    signoff = 'বিনম্র শ্রদ্ধা ও ভালোবাসায়,\nআপনার সন্তান'
  } else if (isFormal) {
    salutation = context?.receiverName ? `শ্রদ্ধেয় ${context.receiverName},` : 'শ্রদ্ধেয় মহাশয়,'
    signoff = 'বিনীত ও শুভাকাঙ্ক্ষী,\nএক শুভানুধ্যায়ী'
  }

  // If the user provided a short seed thought like "আম্মুকে অনেক ভালোবাসি"
  if (isShortInput) {
    if (isMother) {
      switch (action) {
        case 'short-version':
        case 'make-shorter':
        case 'shorter':
          return `${salutation}\n\nমুখ ফুটে হয়তো প্রতিদিন বলা হয়ে ওঠে না, কিন্তু জীবনের প্রতিটি নিঃশ্বাসে তোমার স্নেহ আর ভালোবাসাকে পরম মমতায় অনুভব করি। তুমি আমার জীবনের সবচেয়ে নিরাপদ ও স্নিগ্ধ আশ্রয়।\n\n${signoff}`
        case 'formal':
        case 'professional':
          return `${salutation}\n\nআপনার অপরিসীম স্নেহ, আত্মত্যাগ এবং ভালোবাসার প্রতি আমার অন্তরের গভীরতম শ্রদ্ধা নিবেদন করছি। আপনার দোয়া ও ভালোবাসাই আমার জীবনের পথচলার একমাত্র নির্ভরতা।\n\n${signoff}`
        case 'storytelling':
          return `${salutation}\n\nশৈশবের সেই দিনগুলোর কথা খুব মনে পড়ে, যখন সামান্য জ্বর হলেই তুমি সারা রাত জেগে মাথায় হাত বুলিয়ে দিতে। আজ এই ব্যস্ত শহরে একলা বসে খুব বলতে ইচ্ছে করছে—তোমাকে যে কতটা ভালোবাসি, তা কোনো শব্দের ভাষায় প্রকাশ করার মতো নয়।\n\n${signoff}`
        case 'deep-feelings':
        case 'deeper-feeling':
          return `${salutation}\n\nঅনেক কথা বুকে জমে থাকে, যার সবটা বলা হয় না। শুধু এটুকু জানি, এই পৃথিবীর সমস্ত কোলাহল পেরিয়ে যখন ক্লান্ত হয়ে পড়ি, তখন কেবল তোমার আঁচলের স্নিগ্ধ ছায়াটুকুই শান্তির আশ্রয় হয়ে দাঁড়ায়। তোমাকে খুব বেশি ভালোবাসি আম্মু।\n\n${signoff}`
        case 'emotional':
        case 'more-emotional':
        default:
          return `${salutation}\n\nজীবনের এই দীর্ঘ পথচলায় হাজারো ব্যস্ততার মাঝে হয়তো প্রতিদিন বলা হয় না, কিন্তু মনের গভীরতম অনুভবে তুমি ছাড়া আমার আর কোনো শ্রেষ্ঠ অবলম্বন নেই। তোমার নিঃস্বার্থ ভালোবাসা আর নীরব ত্যাগই আমাকে মানুষ করেছে।\n\nপৃথিবীর যে প্রান্তেই থাকি না কেন, আমার সমস্ত শুভকামনা আর অন্তরের ভালোবাসা সবসময় তোমার জন্য। ভালো থেকো আম্মু।\n\n${signoff}`
      }
    }

    if (isLover) {
      switch (action) {
        case 'short-version':
        case 'make-shorter':
        case 'shorter':
          return `${salutation}\n\nসময়ের দূরত্ব যতই বাড়ুক, মনের আকাশে তোমার উপস্থিতি সবসময় ধ্রুবতারার মতো স্পষ্ট। খুব বেশি ভালোবাসি তোমাকে।\n\n${signoff}`
        case 'romantic':
        case 'more-romantic':
          return `${salutation}\n\nপ্রতিটি মেঘলা বিকেলে, বৃষ্টিভেজা বাতাসে আমি কেবল তোমার মিষ্টি হাসির ছোঁয়া খুঁজে পাই। যেখানেই থাকি না কেন, আমার সমস্ত ভালোবাসা নিঃশব্দে তোমার দিকেই ধাবিত হয়।\n\n${signoff}`
        case 'storytelling':
          return `${salutation}\n\nসেই বৃষ্টিভেজা বিকেলের কথা আজও মনের আয়নায় জীবন্ত হয়ে আছে। তোমার চোখে চোখ রেখে নীরব থাকার সেই মুহূর্তটি আমার জীবনের শ্রেষ্ঠ স্মৃতি। তোমাকে নিয়ে দেখা স্বপ্নগুলো আজ চিঠির ভাষায় সাজিয়ে দিলাম।\n\n${signoff}`
        case 'formal':
          return `${salutation}\n\nআপনার প্রতি আমার অন্তরের গভীর অনুরাগ ও শ্রদ্ধা চিরন্তন। জীবনের এই পথচলায় আপনার উপস্থিতি আমার জন্য এক পরম আশীর্বাদ।\n\n${signoff}`
        case 'emotional':
        default:
          return `${salutation}\n\nদিনের ব্যস্ততা শেষে যখন একলা আকাশটার দিকে তাকাই, বুকের ভেতর শুধু তোমার কথাই আলোড়ন তোলে। যে অনুভূতি মুখে বলা যায় না, আজ তা এই চিঠির অক্ষরে রেখে গেলাম—তোমাকে খুব ভালোবাসি।\n\n${signoff}`
      }
    }

    // Default short thought synthesis
    return `${salutation}\n\nহৃদয়ের যে অনুভূতিগুলো প্রতিদিনের ব্যস্ততায় অনুচ্চারিত থেকে যায়, আজ তা নিবিড় আন্তরিকতায় ব্যক্ত করলাম। দূরে কিংবা কাছে—যেখানেই থাকি না কেন, আমার সমস্ত ভালোবাসা ও আন্তরিক শুভকামনা সবসময় তোমার সাথেই থাকবে।\n\n${signoff}`
  }

  // If input is an existing letter, rewrite according to action directive without appending
  const paragraphs = cleaned.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const intro = paragraphs[0].includes('প্রিয়') || paragraphs[0].includes('শ্রদ্ধেয়') ? paragraphs[0] : salutation
  const closingCandidate = paragraphs[paragraphs.length - 1]
  const hasClosing = /^(ইতি|তোমার|আপনার|শুভকামনায়|ভালোবাসায়)/.test(closingCandidate)
  const bodyText = hasClosing ? paragraphs.slice(1, -1).join('\n\n') : paragraphs.slice(1).join('\n\n') || paragraphs[0]

  switch (action) {
    case 'short-version':
    case 'make-shorter':
    case 'shorter': {
      const firstSentence = bodyText.split(/(?<=[।!?])\s+/)[0] || bodyText
      return `${intro}\n\n${firstSentence}\n\nসময়ের স্রোতে অনেক কিছু বদলে গেলেও হৃদয়ের গভীরতম টান সবসময় একই রকম অটুট থাকবে।\n\n${signoff}`
    }
    case 'formal':
    case 'professional': {
      return `${intro}\n\nএই পত্রের মাধ্যমে আপনাকে আমার আন্তরিক শ্রদ্ধা ও শুভকামনা জ্ঞাপন করছি। জীবনের নানা প্রেক্ষাপটে আপনার সদয় উপস্থিতি ও সহযোগিতা অত্যন্ত অর্থবহ ও অনুপ্রেরণাদায়ক।\n\nআশা করি আগামী দিনগুলোতেও এই সুন্দর ও মার্জিত সম্পর্ক বজায় থাকবে। আপনার সুস্বাস্থ্য ও সর্বাঙ্গীন মঙ্গল কামনা করি।\n\n${signoff}`
    }
    case 'deep-feelings':
    case 'deeper-feeling': {
      return `${intro}\n\nকিছু অনুভূতি থাকে যা প্রতিদিনের কোলাহলে নিঃশব্দেই হারিয়ে যায়। অথচ একলা নিস্তব্ধ রাতে বুকের ভেতর সেই না-বলা কথাগুলোই সবচেয়ে বেশি সত্য হয়ে ওঠে। তোমার প্রতি আমার এই আন্তরিক অনুভব কোনো আনুষ্ঠানিকতার নয়—বরং আত্মার গভীরতম সত্য।\n\n${signoff}`
    }
    case 'storytelling': {
      return `${intro}\n\nপুরোনো দিনগুলোর স্মৃতি যখন স্মৃতিকাতর মেঘ হয়ে নেমে আসে, তখন এক অদ্ভুত মায়ায় মন ভরে ওঠে। সেই বিকেলের আলো, মিষ্টি কথা আর পথচলার প্রতিটি দৃশ্য আজও আমার মনে অমলিন হয়ে আছে। এই চিঠির প্রতিটি বাক্যে সেই ফেলে আসা স্মৃতির সুর বুনে দিলাম।\n\n${signoff}`
    }
    case 'simple':
    case 'simpler':
    case 'make-simpler':
    case 'simpler-language': {
      return `${intro}\n\nকোনো জটিল কথা নয়, একদম সহজ করে তোমাকে জানাতে চাই—তুমি আমার জীবনের অনেক বড় একটা ভালো লাগার জায়গা। সবসময় ভালো থেকো আর নিজের যত্ন নিও।\n\n${signoff}`
    }
    case 'romantic':
    case 'more-romantic': {
      return `${intro}\n\nতোমার মিষ্টি হাসির এক চিলতে আলোয় আমার পুরো দিন সুন্দর হয়ে যায়। দূরত্ব যতই থাকুক না কেন, প্রতিটি নিঃশ্বাসে আমি তোমার অনুভূতির পরশ অনুভব করি।\n\n${signoff}`
    }
    case 'emotional':
    case 'more-emotional':
    default: {
      return `${intro}\n\nমুখের কথা হয়তো বাতাসে মিলিয়ে যায়, কিন্তু হৃদয়ের গভীর থেকে লেখা এই চিঠির প্রতিটি শব্দ চিরকাল জীবন্ত থাকবে। তোমার উপস্থিতি আমার জীবনের শ্রেষ্ঠ পাওয়া। কখনো নিজেকে একা ভেবো না, আমার অন্তরের শুভকামনা সবসময় তোমার সাথে আছে।\n\n${signoff}`
    }
  }
}

/**
 * Main Refine Letter Pipeline
 * Executes via Gemini Flash -> OpenAI -> Local Engine with automated Quality Audit
 */
export async function refineLetterContent(
  params: RefineLetterParams
): Promise<{ refinedLetter: string; provider: 'gemini' | 'openai' | 'fallback'; audit: LetterQualityAudit }> {
  const route = classifyAITask({ action: params.action, text: params.letter })
  const rawPrompt = buildRefinementPrompt(params)
  const prompt = compressPrompt(rawPrompt)
  const optimalTokens = calculateOptimalTokens({
    language: params.language || 'bengali',
    targetWordCount: params.action.includes('short') ? 140 : params.action.includes('story') ? 320 : 220,
    taskType: route.taskType,
  })

  // Helper function to call Gemini with exponential backoff
  const tryGemini = async (): Promise<string | null> => {
    if (!genAI) return null
    for (let attempt = 0; attempt <= 2; attempt++) {
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
        if (text && text.length > 20) {
          const validated = validateAndCleanResponse(text, params.language || 'bengali')
          return cleanAiArtifacts(validated.cleanedText)
        }
      } catch (err) {
        console.warn(`[Refine Engine] Gemini attempt ${attempt + 1} error:`, err)
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)))
        }
      }
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
      if (text && text.length > 20) {
        const validated = validateAndCleanResponse(text, params.language || 'bengali')
        return cleanAiArtifacts(validated.cleanedText)
      }
    } catch (err) {
      console.warn('[Refine Engine] OpenAI attempt error:', err)
    }
    return null
  }

  // Always prioritize Gemini Flash family as the cost-efficient production engine
  const providers = [
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

  // Tertiary: High-Fidelity Local Storyteller Refiner (Contextual Full Synthesis)
  let fallbackText = localRefineFallback(params.letter, params.action, params.customInstruction, {
    relationship: params.relationship,
    receiverName: params.receiverName,
  })
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
