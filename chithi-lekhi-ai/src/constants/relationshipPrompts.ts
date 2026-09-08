import type { Relationship } from '@/types'

export interface RelationshipPromptConfig {
  id: Relationship
  title: string
  titleEn: string
  sectionTitle: string
  sectionTitleEn: string
  sectionSubtitle: string
  sectionSubtitleEn: string
  memoryLabel: string
  memoryLabelEn: string
  memoryPlaceholder: string
  memoryPlaceholderEn: string
  situationPlaceholder: string
  situationPlaceholderEn: string
  feelingPlaceholder: string
  feelingPlaceholderEn: string
  memorySuggestions: Array<{ bn: string; en: string }>
  situationSuggestions: Array<{ bn: string; en: string }>
  feelingSuggestions: Array<{ bn: string; en: string }>
  aiGuidance: {
    relationshipContext: string
    greetingStyle: string
    closingStyle: string
    emotionalTone: string
    honorific: 'আপনি' | 'তুমি' | 'তুই'
    prohibitions: string[]
  }
}

export const RELATIONSHIP_PROMPT_CONFIGS: Record<Relationship, RelationshipPromptConfig> = {
  mother: {
    id: 'mother',
    title: 'মা / আম্মুর জন্য',
    titleEn: 'For Mother / Ammu',
    sectionTitle: 'আপনার মায়ের জন্য অনুভূতিগুলো লিখুন',
    sectionTitleEn: 'Write your feelings for your Mother',
    sectionSubtitle: 'মায়ের আত্মত্যাগ, স্নেহ আর আঁচলের গন্ধ মিশিয়ে লিখুন',
    sectionSubtitleEn: 'Pour your heart out honoring her unconditional love and sacrifices',
    memoryLabel: 'মায়ের স্মৃতি বা বিশেষ কথা',
    memoryLabelEn: 'Memory or special words with Mother',
    memoryPlaceholder: 'মায়ের কোনো স্মৃতি, কথা বা অনুভূতি লিখুন...',
    memoryPlaceholderEn: 'Share a cherished memory, conversation, or gratitude for Mother...',
    situationPlaceholder: 'বর্তমানে মা কোথায় আছেন বা কোনো বিশেষ উপলক্ষ থাকলে লিখুন...',
    situationPlaceholderEn: 'Current situation, distance, or special occasion with Mother...',
    feelingPlaceholder: 'মায়ের প্রতি আপনার গভীর ভালোবাসা বা শ্রদ্ধার কথা লিখুন...',
    feelingPlaceholderEn: 'Your deep love, reverence, or longing for Mother...',
    memorySuggestions: [
      {
        bn: 'শৈশবের সেই দিনগুলোর কথা মনে করে লিখুন',
        en: 'Reflecting on childhood days and Mother’s comforting presence',
      },
      {
        bn: 'মায়ের ত্যাগ ও ভালোবাসার জন্য কৃতজ্ঞতা প্রকাশ করুন',
        en: 'Expressing boundless gratitude for Mother’s lifelong sacrifices and love',
      },
      {
        bn: 'মায়ের প্রতি নিজের অনুভূতি প্রকাশ করুন',
        en: 'Expressing your deepest love and emotional truth to Mother',
      },
      {
        bn: 'অসুস্থতায় বিনিদ্র রজনী জেগে মাথায় হাত বুলিয়ে দেওয়ার সেই স্মৃতি',
        en: 'Remembering her sleepless nights comforting you during fever or sickness',
      },
    ],
    situationSuggestions: [
      {
        bn: 'দূরে প্রবাসে বা অন্য শহরে একলা বসে মায়ের হাতের রান্নার কথা মনে পড়ছে',
        en: 'Living far away in another city/country, missing the warmth of Mother’s cooking',
      },
      {
        bn: 'মায়ের জন্মদিনে বা মা দিবসে হৃদয় নিংড়ানো শ্রদ্ধা ও ভালোবাসা পাঠাতে চাই',
        en: 'Wishing Mother deepest respect and love on her birthday or Mother’s Day',
      },
      {
        bn: 'ব্যস্ততার কারণে প্রতিদিন খোঁজ নিতে না পারার মৃদু অপরাধবোধ থেকে লিখছি',
        en: 'Writing with tender guilt for not calling as often amid daily busy life',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'মা, তোমার আঁচলের চেয়ে নিরাপদ এই দুনিয়ায় আর কিছু নেই',
        en: 'Mother, nothing in this world is safer than your gentle embrace',
      },
      {
        bn: 'তোমার দোয়াই আমার জীবনের প্রতিটি পদক্ষেপে সব বাধা পার করার শক্তি',
        en: 'Your silent prayers are the strength behind every hurdle I cross',
      },
      {
        bn: 'মুখে ভালোবাসি বলা হয়ে ওঠে না, কিন্তু তুমিই আমার গোটা পৃথিবী',
        en: 'I seldom say it out loud, but you are my entire world',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is Mother (মা / আম্মু). Emphasize unconditional maternal warmth, selfless sacrifices, and lifelong devotion.',
      greetingStyle: 'Use reverent, deeply affectionate greetings (e.g. "শ্রদ্ধেয়া মা,", "মা আমার,", "আম্মু,"). NEVER use casual "প্রিয়" or romantic wording.',
      closingStyle: 'End with devoted, warm filial closing (e.g. "অফুরন্ত শ্রদ্ধা ও ভালোবাসাসহ, আপনার আদরের সন্তান", "ইতি, তোমার সন্তান").',
      emotionalTone: 'Tender, deeply moving, culturally respectful and inclusive.',
      honorific: 'আপনি',
      prohibitions: ['No romantic expressions like সবসময় তোমারই', 'No forced religious phrases like প্রণাম', 'No cold formal distance'],
    },
  },

  father: {
    id: 'father',
    title: 'বাবা / আব্বুর জন্য',
    titleEn: 'For Father / Abbu',
    sectionTitle: 'বাবার প্রতি গভীর শ্রদ্ধা ও অনুভূতি লিখুন',
    sectionTitleEn: 'Write your feelings and respect for your Father',
    sectionSubtitle: 'বাবার নীরব আত্মত্যাগ ও বটবৃক্ষের মতো আগলে রাখার স্মৃতি',
    sectionSubtitleEn: 'Honor his steadfast protection, quiet sacrifices, and guidance',
    memoryLabel: 'বাবার সাথে স্মৃতি বা শিক্ষা',
    memoryLabelEn: 'Memories, teachings, or struggles of Father',
    memoryPlaceholder: 'বাবার সাথে কাটানো কোনো বিশেষ মুহূর্ত বা তাঁর অবদানের কথা...',
    memoryPlaceholderEn: 'Share a poignant memory, life lesson, or unspoken gratitude for Father...',
    situationPlaceholder: 'বাবার প্রতি কৃতজ্ঞতা জানানোর উপলক্ষ বা বর্তমান পরিস্থিতি...',
    situationPlaceholderEn: 'Current situation, milestones, or reasons for writing to Father...',
    feelingPlaceholder: 'বাবার প্রতি শ্রদ্ধা, ভালোবাসা বা কৃতজ্ঞতার অনুভূতি...',
    feelingPlaceholderEn: 'Your deep respect, admiration, and love for Father...',
    memorySuggestions: [
      {
        bn: 'বাবার সংগ্রাম ও ত্যাগের কথা লিখুন',
        en: 'Recounting Father’s quiet struggles, hard work, and lifelong sacrifices',
      },
      {
        bn: 'বাবাকে ধন্যবাদ জানিয়ে একটি চিঠি লিখুন',
        en: 'Writing a letter of heartfelt thanks and profound reverence to Father',
      },
      {
        bn: 'শৈশবের বাবার স্মৃতি তুলে ধরুন',
        en: 'Recalling childhood memories of holding Father’s hand and feeling fearless',
      },
      {
        bn: 'জীবনের প্রতিটি পদক্ষেপে বাবার সততা ও আদর্শের শিক্ষা স্মরণ করা',
        en: 'Reflecting on Father’s principles, honesty, and values guiding life',
      },
    ],
    situationSuggestions: [
      {
        bn: 'আজ বাবার বিশেষ দিনে বা জন্মদিনে অন্তরের গভীর শ্রদ্ধা জানাতে চাই',
        en: 'Honoring Father on his birthday or milestone with deep reverence',
      },
      {
        bn: 'নিজের পায়ে দাঁড়িয়ে আজ উপলব্ধি করছি বাবা আমাদের জন্য কী পরিমাণ কষ্ট করেছেন',
        en: 'Standing on my own feet today, truly realizing the weight of his sacrifices',
      },
      {
        bn: 'মুখে হয়তো কখনো ভালোবাসি বলা হয়নি, কিন্তু মনে মনে তিনিই আমার অনুপ্রেরণা',
        en: 'Never voiced it aloud, but Father has always been my silent hero',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'মুখে বলা হয়নি কখনো, কিন্তু মনে মনে আপনিই আমার জীবনের সবচেয়ে বড় শক্তি',
        en: 'Never spoken aloud, but you are the greatest anchor and strength of my life',
      },
      {
        bn: 'আপনার সন্তান হিসেবে পৃথিবীতে পরিচয় দিতে পারার অপরিসীম গর্ব ও শ্রদ্ধা',
        en: 'Immense pride and reverent gratitude for being recognized as your child',
      },
      {
        bn: 'জীবনের শেষ দিন পর্যন্ত আপনার মুখ উজ্জ্বল করে বাঁচতে চাই',
        en: 'A lifelong commitment to live with honor and make you proud',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is Father (বাবা / আব্বু). Dignified, silent protector, life mentor, unspoken mutual affection.',
      greetingStyle: 'Use respectful greetings (e.g. "শ্রদ্ধেয় বাবা,", "শ্রদ্ধেয় আব্বু,", "বাবা,"). Always use "আপনি". NEVER use casual "প্রিয়".',
      closingStyle: 'End with respectful filial sign-off (e.g. "বিনম্র শ্রদ্ধা ও ভালোবাসাসহ, আপনার সন্তান", "আপনারই স্নেহের ছায়ায় বেড়ে ওঠা সন্তান").',
      emotionalTone: 'Deeply respectful, dignified, emotionally profound without being overly theatrical.',
      honorific: 'আপনি',
      prohibitions: ['No romantic idioms', 'No casual "তুমি" unless specified by user', 'No forced religious phrases like প্রণাম'],
    },
  },

  lover: {
    id: 'lover',
    title: 'প্রেমিক / প্রেমিকার জন্য',
    titleEn: 'For Lover / Partner',
    sectionTitle: 'ভালোবাসার মানুষের জন্য অনুভূতিগুলো লিখুন',
    sectionTitleEn: 'Write your feelings for your Lover / Partner',
    sectionSubtitle: 'হৃদয়ের গভীর অনুকম্পা, আবেগ আর নিবিড় ভালোবাসার প্রকাশ',
    sectionSubtitleEn: 'Express romantic devotion, intimate tenderness, and quiet heartbeats',
    memoryLabel: 'ভালোবাসার মধুর স্মৃতি বা বিশেষ মুহূর্ত',
    memoryLabelEn: 'Romantic memories, moments, or unspoken feelings',
    memoryPlaceholder: 'ভালোবাসার কোনো স্মৃতি, ভালোলাগা বা অনুভূতি লিখুন...',
    memoryPlaceholderEn: 'Share an intimate memory, quiet glance, or sweet confession...',
    situationPlaceholder: 'সম্পর্কের বর্তমান পরিস্থিতি, দূরত্ব বা বিশেষ কোনো কথা...',
    situationPlaceholderEn: 'Current situation, distance, or romantic milestone...',
    feelingPlaceholder: 'হৃদয়ের তীব্র প্রেম বা অনুরাগের অনুভূতি...',
    feelingPlaceholderEn: 'Your deep devotion, passion, or longing...',
    memorySuggestions: [
      {
        bn: 'ভালোবাসার অনুভূতি প্রকাশ করুন',
        en: 'Expressing unfiltered emotional devotion and romantic affection',
      },
      {
        bn: 'সম্পর্কের বিশেষ মুহূর্ত লিখুন',
        en: 'Writing about a special shared moment, conversation, or date',
      },
      {
        bn: 'ক্ষমা বা কৃতজ্ঞতার কথা জানান',
        en: 'Offering a tender apology, clearing misunderstandings, or thanking them',
      },
      {
        bn: 'বৃষ্টিভেজা বিকেলে এক ছাতার নিচে একসাথে পথচলার সেই মুহূর্ত',
        en: 'That unforgettable rainy afternoon walking close under a single umbrella',
      },
    ],
    situationSuggestions: [
      {
        bn: 'দূরে থাকলেও প্রতি প্রহরে তোমার উপস্থিতি আমার নিঃশ্বাসে অনুভব করি',
        en: 'Though miles apart, feeling your presence in every quiet heartbeat',
      },
      {
        bn: 'অভিমানের মেঘ কাটিয়ে আবার আগের মতো নিবিড় হতে চাই',
        en: 'Clearing the clouds of misunderstanding and longing to be close again',
      },
      {
        bn: 'আজ এই বিশেষ ক্ষণে আমার হৃদয় নিংড়ানো ভালোবাসা জানিয়ে রাখতে চাই',
        en: 'Sealing my heart’s unconditional love and devotion on this special day',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'আমার পুরোটা পৃথিবী জুড়ে কেবল তোমারই মায়াবী সুর ও অস্তিত্ব',
        en: 'My entire world resonates with your gentle laughter and presence',
      },
      {
        bn: 'প্রতিটি নিঃশ্বাসে শুধু তোমাকেই নতুন করে ভালোবাসার চিরন্তন অঙ্গীকার',
        en: 'A timeless promise to love you anew with every breath I take',
      },
      {
        bn: 'তোমার চোখের দিকে তাকালে পৃথিবীর সমস্ত ক্লান্তি মুছে যায়',
        en: 'Looking into your eyes makes every exhausting hardship fade away',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is Lover / Romantic Partner. Evoke deep romantic intimacy, poetic tenderness, and devotion.',
      greetingStyle: 'Use affectionate romantic greetings (e.g. "প্রিয়তম,", "প্রিয়তমা,", "আমার ভালোবাসা,").',
      closingStyle: 'End with romantic sign-off (e.g. "সবটুকু ভালোবাসায় তোমার,", "চিরদিনের মতো তোমারই,", "ইতি তোমার...").',
      emotionalTone: 'Intimate, poetic, tender, genuine devotion without cliché greeting-card language.',
      honorific: 'তুমি',
      prohibitions: ['No stiff corporate phrasing', 'No distant formal tone'],
    },
  },

  'husband-wife': {
    id: 'husband-wife',
    title: 'জীবনসঙ্গীর জন্য',
    titleEn: 'For Husband / Wife',
    sectionTitle: 'আপনার সঙ্গীর প্রতি ভালোবাসা প্রকাশ করুন',
    sectionTitleEn: 'Express your love for your life partner',
    sectionSubtitle: 'দাম্পত্য জীবনের নির্ভরতা, মায়া আর সুখ-দুঃখের স্মৃতি',
    sectionSubtitleEn: 'Honor domestic warmth, shared milestones, and steadfast companionship',
    memoryLabel: 'দাম্পত্য জীবনের সুন্দর মুহূর্ত বা স্মৃতি',
    memoryLabelEn: 'Cherished memories of marriage and companionship',
    memoryPlaceholder: 'দাম্পত্য জীবনের সুন্দর মুহূর্ত বা অনুভূতির কথা লিখুন...',
    memoryPlaceholderEn: 'Share a sweet everyday memory, quiet support, or marital milestone...',
    situationPlaceholder: 'বিবাহবার্ষিকী, বিশেষ দিন বা বর্তমান দাম্পত্য অনুভূতি...',
    situationPlaceholderEn: 'Anniversary, special day, or appreciation of daily companionship...',
    feelingPlaceholder: 'সঙ্গীর প্রতি অটুট বিশ্বাস, নির্ভরতা ও ভালোবাসার কথা...',
    feelingPlaceholderEn: 'Your deep appreciation, trust, and lasting love for your spouse...',
    memorySuggestions: [
      {
        bn: 'দাম্পত্য জীবনের সুন্দর স্মৃতি লিখুন',
        en: 'Writing about beautiful memories and milestones in married life',
      },
      {
        bn: 'সঙ্গীর প্রতি ভালোবাসা প্রকাশ করুন',
        en: 'Expressing enduring love, comfort, and appreciation for your spouse',
      },
      {
        bn: 'বিশেষ দিনের শুভেচ্ছা লিখুন',
        en: 'Writing loving wishes for an anniversary, birthday, or shared milestone',
      },
      {
        bn: 'জীবনের কঠিন দিনগুলোতে যখন সবাই দূরে ছিল, তুমি পাশে ঢাল হয়ে ছিলে',
        en: 'Remembering how you stood as my shield when life was hardest',
      },
    ],
    situationSuggestions: [
      {
        bn: 'আজ আমাদের বিবাহবার্ষিকীতে তোমার হাত ধরে আজীবন চলার অঙ্গীকার নবায়ন করছি',
        en: 'Renewing our lifelong vows and gratitude on our wedding anniversary',
      },
      {
        bn: 'সংসারের দৈনন্দিন কোলাহলে ভালোবাসি বলা হয় না, তাই এই নীরব চিঠি',
        en: 'Writing because busy domestic life rarely leaves time for whispered words',
      },
      {
        bn: 'উত্থান-পতনের প্রতিটি বাঁকে তুমি ছিলে বলেই আমি কখনো হেরে যাইনি',
        en: 'You were there through every high and low, which kept me standing tall',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'তোমার সাথে কাটানো প্রতিটি সাধারণ দিনও আমার কাছে পরম প্রাপ্তি',
        en: 'Every ordinary day spent by your side is a priceless blessing',
      },
      {
        bn: 'আমার জীবনের সমস্ত সাফল্যের পেছনে তোমার নীরব আত্মত্যাগ জড়িয়ে আছে',
        en: 'Your quiet patience and sacrifices form the backbone of all my achievements',
      },
      {
        bn: 'হাজার বছর বেঁচে থাকলেও তোমার পাশে এই জীবনটা ছোট মনে হবে',
        en: 'Even if I lived for centuries, a lifetime beside you would feel too short',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is Husband or Wife. Express deep domestic companionship, mutual devotion, and seasoned tenderness.',
      greetingStyle: 'Use affectionate spousal greetings (e.g. "আমার প্রিয়তম সাথী,", "প্রিয়,", "আমার জীবনের অর্ধাঙ্গ/অর্ধাঙ্গিনী,").',
      closingStyle: 'End with lifelong partner sign-off (e.g. "সবটুকু নির্ভরতায় তোমারই,", "আজীবন তোমার পাশে,", "ইতি তোমার জীবনসঙ্গী").',
      emotionalTone: 'Warm, grounded, deeply affectionate, serene marital security.',
      honorific: 'তুমি',
      prohibitions: ['No superficial teenage crush clichés', 'No cold distant language'],
    },
  },

  friend: {
    id: 'friend',
    title: 'বন্ধুর জন্য',
    titleEn: 'For Friend',
    sectionTitle: 'বন্ধুত্বের বিশেষ মুহূর্ত লিখুন',
    sectionTitleEn: 'Write about your special moments of friendship',
    sectionSubtitle: 'খাঁটি বন্ধুত্বের আড্ডা, খুনসুটি আর অকৃত্রিম নির্ভরতার স্মৃতি',
    sectionSubtitleEn: 'Celebrate laughter, tea-stall banter, loyalty, and lifelong bonding',
    memoryLabel: 'বন্ধুত্বের স্মৃতি বা আড্ডা',
    memoryLabelEn: 'Memories of friendship, banter, or companionship',
    memoryPlaceholder: 'বন্ধুত্বের কোনো স্মৃতি, আড্ডা বা অনুভূতির কথা লিখুন...',
    memoryPlaceholderEn: 'Share an unforgettable road trip, late-night conversation, or shared laughter...',
    situationPlaceholder: 'বন্ধুর জন্মদিন, অনেকদিন পর যোগাযোগ বা বর্তমান অনুভূতি...',
    situationPlaceholderEn: 'Friend’s birthday, reconnecting, or checking in on each other...',
    feelingPlaceholder: 'বন্ধুর প্রতি কৃতজ্ঞতা বা অটুট বন্ধুত্বের অনুভূতি...',
    feelingPlaceholderEn: 'Gratitude, camaraderie, or warmth for your true friend...',
    memorySuggestions: [
      {
        bn: 'বন্ধুত্বের স্মৃতি লিখুন',
        en: 'Writing about unforgettable memories of true friendship',
      },
      {
        bn: 'বন্ধুর প্রতি কৃতজ্ঞতা জানান',
        en: 'Thanking a friend for standing by your side in difficult times',
      },
      {
        bn: 'পুরনো দিনের কথা মনে করুন',
        en: 'Reminiscing about nostalgic school/college/university days and tea stall banter',
      },
      {
        bn: 'বৃষ্টির দিনে চায়ের দোকানে ঘণ্টার পর ঘণ্টা জীবনের গল্প করা',
        en: 'Hours of endless storytelling over steaming tea on pouring rainy afternoons',
      },
    ],
    situationSuggestions: [
      {
        bn: 'অনেক দিন দেখা হয় না, কিন্তু মনের টান আগের মতোই খাঁটি আছে',
        en: 'Haven’t met in a long time, but our bond remains vibrant and true',
      },
      {
        bn: 'তোর জন্মদিনে হৃদয় নিংড়ানো অভিনন্দন আর একরাশ শুভকামনা',
        en: 'Wishing you overflowing happiness and triumph on your birthday',
      },
      {
        bn: 'ব্যস্ততার ভিড়ে তোকে খুব মনে পড়ে, একদিন আগের মতো বসে আড্ডা দেওয়া দরকার',
        en: 'Missing you amid life’s hustle; we must sit down for a long chat soon',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'তোর মতো একজন খাঁটি বন্ধু পাওয়া আমার জীবনের সেরা পাওয়া',
        en: 'Having a steadfast, genuine friend like you is life’s greatest treasure',
      },
      {
        bn: 'দূরত্ব বা সময়ের ব্যবধান আমাদের বন্ধুত্বের গভীরতা কখনো কমাতে পারবে না',
        en: 'No distance or passing years can ever fade the colors of our friendship',
      },
      {
        bn: 'হাজারটা সম্পর্কের ভিড়ে তুই একমাত্র মানুষ যার কাছে কোনো মুখোশ লাগে না',
        en: 'Among a thousand faces, you are the one person with whom I need no masks',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is a close Friend. Casual, candid, loyal, authentic warmth with zero artificial formality.',
      greetingStyle: 'Use natural friend greetings (e.g. "দোস্ত,", "বন্ধু আমার,", "প্রিয় বন্ধু,").',
      closingStyle: 'End with affectionate friendly sign-off (e.g. "তোরই দোস্ত,", "সবসময়ের মতো তোর পাশে,", "ইতি তোর বন্ধু").',
      emotionalTone: 'Authentic, candid, warm banter, unpretentious loyalty.',
      honorific: 'তুই',
      prohibitions: ['No stiff formal language', 'No overly romantic declarations'],
    },
  },

  'best-friend': {
    id: 'best-friend',
    title: 'প্রিয় বন্ধুর জন্য',
    titleEn: 'For Best Friend',
    sectionTitle: 'প্রিয় বন্ধুর সাথে মনের কথা লিখুন',
    sectionTitleEn: 'Pour your heart out to your Best Friend',
    sectionSubtitle: 'যার কাছে মনের সব কথা বলা যায়, সেই আত্মার আত্মীয়ের চিঠি',
    sectionSubtitleEn: 'To the confidant who knows your secrets, flaws, and triumphs',
    memoryLabel: 'প্রিয় বন্ধুর সাথে না-বলা কথা বা স্মৃতি',
    memoryLabelEn: 'Unspoken words and shared moments with Best Friend',
    memoryPlaceholder: 'যে কথা কাউকে বলা হয়নি, প্রিয় বন্ধুকে লিখুন...',
    memoryPlaceholderEn: 'Share an untold secret, a hilarious misadventure, or a moment of crisis...',
    situationPlaceholder: 'বর্তমান দূরত্ব, জীবনের নতুন মোড় বা বিশেষ উপলক্ষ...',
    situationPlaceholderEn: 'Current life milestones, distance, or a spontaneous heartfelt note...',
    feelingPlaceholder: 'জীবনের শ্রেষ্ঠ বন্ধুর প্রতি কৃতজ্ঞতা ও ভালোবাসা...',
    feelingPlaceholderEn: 'Your deep appreciation for having a soulmate friend...',
    memorySuggestions: [
      {
        bn: 'বন্ধুত্বের না-বলা কথাগুলো লিখুন',
        en: 'Sharing the unspoken truths and gratitude that you rarely say aloud',
      },
      {
        bn: 'কঠিন সময়ে পাশে থাকার জন্য ধন্যবাদ জানান',
        en: 'Thanking them for holding you together when your world was falling apart',
      },
      {
        bn: 'একসাথে কাটানো পাগলামি আর হাসির সোনালী দিন',
        en: 'Reliving wild adventures, silly jokes, and golden laughter',
      },
      {
        bn: 'রাত জেগে ঘণ্টার পর ঘণ্টা ভবিষ্যৎ ও স্বপ্নের গল্প করার সেই স্মৃতি',
        en: 'Staying up till dawn talking about dreams, anxieties, and the future',
      },
    ],
    situationSuggestions: [
      {
        bn: 'দুজনে ভিন্ন শহরে থাকলেও তোর কথা মনে পড়লে একাকিত্ব দূর হয়ে যায়',
        en: 'Even in different cities, thinking of you makes all loneliness dissolve',
      },
      {
        bn: 'জীবনের নতুন অধ্যায়ে পা রাখার মুহূর্তে তোকে সবচেয়ে বেশি পাশে প্রয়োজন',
        en: 'Stepping into a new chapter of life, missing your reassuring presence',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'বন্ধু অনেকেই হয়, কিন্তু তুই আমার জীবনের একটি অভিন্ন অংশ',
        en: 'Many come and go, but you are an inseparable piece of who I am',
      },
      {
        bn: 'ভুল করলেও যে কোনোদিন বিচার করে না, তুই আমার সেই পরম নিরাপদ আশ্রয়',
        en: 'You never judge my worst mistakes; you are my safe haven',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is Best Friend / Soul Confidant. Deep loyalty, mutual vulnerability, playful banter, unbreakable bond.',
      greetingStyle: 'Use intimate friendly greetings (e.g. "আমার প্রাণের বন্ধু,", "দোস্ত রে,", "প্রিয় বন্ধু,").',
      closingStyle: 'End with devoted friendship sign-off (e.g. "আজীবন তোর পাশে,", "তোরই পাগলা দোস্ত,", "ইতি তোর বন্ধু").',
      emotionalTone: 'Deeply bonded, vibrant, emotionally rich and loyal.',
      honorific: 'তুই',
      prohibitions: ['No sterile polite barriers'],
    },
  },

  mentor: {
    id: 'mentor',
    title: 'শিক্ষক / মেন্টরের জন্য',
    titleEn: 'For Teacher / Mentor',
    sectionTitle: 'আপনার শিক্ষকের প্রতি কৃতজ্ঞতা লিখুন',
    sectionTitleEn: 'Express your gratitude to your Teacher / Mentor',
    sectionSubtitle: 'শিক্ষকের দিকনির্দেশনা, নীতিশিক্ষা ও জীবনে অবদানের প্রতি শ্রদ্ধা',
    sectionSubtitleEn: 'Honor their wisdom, inspirational guidance, and life-changing impact',
    memoryLabel: 'শিক্ষকের অবদান বা স্মৃতি',
    memoryLabelEn: 'Teachings, memories, or turning points under their guidance',
    memoryPlaceholder: 'শিক্ষকের কাছ থেকে পাওয়া কোনো শিক্ষা, অবদান বা স্মৃতি লিখুন...',
    memoryPlaceholderEn: 'Describe how their guidance shaped your character, career, or outlook...',
    situationPlaceholder: 'শিক্ষক দিবস, নিজের সাফল্য অর্জন বা শ্রদ্ধা জানানোর উপলক্ষ...',
    situationPlaceholderEn: 'Teacher’s Day, a personal milestone achieved, or a letter of reverence...',
    feelingPlaceholder: 'শিক্ষকের প্রতি বিনম্র শ্রদ্ধা, ভক্তি ও চিরন্তন কৃতজ্ঞতা...',
    feelingPlaceholderEn: 'Humble reverence, respect, and enduring gratitude...',
    memorySuggestions: [
      {
        bn: 'শিক্ষকের অবদানের কথা লিখুন',
        en: 'Recalling how their teachings laid the foundation of your character and success',
      },
      {
        bn: 'কৃতজ্ঞতার চিঠি লিখুন',
        en: 'Writing an earnest letter of lifelong gratitude and deep intellectual respect',
      },
      {
        bn: 'জীবনে প্রভাবের কথা জানান',
        en: 'Explaining the specific turning point where their counsel guided your path',
      },
      {
        bn: 'আমার সামর্থ্যের ওপর আপনার অটল আস্থা ও আত্মবিশ্বাস জাগিয়ে তোলা',
        en: 'Remembering when you believed in me when I had lost faith in myself',
      },
    ],
    situationSuggestions: [
      {
        bn: 'আজকের এই অবস্থানে পৌঁছানোর পেছনে আপনার ভূমিকা অনস্বীকার্য',
        en: 'Where I stand today is built upon the pillars of your guidance and sacrifices',
      },
      {
        bn: 'শিক্ষক দিবসে অথবা এই বিশেষ মুহূর্তে আপনাকে হৃদয় নিংড়ানো বিনম্র শ্রদ্ধা জানাতে চাই',
        en: 'Offering my deepest reverence and heartfelt respect on this special occasion',
      },
      {
        bn: 'জীবনের বহু বছর পার হয়ে গেলেও ক্লাসরুমের সেই কথাগুলো আজও আমার অনুপ্রেরণা',
        en: 'Though years have passed, your classroom wisdom still echoes in my daily choices',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'আপনার নিঃস্বার্থ শিক্ষাদান ও অনুপ্রেরণার প্রতি আমার আজীবন বিনম্র শ্রদ্ধা',
        en: 'Enduring respect and reverence for your selfless teaching and dedication',
      },
      {
        bn: 'দিকভ্রান্ত মুহূর্তে সঠিক পথের সন্ধান দিয়ে আপনি আমাকে নতুন জীবন দিয়েছেন',
        en: 'By illuminating the right path in my darkest hour, you gifted me a new life',
      },
      {
        bn: 'আপনার আশীর্বাদ ও দোয়াই আমার জীবনের সবচেয়ে বড় সম্পদ',
        en: 'Your blessings remain the most sacred asset of my life',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is a revered Teacher / Mentor. Deeply respectful, intellectual reverence, acknowledging lifelong impact.',
      greetingStyle: 'Use respectful formal greetings (e.g. "শ্রদ্ধেয় স্যার,", "শ্রদ্ধেয়া ম্যাডাম,", "শ্রদ্ধেয় শিক্ষক,"). ALWAYS address with "আপনি".',
      closingStyle: 'End with humble respectful sign-off (e.g. "বিনম্র শ্রদ্ধা ও কৃতজ্ঞতাসহ, আপনার ছাত্র/ছাত্রী", "ইতি, আপনার স্নেহধন্য শিক্ষার্থী").',
      emotionalTone: 'Dignified, articulate, deeply reverent, polished and sincere.',
      honorific: 'আপনি',
      prohibitions: ['Never use casual "তুমি" or "তুই"', 'Never use romantic phrasing', 'Never sound robotic'],
    },
  },

  'lost-person': {
    id: 'lost-person',
    title: 'স্মৃতির মানুষের জন্য',
    titleEn: 'For Someone I Miss (In Loving Memory)',
    sectionTitle: 'স্মৃতির মানুষের জন্য ভালোবাসার কথা লিখুন',
    sectionTitleEn: 'Write your feelings for someone you miss deeply',
    sectionSubtitle: 'যিনি আজ আর পাশে নেই, স্মৃতির ওপারে থাকা চিরচেনা কাউকে নিয়ে চিঠি',
    sectionSubtitleEn: 'For someone who passed away, moved away permanently, or is no longer present',
    memoryLabel: 'তার স্মৃতি বা অপূর্ণ কথা',
    memoryLabelEn: 'Memories, departed presence, or unspoken words',
    memoryPlaceholder: 'যিনি আজ আর পাশে নেই, তাকে মনে করে অপূর্ণ কথাগুলো লিখুন...',
    memoryPlaceholderEn: 'Write what remained unsaid to someone who has passed away or departed forever...',
    situationPlaceholder: 'স্মৃতির দিন, মৃত্যুবার্ষিকী বা হঠাৎ তীব্র শূন্যতা অনুভব করার প্রেক্ষাপট...',
    situationPlaceholderEn: 'Death anniversary, a sudden wave of grief, or quiet late-night remembrance...',
    feelingPlaceholder: 'অনুপস্থিতির তীব্র শূন্যতা, ভালোবাসা ও স্মৃতির নীরব দীর্ঘশ্বাস...',
    feelingPlaceholderEn: 'Bittersweet ache, quiet tears, eternal love, and peaceful prayers...',
    memorySuggestions: [
      {
        bn: 'তাকে মনে করে নিজের অনুভূতি লিখুন',
        en: 'Writing your poignant feelings in memory of someone no longer here',
      },
      {
        bn: 'পুরনো স্মৃতি তুলে ধরুন',
        en: 'Recalling a sacred shared memory, their voice, or gentle smile',
      },
      {
        bn: 'অপূর্ণ কথাগুলো প্রকাশ করুন',
        en: 'Pouring out the unfinished confessions and words left unspoken in time',
      },
      {
        bn: 'হঠাৎ পুরোনো কোনো ছবি বা স্মৃতিচিহ্ন দেখে বুকের ভেতরের হাহাকার',
        en: 'Finding an old faded photograph and feeling the immense ache of absence',
      },
    ],
    situationSuggestions: [
      {
        bn: 'আজকের এই বিশেষ দিনে আপনার না-থাকার শূন্যতা বুকের ভেতর তীব্রভাবে বাজছে',
        en: 'On this day, the silence of your physical absence aches deeply in my chest',
      },
      {
        bn: 'আপনি হয়তো পরপারের শান্তির দেশে আছেন, কিন্তু আমাদের স্মৃতিরা আজও জীবন্ত',
        en: 'You may dwell in the peaceful beyond, but our memories breathe beside me',
      },
      {
        bn: 'কোনো অভিযোগ নেই নিয়তির কাছে, শুধু দূর থেকে আপনার আত্মার শান্তি কামনা করি',
        en: 'No anger at fate, only quiet prayers for the eternal peace of your soul',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'আপনি নেই, তবুও প্রতিটি নিঃশ্বাসে আপনার উপস্থিতি নীরব ছায়ার মতো মিশে আছে',
        en: 'You are gone, yet your essence lingers like a gentle, protective shadow',
      },
      {
        bn: 'জীবনের শেষ দিন পর্যন্ত আপনার স্মৃতিকে বুকে আগলে রাখব',
        en: 'I will hold your memory close to my heart until my very last breath',
      },
      {
        bn: 'যেখানে থাকুন, ভালো থাকুন—স্মৃতির ওপার থেকে এই আমার নীরব প্রার্থনা',
        en: 'Wherever your soul rests in peace, know that you are forever cherished',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is Someone Who Passed Away or Permanently Departed (🕊️ স্মৃতির মানুষ / Someone I Miss). TONE MUST BE POIGNANT, REVERENT REMEMBRANCE, NOT AN ACTIVE CONVERSATION EXPECTING A REPLY.',
      greetingStyle: 'Use tender, bittersweet, nostalgic greetings (e.g. "স্মৃতির ওপারে থাকা আমার প্রিয় মানুষটিকে,", "শ্রদ্ধেয়...,", "যে মানুষটি আজ শুধুই স্মৃতি,").',
      closingStyle: 'End with peaceful, reverent, loving remembrance sign-off (e.g. "স্মৃতির ওপারে চিরকালের ভালোবাসায়,", "আপনার আত্মার চিরশান্তি কামনায়,", "দূর থেকে নীরব প্রার্থনায়, আপনারই একজন").',
      emotionalTone: 'Solemn, bittersweet, poetic, deeply touching, devoid of bitterness, filled with honor and quiet longing.',
      honorific: 'তুমি',
      prohibitions: ['DO NOT write as if the recipient will call back or write back in ordinary life (চিঠির উত্তর আশা করা নিষিদ্ধ)', 'No angry accusations against fate', 'No crude death references'],
    },
  },

  'lost-connection': {
    id: 'lost-connection',
    title: 'হারিয়ে যাওয়া যোগাযোগের জন্য',
    titleEn: 'For Lost Connection',
    sectionTitle: 'হারিয়ে যাওয়া যোগাযোগের কথা ও অনুভূতি লিখুন',
    sectionTitleEn: 'Write to someone you lost touch with',
    sectionSubtitle: 'সময়ের স্রোতে যোগাযোগ থেমে গেলেও যার কথা আজও মনে পড়ে',
    sectionSubtitleEn: 'For someone alive where communication stopped, seeking reconciliation or closure',
    memoryLabel: 'ফেলে আসা সম্পর্কের স্মৃতি বা শেষ দেখার কথা',
    memoryLabelEn: 'Memories of when you were close and how silence grew',
    memoryPlaceholder: 'যার সাথে যোগাযোগ থেমে গেছে, তাকে উদ্দেশ্য করে লিখুন...',
    memoryPlaceholderEn: 'Write to someone you drifted away from, expressing fond memories and curiosity...',
    situationPlaceholder: 'বহু বছর পর খোঁজ নেওয়া, ভুল বোঝাবুঝি দূর করা বা শুভেচ্ছা জানানো...',
    situationPlaceholderEn: 'Reaching out after years of silence, hoping they are well, seeking reconnection...',
    feelingPlaceholder: 'সময়ের দূরত্বের মাঝেও অমলিন শ্রদ্ধা, টান বা শুভকামনা...',
    feelingPlaceholderEn: 'Nostalgic warmth, sincere curiosity about their life, no bitterness...',
    memorySuggestions: [
      {
        bn: 'অনেকদিন পর যোগাযোগ করার অনুভূতি লিখুন',
        en: 'Writing about the strange, tender hesitation of reaching out after years of silence',
      },
      {
        bn: 'পুরনো সম্পর্ক পুনরুদ্ধারের কথা লিখুন',
        en: 'Expressing a desire to rebuild bridges and catch up on lost time',
      },
      {
        bn: 'হারানো যোগাযোগের জন্য অনুভূতি প্রকাশ করুন',
        en: 'Reflecting on how time and circumstances silently drifted two people apart',
      },
      {
        bn: 'একদিন যে মানুষটির সাথে কথা না বলে দিন কাটত না, আজ তার কোনো খবর জানি না',
        en: 'Remembering when you talked every day, contrasting with today’s silence',
      },
    ],
    situationSuggestions: [
      {
        bn: 'হঠাৎ পুরোনো কোনো ডায়েরি বা বার্তা দেখে তোমার কথা খুব মনে পড়ে গেল',
        en: 'Stumbling upon an old note or message, suddenly flooded by your memory',
      },
      {
        bn: 'জানি না কেমন আছো বা কোথায় আছো, শুধু আশা করি জীবন তোমাকে সুন্দর রেখেছে',
        en: 'Don’t know where life took you, only hoping you are thriving and happy',
      },
      {
        bn: 'যদি সময় পাও, পুরোনো দিনের স্মৃতি নিয়ে একবার হলেও উত্তর দিও',
        en: 'If you ever find a moment, drop a few words just like old times',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'আমাদের যোগাযোগ থেমে গেছে ঠিকই, কিন্তু তোমার প্রতি শ্রদ্ধা ও টান আজও অমলিন',
        en: 'Our communication stopped, but my respect and fond affection remain untouched',
      },
      {
        bn: 'কোনো অভিমান বা অভিযোগ নেই, শুধু জানতে ইচ্ছে করে তুমি কেমন আছো',
        en: 'No resentment or grudges, only a sincere wish to know how life treats you',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is Someone where communication ceased over time, but they may still exist (📩 হারিয়ে যাওয়া যোগাযোগ / Lost Connection). Bridge of reconciliation or gentle closure.',
      greetingStyle: 'Use tender, hesitant, thoughtful greetings (e.g. "বহুদিন পর প্রিয়...,", "হারিয়ে যাওয়া ঠিকানার মানুষটিকে,", "প্রিয়...").',
      closingStyle: 'End with gentle well-wishes (e.g. "যেখানেই থাকো, ভালো থেকো,", "পুরোনো দিনের স্মৃতিসহ,", "তোমার খবরের অপেক্ষায়...").',
      emotionalTone: 'Nostalgic, respectful, wondering, zero hostility, gentle desire to reconnect or leave a peaceful footprint.',
      honorific: 'তুমি',
      prohibitions: ['Do not assume they have died (that is lost-person)', 'No toxic guilt-tripping or anger'],
    },
  },

  'special-person': {
    id: 'special-person',
    title: 'বিশেষ কারও জন্য',
    titleEn: 'For Someone Special',
    sectionTitle: 'বিশেষ কাউকে উদ্দেশ্য করে নিজের মনের কথা লিখুন',
    sectionTitleEn: 'Write your feelings for someone special',
    sectionSubtitle: 'অনুচ্চারিত ভালোলাগা, মুগ্ধতা আর দূরবর্তী অনুরাগের প্রকাশ',
    sectionSubtitleEn: 'For unconfessed feelings, admired souls, or unique emotional connections',
    memoryLabel: 'তার সাথে কোনো মুহূর্ত বা ভালোলাগার কারণ',
    memoryLabelEn: 'Moments of admiration or reasons they hold a special place',
    memoryPlaceholder: 'যাকে না-বলা অনেক কথা বলতে চান, তার জন্য লিখুন...',
    memoryPlaceholderEn: 'Express subtle admiration, respect, and unspoken heartfelt thoughts...',
    situationPlaceholder: 'বিশেষ উপলক্ষ, দূর থেকে ভালো লাগা বা মনের কথা জানানোর কারণ...',
    situationPlaceholderEn: 'A special day, watching from afar, or taking courage to write...',
    feelingPlaceholder: 'হৃদয়ের অব্যক্ত মুগ্ধতা, সম্মান ও ভালোলাগার কথা...',
    feelingPlaceholderEn: 'Gentle admiration, reverence, and unspoken affection...',
    memorySuggestions: [
      {
        bn: 'বিশেষ কাউকে উদ্দেশ্য করে নিজের মনের কথা লিখুন',
        en: 'Writing your innermost heartfelt feelings to someone truly special',
      },
      {
        bn: 'কৃতজ্ঞতা বা ভালোবাসা প্রকাশ করুন',
        en: 'Expressing sincere gratitude, subtle warmth, or gentle admiration',
      },
      {
        bn: 'হৃদয়ের অব্যক্ত অনুভূতির কথা জানান',
        en: 'Revealing the feelings you have quietly nurtured without saying a word',
      },
      {
        bn: 'দূর থেকে তোমার মিষ্টি হাসিমুখ দেখে একলা ভালো লাগার অনুভূতি',
        en: 'Watching your gentle smile from afar, feeling silently happy inside',
      },
    ],
    situationSuggestions: [
      {
        bn: 'মুখে হয়তো কখনো বলতে পারব না, তাই চিঠির সাদা পাতায় সাহস করে লিখলাম',
        en: 'Might never say it in person, so finding courage on this white paper',
      },
      {
        bn: 'তোমার ভালো থাকা আর মুখের হাসিটুকুই আমার কাছে পরম স্বস্তি',
        en: 'Seeing you peaceful and smiling is all the comfort my heart seeks',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'প্রতিদিনের ভাবনায় যে মানুষটির উপস্থিতি জড়িয়ে থাকে, তুমিই সেই বিশেষ কেউ',
        en: 'The person who walks through my quiet thoughts every single day is you',
      },
      {
        bn: 'কোনো পাওয়ার প্রত্যাশা নেই, কেবল তোমার সুন্দর জীবন কামনা করি',
        en: 'No expectations of returns, just an honest prayer for your beautiful life',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is Someone Special (বিশেষ কেউ). Delicate emotional boundary, subtle courage, unexpressed admiration, pure intentions.',
      greetingStyle: 'Use gentle, respectful greetings (e.g. "আমার ভাবনার বিশেষ মানুষটিকে,", "প্রিয় বিশেষ কেউ,", "প্রিয়...").',
      closingStyle: 'End with respectful, warm sign-off (e.g. "নীরব শুভকামনায়,", "তোমার ভালো থাকার প্রার্থনায়,", "ইতি একজন শুভাকাঙ্ক্ষী").',
      emotionalTone: 'Gentle, pure, respectful, emotionally captivating without crossing boundaries.',
      honorific: 'তুমি',
      prohibitions: ['No intrusive stalking or boundary crossing', 'No overly possessive demands'],
    },
  },

  sibling: {
    id: 'sibling',
    title: 'ভাই / বোনের জন্য',
    titleEn: 'For Brother / Sister',
    sectionTitle: 'ভাই বা বোনের প্রতি অনুভূতি ও স্মৃতি লিখুন',
    sectionTitleEn: 'Write your feelings and memories for your Sibling',
    sectionSubtitle: 'শৈশবের খুনসুটি, মায়া আর আজন্ম নির্ভরতার বন্ধন',
    sectionSubtitleEn: 'Celebrate shared childhood, silly fights, protective warmth, and lifelong love',
    memoryLabel: 'শৈশবের খুনসুটি বা যৌথ স্মৃতি',
    memoryLabelEn: 'Childhood antics, inside jokes, or shared moments',
    memoryPlaceholder: 'শৈশবের খুনসুটি, মায়া ও নির্ভরতার স্মৃতি লিখুন...',
    memoryPlaceholderEn: 'Share childhood mischief, saving each other from scolding, or growing up...',
    situationPlaceholder: 'ভাই/বোনের জন্মদিন, বিয়ে, দূরে থাকা বা বিশেষ উপলক্ষ...',
    situationPlaceholderEn: 'Birthday, wedding, living apart, or wishing them strength...',
    feelingPlaceholder: 'ভাই/বোনের প্রতি গভীর ভালোবাসা, স্নেহ ও নির্ভরতা...',
    feelingPlaceholderEn: 'Unbreakable sibling loyalty, protective affection, and pride...',
    memorySuggestions: [
      {
        bn: 'শৈশবের খুনসুটি ও আড্ডার কথা লিখুন',
        en: 'Writing about childhood fights followed immediately by sharing treats',
      },
      {
        bn: 'ভাই/বোনের প্রতি ভালোবাসা ও শুভকামনা জানান',
        en: 'Expressing enduring affection and heartfelt blessings for their future',
      },
      {
        bn: 'কঠিন সময়ে পাশে থাকার কৃতজ্ঞতা প্রকাশ করুন',
        en: 'Thanking them for standing by you as a shield in family challenges',
      },
      {
        bn: 'এক ছাদের নিচে বড় হয়ে ওঠার হাসিকান্নার অমূল্য দিনগুলো',
        en: 'Golden memories of laughing and growing up under the same roof',
      },
    ],
    situationSuggestions: [
      {
        bn: 'আজ তোর বিশেষ দিনে অনেক অনেক ভালোবাসা আর শুভকামনা পাঠাচ্ছি',
        en: 'Sending overflowing love and congratulations on your milestone today',
      },
      {
        bn: 'এখন যে যার মতো দূরে থাকি, কিন্তু তোর কথা মনে পড়লে শৈশবে ফিরে যাই',
        en: 'Living far apart now, but thinking of you always transports me back home',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'যতই খুনসুটি হোক, তোর প্রতি আমার রক্তের টান আর স্নেহ চিরন্তন',
        en: 'Beyond all our teasing, my love and protective warmth for you are eternal',
      },
      {
        bn: 'জীবনের প্রতিটি পদক্ষেপে সবসময় তোর পাশে ছায়ার মতো আছি ও থাকব',
        en: 'I will stand steadfastly by your side through every chapter of life',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is Sibling (ভাই / বোন). Playful, affectionate, shared childhood roots, protective loyalty.',
      greetingStyle: 'Use affectionate sibling greetings (e.g. "স্নেহের ছোট ভাই/বোন,", "প্রিয় ভাইয়া/আপু,").',
      closingStyle: 'End with loving sibling sign-off (e.g. "তোরই ভাই/বোন,", "সবসময়ের মতো পাশে আছি,", "অনেক ভালোবাসা রইল").',
      emotionalTone: 'Warm, authentic, playful, deeply loyal.',
      honorific: 'তুমি',
      prohibitions: ['No romantic expressions'],
    },
  },

  'first-love': {
    id: 'first-love',
    title: 'প্রথম ভালোবাসার জন্য',
    titleEn: 'For First Love',
    sectionTitle: 'প্রথম ভালোবাসার নিষ্পাপ স্মৃতি লিখুন',
    sectionTitleEn: 'Write about your first love memories',
    sectionSubtitle: 'কৈশোরের প্রথম স্পন্দন, মিষ্টি লজ্জা আর স্মৃতির মিষ্টি দীর্ঘশ্বাস',
    sectionSubtitleEn: 'Capture the innocent aches, first fluttering heartbeats, and nostalgic pauses',
    memoryLabel: 'প্রথম দেখার মুহূর্ত বা কৈশোরের স্মৃতি',
    memoryLabelEn: 'First encounter, stolen glances, or teenage innocence',
    memoryPlaceholder: 'কৈশোরের সেই প্রথম ভালোলাগা ও স্মৃতির কথা লিখুন...',
    memoryPlaceholderEn: 'Share that breathless first glance, school gate memory, or innocent conversation...',
    situationPlaceholder: 'অনেক বছর পর স্মৃতিচারণ, জীবনের পরিণতি বা শুভকামনা...',
    situationPlaceholderEn: 'Looking back after years, peaceful reflection, wishing them well...',
    feelingPlaceholder: 'প্রথম প্রেমের নিষ্পাপ সৌন্দর্য ও স্মৃতিকাতরতা...',
    feelingPlaceholderEn: 'Pure nostalgia, tender ache, and sacred memory without bitterness...',
    memorySuggestions: [
      {
        bn: 'প্রথম দেখার সেই মিষ্টি কম্পনের কথা লিখুন',
        en: 'Describing the breathtaking flutter the very first time your eyes met',
      },
      {
        bn: 'কৈশোরের নিষ্পাপ ভালোলাগার স্মৃতি স্মরণ করুন',
        en: 'Remembering stolen glances and sweet innocence that time could never erase',
      },
      {
        bn: 'স্মৃতির ওপারে থাকা মানুষটিকে শুভকামনা জানান',
        en: 'Sending peaceful well-wishes to the person who first taught your heart to love',
      },
    ],
    situationSuggestions: [
      {
        bn: 'জীবন হয়তো দুজন দুদিকে নিয়ে গেছে, কিন্তু প্রথম প্রেমের পবিত্রতা আজও অক্ষত',
        en: 'Life led us in different directions, but the sacred memory of first love remains untouched',
      },
      {
        bn: 'বৃষ্টিভেজা বিকেলে হঠাৎ সেই পুরোনো গানটা শুনে তোমার কথা মনে পড়ে গেল',
        en: 'Hearing that old song on a rainy afternoon brought your silhouette back into view',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'তুমি ছিলে আমার জীবনের প্রথম বসন্তের সবচেয়ে স্নিগ্ধ অনুভূতি',
        en: 'You were the gentlest bloom of my heart’s very first spring',
      },
      {
        bn: 'কোনো পাওয়ার দাবি নেই, শুধু দূর থেকে তোমার শান্তিময় জীবন কামনা করি',
        en: 'No claim on your present, only silent gratitude that you were once my world',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is First Love. Pure, innocent, nostalgic ache, honoring the golden past without intruding on the present.',
      greetingStyle: 'Use nostalgic, tender greetings (e.g. "প্রথম প্রেমের সেই মানুষটিকে,", "যে নাম আজও হৃদয়ে বাজে,", "প্রিয়...").',
      closingStyle: 'End with nostalgic gentle sign-off (e.g. "প্রথম ভালোবাসার স্মৃতিতে,", "স্মৃতির ওপার থেকে শুভকামনায়,", "ইতি তোমার অতীত").',
      emotionalTone: 'Lyrical, wistful, tender, respectful closure.',
      honorific: 'তুমি',
      prohibitions: ['No inappropriate intrusion into their current marriage or relationship'],
    },
  },

  family: {
    id: 'family',
    title: 'পরিবারের মানুষের জন্য',
    titleEn: 'For Family Member',
    sectionTitle: 'পরিবারের প্রিয়জনের জন্য অনুভূতি লিখুন',
    sectionTitleEn: 'Write your feelings for your Family Member',
    sectionSubtitle: 'রক্তের টান, পারিবারিক স্মৃতি আর মায়ার পরশ',
    sectionSubtitleEn: 'Honor family roots, protective warmth, and unconditional bloodline ties',
    memoryLabel: 'পারিবারিক কোনো স্মৃতি বা স্নেহভরা কথা',
    memoryLabelEn: 'Family gathering memories, elders’ blessings, or shared roots',
    memoryPlaceholder: 'পারিবারিক মায়া, টান ও শুভকামনার কথা লিখুন...',
    memoryPlaceholderEn: 'Share a family holiday, childhood village memory, or affectionate message...',
    situationPlaceholder: 'পারিবারিক কোনো উৎসব, সুস্থতা কামনা বা বিশেষ দিন...',
    situationPlaceholderEn: 'Family festival, health well-wishes, or keeping in touch across distance...',
    feelingPlaceholder: 'পারিবারিক স্নেহ, ভালোবাসা ও নির্ভরতার অনুভূতি...',
    feelingPlaceholderEn: 'Familial loyalty, respect, and enduring kinship...',
    memorySuggestions: [
      {
        bn: 'পারিবারিক স্নেহ ও ভালোবাসার কথা লিখুন',
        en: 'Writing about familial affection, roots, and growing up together',
      },
      {
        bn: 'সুস্থতা ও মঙ্গল কামনা করে শুভবার্তা পাঠান',
        en: 'Sending prayers and heartfelt wishes for good health and prosperity',
      },
      {
        bn: 'একসাথে কাটানো স্মৃতি স্মরণ করুন',
        en: 'Recalling memorable family Eid/Puja gatherings, laughter, and meals',
      },
    ],
    situationSuggestions: [
      {
        bn: 'দূরে থাকলেও পরিবারের প্রতিটি মানুষের জন্য মন সবসময় কাঁদে',
        en: 'Living far away, but my thoughts and heart are always anchored at home',
      },
      {
        bn: 'পরিবারের কঠিন দিনে আপনার বাড়িয়ে দেওয়া হাতের কথা আজও মনে পড়ে',
        en: 'Never forgetting how you extended your helping hand when our family needed it most',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'রক্তের সম্পর্ক শুধু নামে নয়, আত্মার গভীর টানে আজীবন বেঁচে থাকে',
        en: 'Family ties are not mere names; they live forever in the depths of our souls',
      },
      {
        bn: 'সবসময় আপনার সুস্থতা আর দীর্ঘায়ুর জন্য দোয়া করি',
        en: 'Always praying for your vibrant health, peace, and long life',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is a Family Member (relative, uncle, aunt, cousin). Grounded, warm, respectful kinship.',
      greetingStyle: 'Use appropriate family greetings (e.g. "শ্রদ্ধেয়...,", "স্নেহের...,", "আমার পরিবারের প্রিয় মানুষটিকে,").',
      closingStyle: 'End with family sign-off (e.g. "পারিবারিক ভালোবাসায়,", "আপনার স্নেহধন্য,", "ইতি আপনার আপনজন").',
      emotionalTone: 'Warm, respectful, rooted in culture and mutual respect.',
      honorific: 'আপনি',
      prohibitions: ['No romantic declarations'],
    },
  },

  // Alias for backward compatibility if an older record references someone-special
  'someone-special': {
    id: 'special-person',
    title: 'বিশেষ কারও জন্য',
    titleEn: 'For Someone Special',
    sectionTitle: 'বিশেষ কাউকে উদ্দেশ্য করে নিজের মনের কথা লিখুন',
    sectionTitleEn: 'Write your feelings for someone special',
    sectionSubtitle: 'অনুচ্চারিত ভালোলাগা, মুগ্ধতা আর দূরবর্তী অনুরাগের প্রকাশ',
    sectionSubtitleEn: 'For unconfessed feelings, admired souls, or unique emotional connections',
    memoryLabel: 'তার সাথে কোনো মুহূর্ত বা ভালোলাগার কারণ',
    memoryLabelEn: 'Moments of admiration or reasons they hold a special place',
    memoryPlaceholder: 'যাকে না-বলা অনেক কথা বলতে চান, তার জন্য লিখুন...',
    memoryPlaceholderEn: 'Express subtle admiration, respect, and unspoken heartfelt thoughts...',
    situationPlaceholder: 'বিশেষ উপলক্ষ, দূর থেকে ভালো লাগা বা মনের কথা জানানোর কারণ...',
    situationPlaceholderEn: 'A special day, watching from afar, or taking courage to write...',
    feelingPlaceholder: 'হৃদয়ের অব্যক্ত মুগ্ধতা, সম্মান ও ভালোলাগার কথা...',
    feelingPlaceholderEn: 'Gentle admiration, reverence, and unspoken affection...',
    memorySuggestions: [
      {
        bn: 'বিশেষ কাউকে উদ্দেশ্য করে নিজের মনের কথা লিখুন',
        en: 'Writing your innermost heartfelt feelings to someone truly special',
      },
      {
        bn: 'কৃতজ্ঞতা বা ভালোবাসা প্রকাশ করুন',
        en: 'Expressing sincere gratitude, subtle warmth, or gentle admiration',
      },
    ],
    situationSuggestions: [
      {
        bn: 'মুখে হয়তো কখনো বলতে পারব না, তাই চিঠির সাদা পাতায় সাহস করে লিখলাম',
        en: 'Might never say it in person, so finding courage on this white paper',
      },
    ],
    feelingSuggestions: [
      {
        bn: 'প্রতিদিনের ভাবনায় যে মানুষটির উপস্থিতি জড়িয়ে থাকে, তুমিই সেই বিশেষ কেউ',
        en: 'The person who walks through my quiet thoughts every single day is you',
      },
    ],
    aiGuidance: {
      relationshipContext: 'Recipient is Someone Special (বিশেষ কেউ).',
      greetingStyle: 'Use gentle, respectful greetings.',
      closingStyle: 'End with respectful, warm sign-off.',
      emotionalTone: 'Gentle, pure, respectful.',
      honorific: 'তুমি',
      prohibitions: ['No intrusive stalking'],
    },
  },
}

/**
 * Get tailored configuration for a given relationship key
 */
export function getRelationshipPromptConfig(relationship?: string): RelationshipPromptConfig {
  const key = (relationship || 'special-person') as Relationship
  if (key in RELATIONSHIP_PROMPT_CONFIGS) {
    return RELATIONSHIP_PROMPT_CONFIGS[key]
  }

  // Fallback to special-person
  return RELATIONSHIP_PROMPT_CONFIGS['special-person']
}

/**
 * Intelligent Intent Detector
 * Analyzes natural language input (e.g. "আম্মুকে নিয়ে", "আমার প্রয়াত বাবাকে")
 * and extracts the core relationship and emotional context.
 */
export function detectRelationshipIntent(
  text: string,
  currentRelationship?: string
): {
  relationship: Relationship
  isDeceased: boolean
  isLostConnection: boolean
  originalPerson?: 'father' | 'mother' | 'friend' | 'mentor' | 'lover' | 'sibling' | 'general'
  matchedIntent?: string
} {
  const normalized = (text || '').toLowerCase().trim()

  // 1. Deceased / Remembrance context ("আমার প্রয়াত বাবাকে", "মা মারা গেছেন", "না ফেরার দেশে")
  const deceasedMatch = /প্রয়াত|মরহুম|মারা গে|পরলোকগত|না ফেরার দেশে|চিরতরে চলে গে|কবরে|আজ আর বেঁচে নেই|স্বর্গবাসী|আর বেঁচে নেই|স্বর্গগত|পরপারে|স্মৃতির মানুষ/i.test(
    normalized
  )

  if (deceasedMatch) {
    let originalPerson: 'father' | 'mother' | 'friend' | 'mentor' | 'lover' | 'sibling' | 'general' = 'general'
    if (/(আব্বু|আব্বা|বাবা|পিতা)/i.test(normalized)) originalPerson = 'father'
    else if (/(আম্মু|আম্মা|মা|মাতা)/i.test(normalized)) originalPerson = 'mother'
    else if (/(শিক্ষক|শিক্ষিকা|স্যার|ম্যাডাম|মেন্টর)/i.test(normalized)) originalPerson = 'mentor'
    else if (/(বন্ধু|দোস্ত|বান্ধবী)/i.test(normalized)) originalPerson = 'friend'
    else if (/(ভাই|বোন|ভাইয়া|আপু)/i.test(normalized)) originalPerson = 'sibling'
    else if (/(প্রেমিক|প্রেমিকা|ভালোবাসা|প্রিয়তমা|প্রিয়তম)/i.test(normalized)) originalPerson = 'lover'

    return {
      relationship: 'lost-person',
      isDeceased: true,
      isLostConnection: false,
      originalPerson,
      matchedIntent: originalPerson === 'father'
        ? 'প্রয়াত বাবা (Deceased Father)'
        : originalPerson === 'mother'
        ? 'প্রয়াত মা (Deceased Mother)'
        : 'স্মৃতির মানুষ (Departed/Missed Person)',
    }
  }

  // 2. Lost Connection context ("যোগাযোগ হারিয়ে গেছে", "অনেক বছর পর খোঁজ", "কথা হয় না বহুদিন")
  const lostConnectionMatch = /যোগাযোগ নেই|যোগাযোগ বন্ধ|যোগাযোগ হারিয়ে|বহু বছর পর|অনেক বছর পর|খোঁজ নেই|হারিয়ে যাওয়া যোগাযোগ|দূরত্ব তৈরি|বহুদিন পর কথা|খবর নেই|যোগাযোগ বিচ্ছিন্ন/i.test(
    normalized
  )

  if (lostConnectionMatch) {
    return {
      relationship: 'lost-connection',
      isDeceased: false,
      isLostConnection: true,
      matchedIntent: 'হারিয়ে যাওয়া যোগাযোগ (Lost Connection)',
    }
  }

  // 3. Mother intent ("আম্মুকে নিয়ে", "আম্মুর জন্য", "মা", "আম্মা", "আমার মা")
  if (/(?:^|[^\u0980-\u09FF])(আম্মু|আম্মা|মা|মায়ের|মাতা|আম্মি|আম্মুকে|মাকে)(?:[^\u0980-\u09FF]|$)/iu.test(normalized) || /mother/i.test(normalized)) {
    return {
      relationship: 'mother',
      isDeceased: false,
      isLostConnection: false,
      matchedIntent: 'মা / আম্মু (Mother)',
    }
  }

  // 4. Father intent ("বাবার জন্য", "বাবাকে নিয়ে", "আব্বু", "আব্বা", "আমার বাবা")
  if (/(?:^|[^\u0980-\u09FF])(আব্বু|আব্বা|বাবা|বাবার|পিতা|আব্বুকে|বাবাকে|বাপকে)(?:[^\u0980-\u09FF]|$)/iu.test(normalized) || /father/i.test(normalized)) {
    return {
      relationship: 'father',
      isDeceased: false,
      isLostConnection: false,
      matchedIntent: 'বাবা / আব্বু (Father)',
    }
  }

  // 5. Mentor / Teacher intent ("শিক্ষক", "স্যার", "ম্যাডাম", "মেন্টর")
  if (/(?:^|[^\u0980-\u09FF])(শিক্ষক|শিক্ষিকা|স্যার|ম্যাডাম|মেন্টর|ওস্তাদ|গুরুজন|গুরুদেব)(?:[^\u0980-\u09FF]|$)/iu.test(normalized) || /teacher|mentor/i.test(normalized)) {
    return {
      relationship: 'mentor',
      isDeceased: false,
      isLostConnection: false,
      matchedIntent: 'শিক্ষক / মেন্টর (Teacher/Mentor)',
    }
  }

  // 6. Spouse intent ("স্বামী", "স্ত্রী", "বউ", "দাম্পত্য", "জীবনসঙ্গী")
  if (/(?:^|[^\u0980-\u09FF])(স্ত্রী|বউ|স্বামী|দাম্পত্য|জীবনসঙ্গী|সহধর্মিণী|বর)(?:[^\u0980-\u09FF]|$)/iu.test(normalized) || /husband|wife|spouse/i.test(normalized)) {
    return {
      relationship: 'husband-wife',
      isDeceased: false,
      isLostConnection: false,
      matchedIntent: 'স্বামী / স্ত্রী (Husband/Wife)',
    }
  }

  // 7. Lover intent ("প্রেমিক", "প্রেমিকা", "ভালোবাসার মানুষ", "ক্রাশ")
  if (/(?:^|[^\u0980-\u09FF])(প্রেমিক|প্রেমিকা|ভালোবাসার মানুষ|প্রিয়তমা|প্রিয়তম|মনের মানুষ|ক্রাশ)(?:[^\u0980-\u09FF]|$)/iu.test(normalized) || /lover|partner/i.test(normalized)) {
    return {
      relationship: 'lover',
      isDeceased: false,
      isLostConnection: false,
      matchedIntent: 'প্রেমিক / প্রেমিকা (Lover/Partner)',
    }
  }

  // 8. Sibling intent ("ভাই", "বোন", "ভাইয়া", "আপু")
  if (/(?:^|[^\u0980-\u09FF])(ভাইয়া|আপু|ভাই|বোন|ছোট ভাই|বড় ভাই|ছোট বোন|বড় বোন)(?:[^\u0980-\u09FF]|$)/iu.test(normalized) || /brother|sister|sibling/i.test(normalized)) {
    return {
      relationship: 'sibling',
      isDeceased: false,
      isLostConnection: false,
      matchedIntent: 'ভাই / বোন (Sibling)',
    }
  }

  // 9. Friend intent ("বন্ধু", "দোস্ত", "বান্ধবী")
  if (/(?:^|[^\u0980-\u09FF])(বন্ধু|দোস্ত|বান্ধবী|ফ্রেন্ড|ইয়ার|বেস্ট ফ্রেন্ড|প্রিয় বন্ধু)(?:[^\u0980-\u09FF]|$)/iu.test(normalized) || /friend/i.test(normalized)) {
    return {
      relationship: 'friend',
      isDeceased: false,
      isLostConnection: false,
      matchedIntent: 'বন্ধু (Friend)',
    }
  }

  // 10. Fallback to current selected relationship or default
  const validCurrent = (currentRelationship as Relationship) || 'special-person'
  return {
    relationship: validCurrent in RELATIONSHIP_PROMPT_CONFIGS ? validCurrent : 'special-person',
    isDeceased: false,
    isLostConnection: false,
  }
}

