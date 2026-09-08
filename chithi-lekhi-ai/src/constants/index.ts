import type {
  LetterCategory,
  WritingStyle,
  WritingPersonality,
  CoreWritingStyle,
  Language,
  LetterEmoji,
  Relationship,
  LetterLength,
  EraStyle,
  RefinementType,
} from '../types'
import { getRelationshipPromptConfig } from './relationshipPrompts'

export * from './relationshipPrompts'

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

// ─── Relationships (Phase 02 & 03: Primary 6 + Specific Nuances) ──────────────

export const RELATIONSHIP_OPTIONS: Array<{
  value: Relationship
  label: string
  labelEn: string
  emoji: string
  description: string
}> = [
  {
    value: 'lover',
    label: 'প্রেমিক / প্রেমিকা',
    labelEn: 'Lover / Partner',
    emoji: '🌹',
    description: 'হৃদয়ের গভীরতম ভালোবাসার মানুষ',
  },
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
    value: 'mother',
    label: 'মা / আম্মু (Mother / Ammu)',
    labelEn: 'Mother / Ammu',
    emoji: '🤱',
    description: 'স্নেহের আঁচল, নিঃস্বার্থ ত্যাগ ও পরম আশ্রয়',
  },
  {
    value: 'father',
    label: 'বাবা / আব্বু (Father / Abbu)',
    labelEn: 'Father / Abbu',
    emoji: '🌿',
    description: 'নিঃশব্দ বটবৃক্ষের মতো ভরসার ছায়া ও প্রেরণা',
  },
  {
    value: 'sibling',
    label: 'ভাই / বোন (Sibling)',
    labelEn: 'Brother / Sister',
    emoji: '👫',
    description: 'শৈশবের খুনসুটি, অকৃত্রিম টান ও আজন্ম নির্ভরতা',
  },
  {
    value: 'friend',
    label: 'বন্ধু (Friend)',
    labelEn: 'Friend',
    emoji: '🤝',
    description: 'প্রাণখোলা আড্ডা, নির্ভেজাল টান ও আজীবনের সঙ্গী',
  },
  {
    value: 'best-friend',
    label: 'প্রিয় বন্ধু',
    labelEn: 'Best Friend',
    emoji: '☕',
    description: 'যার কাছে মনের সব না-বলা কথা বলা যায়',
  },
  {
    value: 'mentor',
    label: 'শিক্ষক / মেন্টর (Teacher / Mentor)',
    labelEn: 'Teacher / Mentor',
    emoji: '🎓',
    description: 'দিকনির্দেশক, শ্রদ্ধেয় গুরুজন ও পথের দিশারী',
  },
  {
    value: 'family',
    label: 'পরিবার / আত্মীয়',
    labelEn: 'Family',
    emoji: '🏡',
    description: 'পরিবারের প্রিয় স্বজন ও রক্ত সম্পর্কের আপনজন',
  },
  {
    value: 'lost-person',
    label: '🕊️ স্মৃতির মানুষ',
    labelEn: 'Someone I Miss',
    emoji: '🕊️',
    description: 'যিনি আর পাশে নেই বা স্মৃতির ওপারে চিরচেনা কেউ',
  },
  {
    value: 'lost-connection',
    label: '📩 হারিয়ে যাওয়া যোগাযোগ',
    labelEn: 'Lost Connection',
    emoji: '📩',
    description: 'যোগাযোগ থেমে গেছে কিন্তু যার কথা আজও মনে পড়ে',
  },
  {
    value: 'special-person',
    label: 'বিশেষ কেউ',
    labelEn: 'Special Person',
    emoji: '✨',
    description: 'অনুচ্চারিত ভালোলাগা, মুগ্ধতা বা অনুভূতির মানুষ',
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

// ─── Storytelling Suggestions & Inspirations (Bilingual) ───────────────────────

export interface SuggestionItem {
  bn: string
  en: string
}

export const MEMORY_SUGGESTIONS: SuggestionItem[] = [
  {
    bn: 'একসাথে বৃষ্টিভেজা বিকেলে এক ছাতার নিচে হাঁটা',
    en: 'Walking together under a single umbrella on a rainy evening',
  },
  {
    bn: 'প্রথমবার যখন দুজনের চোখে চোখ পড়েছিল',
    en: 'The very first moment our eyes met in quiet understanding',
  },
  {
    bn: 'শহরের পুরোনো চায়ের দোকানে ঘণ্টার পর ঘণ্টা আড্ডা',
    en: 'Endless conversations over hot tea at our favorite roadside stall',
  },
  {
    bn: 'রেলস্টেশনে বিদায়বেলার শেষ মুহূর্তের নীরবতা',
    en: 'The quiet ache of saying goodbye at the railway station platform',
  },
  {
    bn: 'মধ্যরাতের মৃদু ফিসফিস করা দীর্ঘ ফোনালাপ',
    en: 'Late-night whispered phone conversations when the whole city slept',
  },
  {
    bn: 'শীতের ভোরে কুয়াশার মাঝে হাত ধরে পথ চলা',
    en: 'Walking hand in hand through quiet misty winter mornings',
  },
  {
    bn: 'পরীক্ষার দিনগুলোতে একে অপরকে সাহস যোগানো',
    en: 'Encouraging and standing by each other during our hardest days',
  },
  {
    bn: 'সেই বিশেষ গানটি যা শুনলেই তোমার কথা মনে পড়ে',
    en: 'That nostalgic song that always brings your smile to mind',
  },
]

export const SITUATION_SUGGESTIONS: SuggestionItem[] = [
  {
    bn: 'আজ তোমার একটি বিশেষ দিন বা শুভক্ষণ (জন্মদিন / শুভকামনা)',
    en: 'Today is your special day (Happy Birthday / Best Wishes)',
  },
  {
    bn: 'আমাদের একসাথে পথচলার আরেকটি বিশেষ বছর (বিবাহবার্ষিকী)',
    en: 'Celebrating another beautiful milestone together (Anniversary)',
  },
  {
    bn: 'আমরা এখন অনেক দূরে থাকি, দূরত্ব অনেক বেড়েছে',
    en: 'We live far apart now, separated by oceans and miles',
  },
  {
    bn: 'অনেক দিন কথা হয় না, কিন্তু মনে প্রতিদিন থাকো',
    en: "We haven't spoken in a long time, but you are in my daily thoughts",
  },
  {
    bn: 'একটি অনাকাঙ্ক্ষিত ভুল বোঝাবুঝির পর এই চিঠি',
    en: 'Reaching out from the heart after an unfortunate misunderstanding',
  },
  {
    bn: 'নীরব নিস্তব্ধ একাকী রাতে হঠাৎ স্মৃতির ভিড়',
    en: 'A quiet solitary night where memories come rushing back',
  },
  {
    bn: 'কাছে থেকেও মুখে বলতে পারছি না মনের কথাগুলো',
    en: 'Being near you yet unable to put these deep feelings into spoken words',
  },
]

export const FEELING_SUGGESTIONS: SuggestionItem[] = [
  {
    bn: 'তীব্র মিস করছি তোমাকে, প্রতিটি মুহূর্তে',
    en: 'Missing you deeply and counting every quiet hour',
  },
  {
    bn: 'হৃদয়ে গোপন ভালোবাসার স্বীকারোক্তি জানাতে চাই',
    en: 'Wanting to gently confess the unspoken love in my heart',
  },
  {
    bn: 'হৃদয়ের গভীর থেকে ক্ষমা প্রার্থনা ও অনুশোচনা',
    en: 'Asking for heartfelt forgiveness with sincere regret',
  },
  {
    bn: 'জীবনের প্রতিটি পদক্ষেপে তোমার প্রতি চিরন্তন কৃতজ্ঞতা',
    en: 'Endless gratitude for your warmth and sacrifices in my life',
  },
  {
    bn: 'অভিমান ভেঙে ভালোবাসায় জড়িয়ে নেওয়ার তীব্র ইচ্ছা',
    en: 'A tender wish to melt away all pride and embrace with love',
  },
  {
    bn: 'নীরব শুভকামনা ও তোমাকে ভালো রাখার প্রার্থনা',
    en: 'Silent prayers for your happiness, health, and peace of mind',
  },
  {
    bn: 'একাকিত্বে তোমার উপস্থিতি তীব্রভাবে অনুভব করা',
    en: 'Feeling your soothing presence even in my deepest solitude',
  },
]

export const RELATIONSHIP_CONTEXTUAL_SUGGESTIONS: Record<
  string,
  {
    memories: SuggestionItem[]
    situations: SuggestionItem[]
    feelings: SuggestionItem[]
  }
> = {
  mother: {
    memories: [
      {
        bn: 'ছোটবেলায় অসুস্থ হলে সারারাত মাথায় হাত বুলিয়ে দেওয়া',
        en: 'Staying awake all night comforting me during childhood illness',
      },
      {
        bn: 'স্কুল থেকে ফিরে তোমার হাতের গরম ভাতের অমলিন সুবাস',
        en: 'The comforting aroma of your home-cooked meal after school',
      },
      {
        bn: 'আমাদের আবদার মেটাতে তোমার নীরবে নিজের শখ বিসর্জন দেওয়া',
        en: 'Your quiet sacrifices to fulfill our small childhood wishes',
      },
      {
        bn: 'বড় হয়ে দূর শহরে এসে তোমার পরম যত্নের অভাব অনুভব করা',
        en: 'Feeling the void of your unconditional warmth in a distant city',
      },
    ],
    situations: [
      {
        bn: 'আজ তোমার জন্মদিনে দূরে থেকেও অফুরন্ত ভালোবাসা জানাতে চাই',
        en: 'Wishing you on your birthday with endless devotion from afar',
      },
      {
        bn: 'ব্যস্ততার ভিড়ে প্রতিদিন ফোন করা হয় না, কিন্তু মনে থাকো সবসময়',
        en: "Busy days keep me from calling, but you live in my heart daily",
      },
      {
        bn: 'জীবনের কঠিন সময়ে তোমার দোয়া আর নির্ভরতার গভীর প্রয়োজন',
        en: 'Deeply needing your prayers and steady blessing in tough times',
      },
    ],
    feelings: [
      {
        bn: 'তোমার প্রতি অফুরন্ত শ্রদ্ধা, অপত্য ভালোবাসা ও আজন্ম কৃতজ্ঞতা',
        en: 'Boundless reverence, filial devotion, and lifelong gratitude',
      },
      {
        bn: 'কখনো মুখে ধন্যবাদ বলা হয়নি, আজ চিঠির অক্ষরে সবটুকু প্রকাশ',
        en: 'Never could thank you in person; expressing it in this letter today',
      },
      {
        bn: 'তোমার সুস্বাস্থ্য ও দীর্ঘায়ুর জন্য প্রতি নিঃশ্বাসে অন্তরের দোয়া',
        en: 'Praying with every heartbeat for your good health and long life',
      },
    ],
  },
  father: {
    memories: [
      {
        bn: 'ছোটবেলায় তোমার শক্ত হাত ধরে প্রথম নির্ভয়ে পথ চলার স্মৃতি',
        en: 'Holding your protective hand while learning to walk fearlessly',
      },
      {
        bn: 'আমাদের মুখে হাসি ফোটাতে তোমার রোদ-বৃষ্টি মাথায় নিয়ে অবিরাম পরিশ্রম',
        en: 'Your relentless toil through heat and rain just to bring us joy',
      },
      {
        bn: 'কখনো নিজের জন্য কিছু না চেয়ে সবসময় সন্তানদের আবদার আগে রাখা',
        en: 'Never asking for yourself, always placing your family first',
      },
      {
        bn: 'পরীক্ষায় ভালো ফলাফল করার পর তোমার চোখের নীরব গর্বের ঝলক',
        en: 'The quiet glow of fatherly pride in your eyes after my success',
      },
    ],
    situations: [
      {
        bn: 'বড় হওয়ার পর উপলব্ধি করছি আমাদের জন্য কতটা ত্যাগ তুমি করেছো',
        en: 'Now as an adult I truly comprehend the magnitude of your sacrifices',
      },
      {
        bn: 'আজ বিশেষ দিনে তোমার চরণে বিনম্র শ্রদ্ধা ও ভালোবাসা জানাতে চাই',
        en: 'On this special day, offering my deepest respect and love to you',
      },
      {
        bn: 'জীবনের প্রতিটি পদক্ষেপে তোমার সততা ও আদর্শই আমার প্রধান পাথেয়',
        en: 'Your honesty and principles remain my enduring compass in life',
      },
    ],
    feelings: [
      {
        bn: 'মুখে বলা হয়নি কখনো, কিন্তু মনে মনে তুমিই আমার জীবনের সবচেয়ে বড় শক্তি',
        en: "Never spoken aloud, but you are my greatest strength and role model",
      },
      {
        bn: 'তোমার ছায়াতলে সন্তান হিসেবে বেড়ে ওঠার অপরিসীম গর্ব ও শ্রদ্ধা',
        en: 'Immense pride and reverent gratitude for being raised in your shelter',
      },
      {
        bn: 'সবসময় তোমার মুখ উজ্জ্বল করার আন্তরিক আত্মপ্রত্যয়',
        en: 'A heartfelt promise to honor your legacy and make you proud',
      },
    ],
  },
  sibling: {
    memories: [
      {
        bn: 'ছোটবেলার সেই খুনসুটি, খুনসুটির পর পরই আবার একসাথে ভাগ করে খাওয়া',
        en: 'Childhood silly fights followed immediately by sharing treats',
      },
      {
        bn: 'পারিবারিক বকুনি থেকে একে অপরকে রক্ষা করার গোপন সমঝোতা',
        en: 'Conspiring together to shield each other from scolding',
      },
      {
        bn: 'এক ছাদের নিচে বড় হয়ে ওঠার খুনসুটি আর হাসির অমূল্য দিনগুলো',
        en: 'The golden days of growing up and laughing under one roof',
      },
    ],
    situations: [
      {
        bn: 'আজ তোমার বিশেষ দিনে অনেক অনেক ভালোবাসা ও আন্তরিক শুভেচ্ছা',
        en: 'Sending heartfelt congratulations and love on your special milestone',
      },
      {
        bn: 'এখন যে যার মতো দূরে থাকি, পুরোনো আড্ডার সেই দিনগুলো খুব মিস করি',
        en: 'Living far apart now, missing our everyday childhood banter',
      },
    ],
    feelings: [
      {
        bn: 'যতই খুনসুটি হোক, তোর প্রতি আমার টান আর স্নেহ চিরকালের',
        en: 'Beyond all our teasing, my love and affection for you are timeless',
      },
      {
        bn: 'জীবনের প্রতিটি বাঁকে সবসময় তোর পাশে ছায়ার মতো আছি ও থাকব',
        en: 'I will stand steadfastly by your side through every chapter of life',
      },
    ],
  },
  mentor: {
    memories: [
      {
        bn: 'জীবনের দিকভ্রান্ত মুহূর্তে আপনার মূল্যবান পরামর্শ ও সঠিক দিকনির্দেশনা',
        en: 'Your invaluable counsel when I felt uncertain about the future',
      },
      {
        bn: 'আমার সামর্থ্যের ওপর আপনার অটল আস্থা ও আত্মবিশ্বাস জাগিয়ে তোলা',
        en: 'Your steadfast belief in my capabilities when I doubted myself',
      },
    ],
    situations: [
      {
        bn: 'আজকের এই অবস্থানে পৌঁছানোর পেছনে আপনার ভূমিকা অনস্বীকার্য',
        en: 'Your mentorship is the cornerstone of where I stand today',
      },
      {
        bn: 'বিশেষ মুহূর্তে আপনাকে হৃদয় নিংড়ানো বিনম্র শ্রদ্ধা জানাতে এই চিঠি',
        en: 'Writing to express my profound reverence and respect to you',
      },
    ],
    feelings: [
      {
        bn: 'আপনার নিঃস্বার্থ শিক্ষাদান ও অনুপ্রেরণার প্রতি আজীবন বিনম্র কৃতজ্ঞতা',
        en: 'Lifelong gratitude for your dedicated mentorship and inspiration',
      },
    ],
  },
  friend: {
    memories: [
      {
        bn: 'বৃষ্টির দিনে চায়ের দোকানে ঘণ্টার পর ঘণ্টা জীবনের গল্প করা',
        en: 'Hours of endless storytelling over steaming tea on rainy days',
      },
      {
        bn: 'কঠিন সময়ে যখন সবাই দূরে সরে গিয়েছিল, তুই পাশে দাঁড়িয়েছিলি',
        en: 'When everyone drifted away, you stood steadfastly by my side',
      },
      {
        bn: 'একসাথে কাটানো পাগলামি, প্রাণখোলা হাসি আর সোনালী আড্ডার স্মৃতি',
        en: 'Golden memories of hearty laughter and effortless companionship',
      },
    ],
    situations: [
      {
        bn: 'অনেক দিন দেখা হয় না, কিন্তু মনের সংযোগ আগের মতোই তাজা',
        en: "We haven't met in a long time, but our bond remains vibrant",
      },
      {
        bn: 'আজ তোর জন্মদিনে প্রাণখোলা অভিনন্দন ও অফুরন্ত শুভকামনা',
        en: 'Warmest birthday cheers and deepest well-wishes on your big day',
      },
    ],
    feelings: [
      {
        bn: 'তোর মতো একজন খাঁটি বন্ধু পাওয়া আমার জীবনের বড় পাওয়া',
        en: 'Finding a true friend like you is a genuine blessing in life',
      },
      {
        bn: 'দূরত্ব যাই হোক, আমাদের বন্ধুত্ব কখনো ম্লান হবে না',
        en: 'No distance can ever diminish the strength of our friendship',
      },
    ],
  },
  lover: {
    memories: [
      {
        bn: 'এক ছাতার নিচে একসাথে ভেজা বৃষ্টির সেই অবিস্মরণীয় বিকেল',
        en: 'That unforgettable afternoon sharing an umbrella in the pouring rain',
      },
      {
        bn: 'প্রথমবার যখন দুজন দুজনের চোখের দিকে তাকিয়ে স্তব্ধ হয়েছিলাম',
        en: 'That breathless silence the first time our eyes truly met',
      },
      {
        bn: 'গভীর রাতে ফিসফিস করে ঘণ্টার পর ঘণ্টা মনের কথা বলা',
        en: 'Whispering heartfelt confessions late into the night for hours',
      },
    ],
    situations: [
      {
        bn: 'আজ এই বিশেষ ক্ষণে আমার হৃদয় নিংড়ানো ভালোবাসা জানাতে চাই',
        en: 'Wishing to pour out the deepest devotion of my heart on this day',
      },
      {
        bn: 'দূরে থাকলেও প্রতি ক্ষণে তোমার উপস্থিতি আমার নিঃশ্বাসে অনুভব করি',
        en: 'Though miles apart, I feel your warmth in every breath I take',
      },
      {
        bn: 'অভিমানের মেঘ কাটিয়ে আবার আগের মতো আপন হতে চাই',
        en: 'Wishing to clear every misunderstanding and hold you close again',
      },
    ],
    feelings: [
      {
        bn: 'আমার পুরোটা পৃথিবী জুড়ে কেবল তোমারই মায়াবী সুর ও অস্তিত্ব',
        en: 'My whole world resonates with your gentle presence and love',
      },
      {
        bn: 'প্রতিটি জন্মে তোমাকেই নতুন করে ভালোবাসার চিরন্তন অঙ্গীকার',
        en: 'An eternal promise to fall in love with you in every lifetime',
      },
      {
        bn: 'তোমার একটা মিষ্টি হাসির কাছে আমার সমস্ত ক্লান্তি দূর হয়ে যায়',
        en: 'A single warm smile of yours melts all my exhaustion away',
      },
    ],
  },
}

export function getSuggestionsForRelationship(relationship: string): {
  memories: SuggestionItem[]
  situations: SuggestionItem[]
  feelings: SuggestionItem[]
} {
  const config = getRelationshipPromptConfig(relationship)
  return {
    memories: config.memorySuggestions,
    situations: config.situationSuggestions,
    feelings: config.feelingSuggestions,
  }
}

// ─── Emotion Options (Phase 02) ───────────────────────────────────────────────

export const EMOTION_OPTIONS: Array<{
  value: string
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
    description: 'হৃদয়ের গভীরতম ভালোবাসা ও অবিচ্ছেদ্য টান',
  },
  {
    value: 'missing-someone',
    label: 'তীব্র মিস করছি',
    labelEn: 'Missing Someone',
    emoji: '🌙',
    description: 'অনুপস্থিতির তীব্র শূন্যতা ও স্মৃতির গভীর দীর্ঘশ্বাস',
  },
  {
    value: 'apology',
    label: 'ক্ষমাপ্রার্থনা',
    labelEn: 'Apology',
    emoji: '🙏',
    description: 'অকপট অনুশোচনা, ভুলের দায় স্বীকার ও শান্তি স্থাপন',
  },
  {
    value: 'gratitude',
    label: 'কৃতজ্ঞতা',
    labelEn: 'Gratitude',
    emoji: '✨',
    description: 'জীবনের কঠিন সময়ে আলো হয়ে পাশে থাকার স্বীকৃতি',
  },
  {
    value: 'sadness',
    label: 'মনখারাপ ও বিষাদ',
    labelEn: 'Sadness',
    emoji: '🌧️',
    description: 'মনের ভেতরের চাপা কান্না ও বেদনাময় অনুভূতি',
  },
  {
    value: 'happiness',
    label: 'আনন্দ ও উচ্ছ্বাস',
    labelEn: 'Happiness',
    emoji: '🎉',
    description: 'জীবনের আনন্দের মুহূর্তগুলোকে প্রিয়জনের সাথে ভাগ করে নেওয়া',
  },
  {
    value: 'motivation',
    label: 'অনুপ্রেরণা ও সাহস',
    labelEn: 'Motivation',
    emoji: '🔥',
    description: 'হতাশা কাটিয়ে নতুন করে মাথা তুলে দাঁড়ানোর প্রত্যয়',
  },
  {
    value: 'nostalgia',
    label: 'নস্টালজিয়া ও পুরোনো স্মৃতি',
    labelEn: 'Nostalgia',
    emoji: '📻',
    description: 'ফেলে আসা সোনালী দিন ও শৈশবের অমলিন স্মৃতি',
  },
] as const

// ─── The 5 Core Writing Styles ───────────────────────────────────────────────

export const CORE_WRITING_STYLES: Array<{
  value: CoreWritingStyle
  label: string
  labelEn: string
  emoji: string
  tagline: string
  description: string
}> = [
  {
    value: 'emotional',
    label: 'আবেগঘন',
    labelEn: 'Emotional',
    emoji: '💖',
    tagline: 'হৃদয়ের অন্তঃস্থল ছোঁয়া তীব্র অনুভূতি',
    description: 'মনের গভীরতম টান, চোখের কোণে জল এনে দেওয়ার মতো খাঁটি ব্যাকুলতা ও আন্তরিক প্রকাশ।',
  },
  {
    value: 'simple',
    label: 'সহজ ও সাবলীল',
    labelEn: 'Simple',
    emoji: '🌿',
    tagline: 'কৃত্রিমতাহীন সহজ আন্তরিক কথন',
    description: 'কোনো নাটকীয়তা ছাড়া অত্যন্ত সৎ, দৈনন্দিন ও মনের গভীর থেকে বলা সহজ মানবিক কথা।',
  },
  {
    value: 'mature',
    label: 'পরিপক্ব ও শান্ত',
    labelEn: 'Mature',
    emoji: '☕',
    tagline: 'মর্যাদাশীল, শান্ত ও পরিণত দৃষ্টিভঙ্গি',
    description: 'জীবনের গভীর উপলব্ধি, সংযত প্রকাশ এবং শ্রদ্ধা ও ভালোবাসার এক শান্ত সুদৃঢ় আবহ।',
  },
  {
    value: 'poetic',
    label: 'কাব্যিক ও ছন্দময়',
    labelEn: 'Poetic',
    emoji: '🌙',
    tagline: 'ছন্দময় রূপক ও নান্দনিক সাহিত্য',
    description: 'বৃষ্টি, মেঘ, নীরব সন্ধ্যা আর অনুভূতির মায়াবী রূপক দিয়ে সাজানো সাহিত্যিক চিঠি।',
  },
  {
    value: 'formal',
    label: 'মার্জিত ও শ্রদ্ধাশীল',
    labelEn: 'Formal',
    emoji: '📜',
    tagline: 'সম্মানজনক, ব্যাকরণগতভাবে নিখুঁত ও মার্জিত',
    description: 'গুরুজন, শিক্ষক বা আনুষ্ঠানিক প্রয়োজনে যথাযোগ্য সম্মান ও শুদ্ধ ব্যাকরণে সাজানো চিঠি।',
  },
] as const

// ─── The 8 Advanced Writing Personalities (Phase 03) ──────────────────────────

export const WRITING_PERSONALITIES: Array<{
  value: WritingPersonality
  label: string
  labelEn: string
  emoji: string
  tagline: string
  description: string
}> = [
  {
    value: 'deep-emotional',
    label: 'গভীর আবেগময়',
    labelEn: 'Deep Emotional',
    emoji: '🌊',
    tagline: 'হৃদয়ের অন্তঃস্থল ছোঁয়া তীব্র অনুভব',
    description: 'অকপট আকুলতা, চোখের কোণে জল এনে দেওয়ার মতো খাঁটি অনুভূতি ও মনের অব্যক্ত কথা।',
  },
  {
    value: 'romantic',
    label: 'রোমান্টিক',
    labelEn: 'Romantic',
    emoji: '🌹',
    tagline: 'মধুর প্রেম ও অনুরাগের মিষ্টি কথন',
    description: 'মুগ্ধতা, আদুরে কথন, হৃদস্পন্দনের উষ্ণতা এবং ভালোবাসার নিবিড় অনুভূতি।',
  },
  {
    value: 'poetic',
    label: 'কাব্যিক',
    labelEn: 'Poetic',
    emoji: '🕊️',
    tagline: 'ছন্দময় রূপক ও নান্দনিক সাহিত্য',
    description: 'বৃষ্টি, মেঘ, জোছনা ও অনুভূতির মায়াবী মেলবন্ধন; প্রতিটি বাক্যে কবিতার সুর।',
  },
  {
    value: 'rabindranath-classical',
    label: 'রবীন্দ্র-ধাঁচের ধ্রুপদী চিঠি',
    labelEn: 'Rabindranath Classical',
    emoji: '📜',
    tagline: 'ছিন্নপত্রের ধ্রুপদী ভাব ও গভীর দর্শন',
    description: 'শান্তিনিকেতনী আভিজাত্য, গোধূলির আলো, স্মৃতিকথা ও ধ্রুপদী বাংলা ভাষার অনুপম মাধুর্য।',
  },
  {
    value: '90s-handwritten',
    label: '৯০-এর হাতে লেখা ডাকচিঠি',
    labelEn: '90s Handwritten',
    emoji: '✉️',
    tagline: 'নীল খাম, ঝরনা কলম ও মিষ্টি অপেক্ষা',
    description: 'ডাকপিয়নের ঘণ্টার শব্দ, হারমোনিয়ামের সুর আর ক্যাসেট যুগের নিখাদ নস্টালজিয়া।',
  },
  {
    value: 'simple-human',
    label: 'সহজ ও সাবলীল মানুষের কথন',
    labelEn: 'Simple Natural Human',
    emoji: '☕',
    tagline: 'কৃত্রিমতাহীন সহজ আন্তরিক কথন',
    description: 'কোনো জটিলতা ছাড়া সাধারণ মানুষের মতো খোলামেলা ও মনছোঁয়া কথাবার্তা।',
  },
  {
    value: 'funny-friend',
    label: 'মজার বন্ধুত্বের চিঠি',
    labelEn: 'Funny Friendship',
    emoji: '🎈',
    tagline: 'খুনসুটি, হাসি আর নির্ভেজাল টান',
    description: 'একটু খোঁটা দেওয়া, পুরোনো দিনের আড্ডার স্মৃতি আর মজাদার খুনসুটিতে ভরা বন্ধুত্ব।',
  },
  {
    value: 'mature-apology',
    label: 'গম্ভীর ও পরিপক্ব ক্ষমাপ্রার্থনা',
    labelEn: 'Mature Apology',
    emoji: '🌱',
    tagline: 'অকপট অনুশোচনা ও শান্তির প্রয়াস',
    description: 'কোনো অজুহাত ছাড়া ভুলের শান্ত দায় স্বীকার, আত্মমর্যাদা ও ক্ষমা চাওয়ার মার্জিত রূপ।',
  },
] as const

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
    value: 'emotional',
    label: 'আবেগঘন করুন',
    labelEn: 'Make Emotional ❤️',
    emoji: '❤️',
    description: 'অনুভূতির গভীরতা ও হৃদয়ের তীব্র আকুলতা বাড়িয়ে দিন',
  },
  {
    value: 'deep-feelings',
    label: 'গভীর অনুভূতি',
    labelEn: 'Deep Feelings',
    emoji: '🌊',
    description: 'মনের না-বলা অব্যক্ত কথা ও আত্মিক টান প্রকাশ করুন',
  },
  {
    value: 'formal',
    label: 'আনুষ্ঠানিক করুন',
    labelEn: 'Make Formal',
    emoji: '🏛️',
    description: 'মার্জিত, সুসংহত ও বিনম্র আনুষ্ঠানিক রূপ দিন',
  },
  {
    value: 'simple',
    label: 'সহজ ও স্বাভাবিক',
    labelEn: 'Make Simple',
    emoji: '🍃',
    description: 'জটিলতা এড়িয়ে আন্তরিক ও সহজ ভাষায় রূপ দিন',
  },
  {
    value: 'romantic',
    label: 'রোমান্টিক করুন',
    labelEn: 'Make Romantic',
    emoji: '🌹',
    description: 'প্রেম, অনুরাগ ও মধুর কথনের স্পর্শ দিন',
  },
  {
    value: 'professional',
    label: 'পেশাদার রূপ',
    labelEn: 'Professional',
    emoji: '💼',
    description: 'স্পষ্ট, দায়িত্বশীল ও পেশাদার শৈলীতে পুনর্লিখন করুন',
  },
  {
    value: 'short-version',
    label: 'সংক্ষিপ্ত করুন',
    labelEn: 'Make Shorter',
    emoji: '✂️',
    description: 'মূল কথাগুলো রেখে সংক্ষেপ ও নিবিড় করুন (১০০–১৫০ শব্দ)',
  },
  {
    value: 'storytelling',
    label: 'গল্পগাথা কথন',
    labelEn: 'Storytelling',
    emoji: '📖',
    description: 'স্মৃতিকাতর আবহ ও দৃশ্যপট সাজিয়ে গল্পের মতো প্রকাশ করুন',
  },
] as const

