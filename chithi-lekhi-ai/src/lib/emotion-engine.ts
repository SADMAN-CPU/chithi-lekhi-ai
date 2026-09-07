import type { GenerateLetterRequest, LetterEmotion } from '@/types'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface EmotionalContextAnalysis {
  relationshipContext: {
    normalizedType: string
    intimacyLevel: 'intimate' | 'reverent' | 'casual' | 'tender' | 'reflective'
    bengaliTone: string
    addressSuggestions: string[]
    signoffSuggestions: string[]
    psychologicalCues: string[]
  }
  detectedEmotion: {
    primary: LetterEmotion | string
    bengaliLabel: string
    intensity: 'gentle' | 'deep' | 'passionate' | 'solemn'
    underlyingNeed: string
    emotionalPacing: string
  }
  sensoryAnchors: string[]
  forbiddenPatterns: string[]
  promptContext: string
}

// ─── Relationship Dynamics Knowledge Base ────────────────────────────────────

const RELATIONSHIP_DYNAMICS: Record<
  string,
  {
    intimacyLevel: EmotionalContextAnalysis['relationshipContext']['intimacyLevel']
    bengaliTone: string
    addressSuggestions: string[]
    signoffSuggestions: string[]
    psychologicalCues: string[]
  }
> = {
  lover: {
    intimacyLevel: 'intimate',
    bengaliTone: 'নিবিড় রোমান্টিক ও অনুরাগে ভরা',
    addressSuggestions: ['প্রিয়তম,', 'প্রিয়তমা,', 'আমার সবটুকু ভালোবাসা,', 'হৃদয়ের মানুষ,'],
    signoffSuggestions: ['চিরকালের তোমার,', 'সবটুকু ভালোবাসায়,', 'হৃদস্পন্দনের সাথী,', 'ইতি তোমারই একজন'],
    psychologicalCues: [
      'কথোপকথনে চোখাচোখি ও নীরব নৈকট্যের অনুভূতি জাগিয়ে তুলুন।',
      'দূরত্ব থাকলেও হৃদয়ের অবিচ্ছেদ্য স্পর্শ অনুভব করান।',
      'খুব বেশি নাটকীয় না হয়েও আন্তরিক ভালোবাসার গভীরতা ব্যক্ত করুন।',
    ],
  },
  'first-love': {
    intimacyLevel: 'intimate',
    bengaliTone: 'কৈশোরের প্রথম স্পন্দন, মিষ্টি লজ্জা ও নিষ্পাপ নস্টালজিয়া',
    addressSuggestions: ['প্রথম দেখার সেই মানুষটিকে,', 'প্রিয়,', 'যে নাম আজও হৃদয়ে বাজে,'],
    signoffSuggestions: ['প্রথম ভালোবাসার স্মৃতিতে,', 'সবসময়ের মতো তোমার,', 'অপেক্ষায়...'],
    psychologicalCues: [
      'প্রথমবার চোখে চোখ পড়ার কম্পন ও নিষ্পাপ স্মৃতির স্পর্শ থাকুক।',
      'সময়ের স্রোতে অনেক কিছু পাল্টালেও সেই প্রথম অনুভূতির পবিত্রতা অক্ষত থাকুক।',
    ],
  },
  'husband-wife': {
    intimacyLevel: 'intimate',
    bengaliTone: 'চিরচেনা গভীর নির্ভরতা, সাংসারিক মায়া ও আজীবনের ভালোবাসা',
    addressSuggestions: ['আমার জীবনের সাথী,', 'প্রিয়,', 'যার হাত ধরে পথচলা,'],
    signoffSuggestions: ['আজীবন তোমার পাশে,', 'সবটুকু নির্ভরতায়,', 'তোমারই অর্ধাঙ্গ / অর্ধাঙ্গিনী'],
    psychologicalCues: [
      'প্রতিদিনের সাধারণ মুহূর্তের ভেতরের যে গভীর মায়া ও কৃতজ্ঞতা, তা তুলে ধরুন।',
      'উত্থান-পতনে একসাথে টিকে থাকার শান্ত ভরসা প্রকাশ করুন।',
    ],
  },
  mother: {
    intimacyLevel: 'reverent',
    bengaliTone: 'পরম শ্রদ্ধা, অপত্য স্নেহ, মাতৃত্বের অসীম ত্যাগ ও আঁচলের সুবাস',
    addressSuggestions: ['শ্রদ্ধেয়া মা,', 'মা আমার,', 'আম্মু,'],
    signoffSuggestions: ['তোমার স্নেহের সন্তান,', 'তোমার চরণে অনন্ত প্রণাম,', 'তোমার আশীর্বাদের ছায়ায়...'],
    psychologicalCues: [
      'মায়ের বিনিদ্র রজনী, অসুস্থতায় সেবা এবং আঁচলের চিরশান্তি স্মৃতিতে আনুন।',
      'ব্যস্ততার কারণে ঠিকমতো খোঁজ না নেওয়ার মৃদু অপরাধবোধ ও অশেষ কৃতজ্ঞতা প্রকাশ করুন।',
      'মাকে কখনো বড় করে ধন্যবাদ দেওয়া হয় না—এই চিঠিতে যেন সেই অনুভূতির প্রকাশ ঘটে।',
    ],
  },
  father: {
    intimacyLevel: 'reverent',
    bengaliTone: 'নীরব বটবৃক্ষের মতো ছায়া, গম্ভীর ভালোবাসা ও আজন্ম কৃতজ্ঞতা',
    addressSuggestions: ['শ্রদ্ধেয় বাবা,', 'আব্বু,', 'আমার জীবনের পথপ্রদর্শক,'],
    signoffSuggestions: ['তোমার গর্বিত সন্তান,', 'প্রণামান্তে তোমার সন্তান,', 'তোমারই ছায়ায় বেড়ে ওঠা...'],
    psychologicalCues: [
      'বাবার নিঃশব্দ ত্যাগ, মাথার ঘাম পায়ে ফেলে সন্তানদের জন্য সব বিলিয়ে দেওয়ার কথা স্মরণ করুন।',
      'মুখে হয়তো ভালোবাসি বলা হয়নি কখনো, কিন্তু মনে মনে বাবা সবসময়ই আদর্শ ও সাহসের উৎস।',
    ],
  },
  family: {
    intimacyLevel: 'reverent',
    bengaliTone: 'রক্তের টান, পারিবারিক স্মৃতি ও শর্তহীন ভালোবাসা',
    addressSuggestions: ['স্নেহের...,', 'শ্রদ্ধেয়...,', 'আমার পরিবারের প্রিয় মানুষটিকে,'],
    signoffSuggestions: ['পারিবারিক ভালোবাসায়,', 'সবসময়ের শুভকামনায়,', 'তোমার আপনজন'],
    psychologicalCues: [
      'একসাথে বড় হওয়া, পুরোনো বাড়ির স্মৃতি ও চিরন্তন মমত্ববোধ ব্যক্ত করুন।',
    ],
  },
  friend: {
    intimacyLevel: 'casual',
    bengaliTone: 'নির্ভেজাল টান, অকপট সত্য, আড্ডার স্মৃতি ও বিশ্বস্ত আশ্রয়',
    addressSuggestions: ['দোস্ত,', 'বন্ধু আমার,', 'যার কাছে সব মন খুলে বলা যায়,'],
    signoffSuggestions: ['তোরই বন্ধু,', 'আড্ডার টেবিলে দেখা হবে,', 'সবসময়ের দোস্ত'],
    psychologicalCues: [
      'কোনো রকম কৃত্রিম ভদ্রতা বা আড়ষ্টতা থাকবে না—একেবারে প্রাণখোলা কথাবার্তা।',
      'একসাথে চা খাওয়া, খ্যাপানো, কঠিন সময়ে পাশে থাকার বিশ্বস্ততা তুলে ধরুন।',
    ],
  },
  'best-friend': {
    intimacyLevel: 'casual',
    bengaliTone: 'হৃদয়ের সবচেয়ে কাছের বন্ধু, জীবনের প্রতিটি গল্পের সাক্ষী',
    addressSuggestions: ['আমার প্রাণের বন্ধু,', 'দোস্ত,', 'প্রিয় মানুষ,'],
    signoffSuggestions: ['আজন্মের বন্ধুত্বে,', 'তোর বন্ধু,', 'সবসময়ের মতো পাশে আছি'],
    psychologicalCues: [
      'হাজার ভুল করলেও যে কখনো বিচার করে না, সেই পরম নির্ভরতা তুলে ধরুন।',
    ],
  },
  'lost-person': {
    intimacyLevel: 'reflective',
    bengaliTone: 'নীরব দীর্ঘশ্বাস, কোনো অভিযোগহীন স্মৃতিকাতরতা ও মৃদু শুভকামনা',
    addressSuggestions: ['স্মৃতির ওপারে থাকা মানুষটিকে,', 'বহুদিন পর প্রিয়...,', 'একদিন যার সাথে কথা না হলে চলত না,'],
    signoffSuggestions: ['দূর থেকে ভালো থেকো,', 'নীরব শুভাকাঙ্ক্ষী,', 'স্মৃতির ওপার থেকে...'],
    psychologicalCues: [
      'কোনো প্রকার তিক্ততা, রাগ বা ক্ষোভ থাকবে না। সময় যে দুজন মানুষকে আলাদা করে দেয়, তার শান্ত উপলব্ধি থাকবে।',
      'হঠাৎ একদিন পুরোনো কোনো জিনিসের স্পর্শে তার কথা মনে পড়ে যাওয়ার অনুভূতি।',
      'পুনরায় ফিরে পাওয়ার দাবি নেই, কেবল সে যেন ভালো থাকে এই আন্তরিক প্রার্থনা।',
    ],
  },
  'lost-connection': {
    intimacyLevel: 'reflective',
    bengaliTone: 'হারিয়ে যাওয়া যোগাযোগের বিষাদ ও ফেলে আসা সোনালী স্মৃতি',
    addressSuggestions: ['হারিয়ে যাওয়া ঠিকানার মানুষটিকে,', 'যে আজ অনেক দূরে,'],
    signoffSuggestions: ['পুরোনো দিনের স্মৃতিসহ,', 'তোমার স্মরণে,'],
    psychologicalCues: [
      'সময়ের ব্যবধানে হারিয়ে গেলেও ভেতরের শ্রদ্ধা ও টান অমলিন থাকার অনুভূতি।',
    ],
  },
  'special-person': {
    intimacyLevel: 'tender',
    bengaliTone: 'অনুচ্চারিত ভালোলাগা, মুগ্ধতা ও দূরবর্তী কোমল টান',
    addressSuggestions: ['যে মানুষটি আমার ভাবনায় প্রতিদিন থাকে,', 'বিশেষ কেউ,'],
    signoffSuggestions: ['নীরব মুগ্ধতায়,', 'দূর থেকে শুভকামনায়,', 'তোমার ভাবনায় যে থাকে'],
    psychologicalCues: [
      'মুখে হয়তো প্রকাশ করা হয়নি, কিন্তু প্রতিটি পদক্ষেপে তার উপস্থিতি ভাবনায় ভেসে ওঠে।',
      'অত্যন্ত মার্জিত ও সংবেদনশীল ভাষায় অনুভূতির স্পর্শ দিতে হবে।',
    ],
  },
  'someone-special': {
    intimacyLevel: 'tender',
    bengaliTone: 'অব্যক্ত অনুভূতির মিষ্টি কাঁপন ও গভীর শ্রদ্ধাভরা অনুরাগ',
    addressSuggestions: ['আমার ভাবনার মানুষটিকে,', 'প্রিয় বিশেষ মানুষ,'],
    signoffSuggestions: ['তোমার ভালো থাকার কামনায়,', 'নীরব ভালোবাসায়,'],
    psychologicalCues: [
      'সম্মান ও দূরবর্তী অনুরাগের দারুণ সমন্বয়।',
    ],
  },
}

// ─── Emotion Dynamics Knowledge Base ─────────────────────────────────────────

const EMOTION_PROFILES: Record<
  string,
  {
    bengaliLabel: string
    intensity: EmotionalContextAnalysis['detectedEmotion']['intensity']
    underlyingNeed: string
    emotionalPacing: string
    sensoryTriggers: string[]
  }
> = {
  love: {
    bengaliLabel: 'গভীর ভালোবাসা ও অনুরাগ',
    intensity: 'passionate',
    underlyingNeed: 'হৃদয়ের গভীরতম অনুভব ও ভালোবাসার চিরস্থায়ী আশ্রয়ের প্রকাশ',
    emotionalPacing: 'ধীর, উষ্ণ এবং প্রতিটি বাক্যে পরম নির্ভরতার স্পর্শ',
    sensoryTriggers: ['হৃদস্পন্দন', 'চোখের নীরব ভাষা', 'একসাথে হাত ধরা', 'মিষ্টি বাতাস'],
  },
  'missing-someone': {
    bengaliLabel: 'তীব্র বিরহ ও একাকিত্ব',
    intensity: 'deep',
    underlyingNeed: 'অনুপস্থিতির তীব্র শূন্যতা এবং স্মৃতির সান্নিধ্যের আকুতি',
    emotionalPacing: 'বুকের ভেতর চিনচিনে ব্যথার মতো থেমে থেমে চলা ভাব',
    sensoryTriggers: ['খালি চেয়ার', 'বারান্দার অন্ধকার', 'রাতের নীরবতা', 'পুরোনো ছবি', 'ঘড়ির টিকটিক'],
  },
  missing: {
    bengaliLabel: 'মিস করছি / বিরহের দীর্ঘশ্বাস',
    intensity: 'deep',
    underlyingNeed: 'প্রিয়জনের অনুপস্থিতির শূন্যতা প্রকাশ',
    emotionalPacing: 'স্মৃতিকাতর ও কিছুটা উদাসীন সুর',
    sensoryTriggers: ['জানালার বাইরে বৃষ্টি', 'চায়ের কাপে ধোঁয়া', 'পুরোনো গান'],
  },
  apology: {
    bengaliLabel: 'অকপট অনুশোচনা ও ক্ষমাপ্রার্থনা',
    intensity: 'solemn',
    underlyingNeed: 'অহংকার বিসর্জন দিয়ে ভুলের দায় স্বীকার ও শান্তি স্থাপন',
    emotionalPacing: 'সংযমী, শান্ত, অনুতপ্ত এবং বিনীত',
    sensoryTriggers: ['মাথা নিচু করার অনুভূতি', 'ভারী বুক', 'ভুলের নিস্তব্ধতা'],
  },
  gratitude: {
    bengaliLabel: 'হৃদয়ের গভীর কৃতজ্ঞতা',
    intensity: 'deep',
    underlyingNeed: 'জীবনের কঠিন সময়ে যে আলোকবর্তিকা হয়েছে তার অবদানকে স্বীকৃতি দেওয়া',
    emotionalPacing: 'উষ্ণ, ধন্য ও পরম তৃপ্তিময়',
    sensoryTriggers: ['অন্ধকারে বাড়িয়ে দেওয়া হাত', 'আশ্বাসের কণ্ঠস্বর', 'নিরাপদ আশ্রয়'],
  },
  sadness: {
    bengaliLabel: 'মনখারাপ ও বিষাদ',
    intensity: 'deep',
    underlyingNeed: 'মনের ভেতরের চাপা কান্না ও বেদনার শান্ত প্রকাশ',
    emotionalPacing: 'মৃদু, ব্যথিত ও দীর্ঘশ্বাসে পূর্ণ',
    sensoryTriggers: ['মেঘলা আকাশ', 'ঝরে পড়া পাতা', 'নীরব অশ্রু'],
  },
  happiness: {
    bengaliLabel: 'আনন্দ ও উচ্ছ্বাস',
    intensity: 'passionate',
    underlyingNeed: 'জীবনের আনন্দের মুহূর্তগুলোকে প্রিয়জনের সাথে ভাগ করে নেওয়া',
    emotionalPacing: 'উচ্ছল, চঞ্চল ও প্রাণবন্ত',
    sensoryTriggers: ['উজ্জ্বল রোদ', 'মুক্তোঝরা হাসি', 'উৎসবের আমেজ'],
  },
  motivation: {
    bengaliLabel: 'অনুপ্রেরণা ও সাহস',
    intensity: 'passionate',
    underlyingNeed: 'হতাশাগ্রস্ত বা ক্লান্ত মানুষকে পুনরায় উঠে দাঁড়ানোর শক্তি জোগানো',
    emotionalPacing: 'দৃঢ়, আস্থাবান ও শক্তিতে ভরপুর',
    sensoryTriggers: ['ভোরের প্রথম আলো', 'উত্তাল ঢেউয়ের সাথে লড়াই', 'অদম্য বিশ্বাস'],
  },
  nostalgia: {
    bengaliLabel: 'ফেলে আসা সোনালী দিনের নস্টালজিয়া',
    intensity: 'gentle',
    underlyingNeed: 'হারিয়ে যাওয়া নিষ্পাপ অতীত ও সুমধুর স্মৃতিকে পুনরায় ছুঁয়ে দেখা',
    emotionalPacing: 'উদাস, স্মৃতিকাতর ও মধুর বিষাদে ভরা',
    sensoryTriggers: ['ধুলোপড়া ডায়েরি', 'ক্যাসেটের গান', 'স্কুলের মাঠ', 'বিকেলের আলো'],
  },
}

// ─── Sensory Keywords Extractor ──────────────────────────────────────────────

function extractSensoryAnchors(text: string): string[] {
  const anchors: string[] = []
  const lower = text.toLowerCase()

  if (/বৃষ্টি|বর্ষা|শ্রাবণ|মেঘ|জল|ছাতা/i.test(lower)) {
    anchors.push('বৃষ্টিভেজা বিকেল ও মাটির সোঁদা গন্ধ')
  }
  if (/চা|টং|দোকান|কফি/i.test(lower)) {
    anchors.push('ধোঁয়া ওঠা চায়ের কাপ আর অমলিন আড্ডা')
  }
  if (/রাত|চাঁদ|জোছনা|অন্ধকার|নিস্তব্ধ/i.test(lower)) {
    anchors.push('মধ্যরাতের নিস্তব্ধতা ও একলা আকাশ')
  }
  if (/শীত|কুয়াশা|চাদর|ভোর/i.test(lower)) {
    anchors.push('শীতের সকালের কুয়াশা ও মৃদু ওম')
  }
  if (/চিঠি|কলম|কালি|খাম|ডাক/i.test(lower)) {
    anchors.push('ঝরনা কলমের কালির গন্ধ ও নীল খাম')
  }
  if (/গান|সুর|ক্যাসেট|রেডিও/i.test(lower)) {
    anchors.push('পুরোনো গানের চেনা সুর যা মনে মায়া জড়ায়')
  }
  if (/রেল|স্টেশন|ট্রেন|বিদায়|যাত্রী/i.test(lower)) {
    anchors.push('রেলস্টেশনের প্ল্যাটফর্মে শেষ বিদায়ের ক্ষণ')
  }
  if (/জন্মদিন|birthday|জনমদিন/i.test(lower)) {
    anchors.push('জন্মদিনের মোমের আলো, নতুন বছরের শুভকামনা ও একরাশ ভালোবাসা')
  }
  if (/বিবাহ|বিয়ে|বার্ষিকী|anniversary|wedding/i.test(lower)) {
    anchors.push('একসাথে পথচলার রঙিন স্মৃতি ও আজীবনের বিশ্বস্ত বন্ধন')
  }

  // Default anchors if none detected
  if (anchors.length === 0) {
    anchors.push('একটি শান্ত নির্জন বিকেল', 'স্মৃতির মৃদু গুঞ্জন')
  }

  return anchors
}

// ─── Core Analysis Function ──────────────────────────────────────────────────

/**
 * Phase 02: Emotion Understanding & Psychological Analysis Layer
 * Analyzes relationship dynamics, core emotion subtext, and sensory triggers
 * to construct a deeply nuanced epistolary blueprint for the generation engine.
 */
export function analyzeEmotionalContext(params: GenerateLetterRequest): EmotionalContextAnalysis {
  // 1. Resolve Relationship
  const rawRel = (params.relationship || 'special-person').toString().toLowerCase().trim()
  const relKey =
    rawRel in RELATIONSHIP_DYNAMICS
      ? rawRel
      : rawRel.includes('love') || rawRel.includes('প্রেম')
      ? 'lover'
      : rawRel.includes('mother') || rawRel.includes('মা')
      ? 'mother'
      : rawRel.includes('father') || rawRel.includes('বাবা')
      ? 'father'
      : rawRel.includes('friend') || rawRel.includes('বন্ধু')
      ? 'friend'
      : rawRel.includes('lost') || rawRel.includes('হারি')
      ? 'lost-person'
      : 'special-person'

  const relContext = RELATIONSHIP_DYNAMICS[relKey] || RELATIONSHIP_DYNAMICS['special-person']

  // 2. Resolve Emotion
  const feelingInput = `${params.feeling || ''} ${params.emotion || ''}`.toLowerCase()
  let emotionKey = 'love'

  if (/জন্মদিন|birthday|জনমদিন/i.test(feelingInput)) {
    emotionKey = 'happiness'
  } else if (/বিবাহ|বিয়ে|বার্ষিকী|anniversary/i.test(feelingInput)) {
    emotionKey = 'love'
  } else if (/মিস|বিরহ|দূর|শূন্য|একা|lonely|miss/i.test(feelingInput)) {
    emotionKey = 'missing-someone'
  } else if (/ক্ষমা|অনুতাপ|দুঃখিত|ভুল|apolog/i.test(feelingInput)) {
    emotionKey = 'apology'
  } else if (/কৃতজ্ঞ|ধন্যবাদ|ঋণী|gratitude|thank/i.test(feelingInput)) {
    emotionKey = 'gratitude'
  } else if (/কাঁদ|কষ্ট|বেদনা|মনখারাপ|sad|hurt/i.test(feelingInput)) {
    emotionKey = 'sadness'
  } else if (/আনন্দ|খুশি|হাসি|happy|celebrat/i.test(feelingInput)) {
    emotionKey = 'happiness'
  } else if (/সাহস|লড়াই|ভরসা|শক্তি|motivat|courage/i.test(feelingInput)) {
    emotionKey = 'motivation'
  } else if (/নস্টাল|স্মৃতি|পুরোনো|অতীত|nostalg/i.test(feelingInput)) {
    emotionKey = 'nostalgia'
  }

  const emotionProfile = EMOTIONS_MAP[emotionKey] || EMOTIONS_MAP.love

  // 3. Extract Sensory Anchors from context
  const fullContextText = `${params.memory || ''} ${params.situation || ''} ${params.feeling || ''}`
  const sensoryAnchors = extractSensoryAnchors(fullContextText)

  // 4. Forbidden Clichés (Strict Anti-AI Directives)
  const forbiddenPatterns = [
    'আশা করি তুমি ভালো আছো',
    'এই চিঠিটি পড়ার সময় তুমি সুস্থ আছো',
    'পর সমাচার এই যে',
    'তোমার কুশল কামনা করি',
    'উপসংহারে বলতে চাই',
    'I hope this letter finds you well',
    'In conclusion',
    'As an AI language model',
  ]

  // 5. Construct Epistolary Prompt Blueprint
  const promptContext = `══════════════════════════════════════════════════════
EMOTIONAL INTELLIGENCE & PSYCHOLOGICAL BLUEPRINT
══════════════════════════════════════════════════════
- RELATIONSHIP CATEGORY: ${relKey.toUpperCase()} (Intimacy Level: ${relContext.intimacyLevel.toUpperCase()})
- BENGALI EMOTIONAL REGISTER: ${relContext.bengaliTone}
- CORE EMOTION DETECTED: ${emotionProfile.bengaliLabel} (${emotionProfile.intensity.toUpperCase()} intensity)
- PSYCHOLOGICAL SUBTEXT: ${emotionProfile.underlyingNeed}
- NARRATIVE PACING: ${emotionProfile.emotionalPacing}

AUTHENTIC SENSORY ANCHORS TO WEAVE:
${sensoryAnchors.map((anchor) => `• ${anchor}`).join('\n')}

PSYCHOLOGICAL & EMOTIONAL WRITING DIRECTIVES:
${relContext.psychologicalCues.map((cue) => `• ${cue}`).join('\n')}
• Use natural Bengali punctuation and emotional pauses (যেমন: "...", "—") to create human cadence.
• Address the recipient with heartfelt reverence or intimacy: ${relContext.addressSuggestions.slice(0, 3).join(' বা ')}
• Conclude with a natural sign-off appropriate for this bond: ${relContext.signoffSuggestions.slice(0, 3).join(' বা ')}

STRICTLY FORBIDDEN ROBOTIC / ARTIFICIAL PATTERNS:
${forbiddenPatterns.map((f) => `✗ Never use "${f}"`).join('\n')}`

  return {
    relationshipContext: {
      normalizedType: relKey,
      intimacyLevel: relContext.intimacyLevel,
      bengaliTone: relContext.bengaliTone,
      addressSuggestions: relContext.addressSuggestions,
      signoffSuggestions: relContext.signoffSuggestions,
      psychologicalCues: relContext.psychologicalCues,
    },
    detectedEmotion: {
      primary: emotionKey,
      bengaliLabel: emotionProfile.bengaliLabel,
      intensity: emotionProfile.intensity,
      underlyingNeed: emotionProfile.underlyingNeed,
      emotionalPacing: emotionProfile.emotionalPacing,
    },
    sensoryAnchors,
    forbiddenPatterns,
    promptContext,
  }
}

const EMOTIONS_MAP = EMOTION_PROFILES
