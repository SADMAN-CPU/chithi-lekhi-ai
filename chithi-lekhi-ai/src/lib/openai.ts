import OpenAI from 'openai'
import type { GenerateLetterRequest } from '@/types'
import { buildLetterPrompt, SYSTEM_PERSONA } from './prompts'

const apiKey = process.env.OPENAI_API_KEY

// Initialize OpenAI client only when a plausible API key exists
const isRealApiKey = Boolean(
  apiKey &&
  apiKey !== 'your_openai_key_here' &&
  apiKey.startsWith('sk-')
)

export const openaiClient = isRealApiKey
  ? new OpenAI({ apiKey })
  : null

export { openaiClient as openai }

// ─── High-Fidelity Emotional Fallback Engine ──────────────────────────────────
//
// When OpenAI key is not set or network is unavailable, this ensures the application
// produces stunning, personalized emotional letters weaving in all user inputs.

export function generatePersonalizedFallback(params: GenerateLetterRequest): string {
  const name = params.receiverName.trim()
  const feeling = params.feeling.trim()
  const memory = params.memory?.trim() || ''
  const situation = params.situation?.trim() || ''
  const era = params.eraStyle || '90s-handwritten'
  const lang = params.language || 'bengali'
  const length = params.letterLength || 'medium'
  const rawRel = (params.relationship || '').toString().toLowerCase()

  const isFather = rawRel === 'father' || rawRel.includes('বাবা') || rawRel.includes('আব্বা')
  const isMother = rawRel === 'mother' || rawRel.includes('মা') || rawRel.includes('আম্মা')
  const isFriend = rawRel === 'friend' || rawRel === 'best-friend' || rawRel.includes('বন্ধু')
  const isRomantic = rawRel === 'lover' || rawRel === 'first-love' || rawRel === 'husband-wife' || rawRel.includes('প্রেম')

  const occasionText = `${feeling} ${situation}`.toLowerCase()
  const isBirthday = /জন্মদিন|birthday|জনমদিন/i.test(occasionText)
  const isAnniversary = /বিবাহ|বিয়ে|বার্ষিকী|anniversary|wedding/i.test(occasionText)

  if (lang === 'english') {
    let salutation = `Dearest ${name},`
    let signoff = `Forever yours,\nSomeone who remembers`

    if (isFather) {
      salutation = name.toLowerCase().includes('father') || name.toLowerCase().includes('dad') ? `${name},` : `Dearest Father,`
      signoff = `With love and deepest respect,\nYour loving child`
    } else if (isMother) {
      salutation = name.toLowerCase().includes('mother') || name.toLowerCase().includes('mom') ? `${name},` : `Dearest Mother,`
      signoff = `With all my love and gratitude,\nYour loving child`
    } else if (isFriend) {
      salutation = `Dear ${name},`
      signoff = `Warmly,\nYour friend always`
    }

    let letter = `${salutation}\n\n`

    if (isFather) {
      letter += `I am writing this letter with a heart full of gratitude and reverence for everything you have quietly done and sacrificed for me throughout my life. In the rush of everyday life, I may not say it out loud, but your guidance remains my greatest source of strength.\n\n`
    } else if (isMother) {
      letter += `Tonight as I write to you, my heart is overwhelmed with memories of your gentle warmth and unconditional love. Your comforting embrace and tender sacrifices have been the true anchor of my world.\n\n`
    } else if (era === '90s-handwritten') {
      letter += `I am sitting here tonight listening to the quiet murmur of the rain outside, watching the ink settle onto this paper. Every time the silence deepens, my thoughts invariably find their way back to you.\n\n`
    } else if (era === 'vintage') {
      letter += `Across the quiet expanse of time, some bonds remain etched into the very fabric of our being. As twilight fades into the dark, your name echoes with timeless reverence in my quiet heart.\n\n`
    } else {
      letter += `I've been holding these words inside for far too long, and today I simply couldn't keep them to myself any longer. Life moves so quickly, but whenever I pause, it's always your face that comes to mind.\n\n`
    }

    if (isBirthday) {
      letter += `On this special birthday, my only wish is that your life be filled with boundless joy, peaceful health, and radiant moments of happiness.\n\n`
    } else if (isAnniversary) {
      letter += `Celebrating this beautiful milestone together reminds me how truly blessed we are. May our shared journey grow sweeter and stronger with every passing year.\n\n`
    }

    if (memory) {
      letter += `I still remember so vividly: ${memory}. Moments like that are rare treasures; they don't fade with time, but instead grow warmer with every passing season.\n\n`
    }

    if (situation) {
      letter += `Even though right now ${situation}, my heart refuses to let distance or silence diminish what we share.\n\n`
    }

    letter += `What I truly wanted to tell you is that ${feeling}. It sits with me in the mornings and walks with me into the night. You have given me something irreplaceable.\n\n`

    if (length === 'long') {
      letter += `If I could turn back the hours, I would spend them just listening to your voice. Until the day our paths cross properly again, please take gentle care of yourself. Know that in at least one corner of this world, someone holds you in the deepest regard.\n\n`
    }

    letter += signoff
    return letter
  }

  if (lang === 'banglish') {
    let salutation = `Prio ${name},`
    let signoff = `Onek bhalobashay,\nTomari keu ekjon`

    if (isFather) {
      salutation = `Shraddheyo Baba,`
      signoff = `Pronam nio Baba,\nApnar ador-er shontan`
    } else if (isMother) {
      salutation = `Shraddheya Ma,`
      signoff = `Pronam nio Ma,\nTomar ador-er shontan`
    } else if (isFriend) {
      salutation = `Ki re ${name},`
      signoff = `Abar dekha hobe,\nTor bondhu`
    }

    let letter = `${salutation}\n\n`

    if (isFather) {
      letter += `Apnar sneho ar silent sacrifice amar jiboner shobcheye boro shompod. Mukhe konodin bola hoyna, kintu mon theke apnake khub shonman o bhalobashi.\n\n`
    } else if (isMother) {
      letter += `Ma, tomar kole matha rekhe je shanti petam, sheta prithibir kothao nei. Tomar shob ador ar valobasha amar hridoye shobshomoy thake.\n\n`
    } else if (era === '90s-handwritten') {
      letter += `Onek din por kolom hatey niyechi. Moner vitor er kothagulo phone ba text message e thik bojhano jay na, tai ei chithi likhte bosa.\n\n`
    } else {
      letter += `Kemon acho tumi? Onekdin dhori ei kothagulo bolbo bolbo koreo bola hoyni. Kintu ajke mon ke r thamiye rakhte parlam na.\n\n`
    }

    if (isBirthday) {
      letter += `Ajker ei jonmodine tomar jonno onek shuvo kamona ar bhalobasha roilo.\n\n`
    }

    if (memory) {
      letter += `Amar ekhono shei din-tar kotha khub mone pore: ${memory}. Shei chotto muhurto-ta amar hridoye ekhono ekdom notun hoye ache.\n\n`
    }

    if (situation) {
      letter += `Ekhon shotti bolte ${situation}, tobuo moner vitorer tan ta ekbindu o komoni.\n\n`
    }

    letter += `Shobcheye boro kotha holo, ${feeling}. Ei anubhuti ta shudhu tomar jonnoi shorbo-khon thakey.\n\n`

    if (length === 'long') {
      letter += `Nijer joton nio. Jotoi durutto thakuk, tumi amar moner shobcheye kacher manush hoyei thakbe shobshomoy.\n\n`
    }

    letter += signoff
    return letter
  }

  // Default: Bengali (বাংলা)
  const personality = params.personality || params.style

  let salutation = `প্রিয় ${name},`
  if (isFather) {
    salutation = `শ্রদ্ধেয় বাবা,`
  } else if (isMother) {
    salutation = `শ্রদ্ধেয়া মা,`
  } else if (personality === 'rabindranath-classical') {
    salutation = `কল্যাণীয়া ${name},`
  } else if (personality === 'funny-friend' || isFriend) {
    salutation = `কী রে ${name},`
  } else if (personality === 'romantic' || isRomantic) {
    salutation = `আমার প্রিয়তম ${name},`
  }

  let letter = `${salutation}\n\n`

  if (isFather) {
    letter += `ছোটবেলা থেকে আজ পর্যন্ত আপনি যে নিঃশব্দ ত্যাগ আর স্নেহের ছায়ায় আমাকে আগলে রেখেছেন, তার ঋণ কোনোদিন শোধ করার নয়। ব্যস্ততার মাঝে হয়তো প্রতিদিন বলা হয় না, কিন্তু মনের গভীরে আপনার জন্য শ্রদ্ধা ও ভালোবাসা চিরকাল একই রকম আছে।\n\n`
  } else if (isMother) {
    letter += `মা, তোমার কোলের ওম আর তোমার সেই স্নেহের ডাক আজও আমার জীবনের সবচেয়ে বড় শক্তি। কত রাত না ঘুমিয়ে তুমি আমার দেখভাল করেছ, আমার সামান্য কষ্টে তোমার চোখ ছলছল করেছে—সেই কথা ভাবলে বুকের ভেতর এক অদ্ভুত শান্তি নেমে আসে।\n\n`
  } else if (personality === 'rabindranath-classical') {
    letter += `দূর দিগন্তের ওপারে যখন সন্ধ্যার ছায়া গাঢ় হইয়া আসে, স্মৃতির শান্ত নদীর তীরে তোমার মুখচ্ছবি আসিয়া দাঁড়ায়। কত কথা সময়ের চরণে লীন হইয়া যায়, অথচ মনের অন্তস্তলে কিছু অবিনশ্বর ভাব চিরন্তন জ্যোতির্ময় হইয়া বিরাজ করে।\n\n`
  } else if (personality === 'funny-friend') {
    letter += `তোকে কোনোদিন এইভাবে চিঠি লিখব ভাবিনি রে! কিন্তু আজকে মনে হলো একটু খুনসুটি না করলে দিনটাই জমছে না। সেই যে চায়ের দোকানে বসে ঘণ্টার পর ঘণ্টা আড্ডা দিতাম—আজও ভাবলে হাসি পায়।\n\n`
  } else if (personality === 'mature-apology') {
    letter += `মানুষ ভুল করে, কিন্তু সেই ভুলের কারণে যদি তোমার হৃদয়ে আঘাত লেগে থাকে, তবে তার কোনো অজুহাত হয় না। আজ সব অহংকার ও দ্বিধা দূরে সরিয়ে অত্যন্ত বিনীতভাবে তোমার কাছে এই চিঠিটি লিখছি।\n\n`
  } else if (personality === 'poetic') {
    letter += `শ্রাবণের মেঘমেদুর আকাশের নিচে বসে আজ স্মৃতির আঙিনায় আলো ফেলেছি। কিছু অনুভূতি কবিতার মতো ছন্দ খোঁজে, কিছু কথা বৃষ্টিভেজা মাটির সোঁদা গন্ধের মতো বুকের ভেতরে ছড়িয়ে পড়ে।\n\n`
  } else if (personality === 'romantic') {
    letter += `প্রতিদিনের ব্যস্ততার মাঝে যখনই এক মুহূর্তের জন্য চোখ বুজি, কেবল তোমার মিষ্টি মুখটিই ভেসে ওঠে। তোমার ছোঁয়া, তোমার মৃদু হাসি আর একসাথে কাটানো মুহূর্তগুলো আমার জীবনের শ্রেষ্ঠ উপহার।\n\n`
  } else if (personality === 'deep-emotional') {
    letter += `কিছু অনুভূতি এতটাই গভীর যে তা মুখে বলতে গেলে কণ্ঠ রুদ্ধ হয়ে আসে। আজ বুকের ভেতরের সমস্ত গোপন আবেগ, দীর্ঘশ্বাস আর না-বলা আকুলতা এই সাদা কাগজের বুকে ঢেলে দিচ্ছি।\n\n`
  } else if (personality === 'simple-human') {
    letter += `কোনো জটিল কথা বলতে আসিনি, খুব সাধারণ আর সহজ ভাষায় তোমাকে মনের কথাটা জানাতে চাই। জীবনে অনেক মানুষ আসে-যায়, কিন্তু তোমার মতো আপন কেউ কখনো হতে পারেনি।\n\n`
  } else if (era === '90s-handwritten') {
    letter += `আজ অনেক দিন পর ঝরনা কলম হাতে নিয়েছি। জানালার বাইরে মৃদু বাতাস আর সন্ধ্যার আলো নিভে আসার মুহূর্তে কেন যেন তোমার মুখটি বুকের ভেতর ভেসে উঠল। ডাকপিয়নের অপেক্ষায় কাটানো সেই পুরোনো দিনের মতো, প্রতিটি শব্দে আমার হৃদয় উজাড় করে দিচ্ছি।\n\n`
  } else if (era === 'vintage') {
    letter += `দূরত্বের কুয়াশাঘেরা সীমানা পেরিয়ে আজ স্মৃতির ওপারে তোমার ডাক শুনলাম। জীবনের ব্যস্ত স্রোতে কত কথা জমে থাকে, যা কখনো উচ্চারণ করা হয় না; অথচ মৌন নদীর মতো তা অহর্নিশ বয়ে চলে হৃদয়ের গহীনে।\n\n`
  } else {
    letter += `কেমন আছো তুমি? অনেকগুলো কথা প্রতিদিন মনে জমে থাকে, কিন্তু ব্যস্ততার ভিড়ে বা সংকোচে কখনোই গুছিয়ে বলা হয়ে ওঠে না। আজ সব জড়তা দূরে সরিয়ে তোমাকে এই চিঠিটা লিখছি।\n\n`
  }

  if (isBirthday) {
    letter += `আজকের এই বিশেষ জন্মদিনে তোমার জীবনের সব চাওয়া পূর্ণ হোক, প্রতিটি ক্ষণ অপার আনন্দ ও শান্তিতে ভরে উঠুক—এই আমার একমাত্র শুভকামনা।\n\n`
  } else if (isAnniversary) {
    letter += `আমাদের এই একসাথে পথচলার সুন্দর মুহূর্তগুলো আরও রঙিন ও মধুময় হয়ে উঠুক, ভালোবাসার বন্ধন অটুট থাকুক চিরকাল।\n\n`
  }

  if (memory) {
    letter += `আজও আমার স্পষ্ট মনে পড়ে—${memory}। সেই স্মৃতিটুকু আমার একান্ত নির্জনতায় এক টুকরো চাঁদের আলোর মতো জড়িয়ে থাকে। সময়ের ধুলো তাকে এতটুকু মলিন করতে পারেনি।\n\n`
  }

  if (situation) {
    letter += `বাস্তবতায় হয়তো আজ ${situation}, কিন্তু মনের নৈকট্য কখনো বাইরের দূরত্বের কাছে হার মানে না।\n\n`
  }

  letter += `সত্যি বলতে কি, ${feeling}। এই অনুভূতিটাই আমার নিঃশ্বাসে প্রতিদিনের আশ্রয়। তোমাকে না দেখলে বা তোমার কথা না শুনলে দিনটা কেমন যেন অসম্পূর্ণ থেকে যায়।\n\n`

  if (length === 'long') {
    letter += `পৃথিবীর সব কোলাহল পেরিয়ে আমার সব প্রার্থনা যেন তোমার চারপাশেই আলো ছড়িয়ে রাখে। জীবনের যত ঝড়ই আসুক, জানবে দূরে থেকেও কেউ একজন নীরবে তোমার মঙ্গল কামনা করে চলেছে।\n\n`
  }

  if (isFather) {
    letter += `ইতি,\nআপনার স্নেহধন্য সন্তান`
  } else if (isMother) {
    letter += `অফুরন্ত শ্রদ্ধা ও ভালোবাসাসহ,\nআপনার সন্তান`
  } else if (personality === 'rabindranath-classical') {
    letter += `ইতি তোমার,\nচিরন্তন শুভানুধ্যায়ী`
  } else if (personality === 'mature-apology') {
    letter += `ক্ষমা ও শান্তির প্রত্যাশায়,\nতোমার অনুতপ্ত একজন`
  } else if (personality === 'funny-friend' || isFriend) {
    letter += `আড্ডার টেবিলে দেখা হবে,\nতোরই আজন্মের দোস্ত`
  } else if (personality === 'romantic') {
    letter += `অনন্ত ভালোবাসায়,\nচিরদিনের তোমার`
  } else if (era === 'vintage') {
    letter += `ইতি,\nতোমার শুভানুধ্যায়ী`
  } else if (era === '90s-handwritten') {
    letter += `চিঠির অপেক্ষায়,\nতোমার একান্ত আপন`
  } else {
    letter += `সবটুকু ভালোবাসায়,\nতোমার কেউ একজন`
  }

  return letter
}

/**
 * Calculate optimal max_tokens based on script density and requested letter length.
 * Bengali Unicode script requires ~2.5x-3.5x more BPE tokens per word than English.
 */
export function calculateOptimalTokens(
  language: 'bengali' | 'english' | 'banglish' = 'bengali',
  length: 'short' | 'medium' | 'long' = 'medium'
): number {
  switch (language) {
    case 'bengali':
      // Bengali Unicode script consumes ~2.8 tokens per word
      // Short (~120 words): 450 tokens
      // Medium (~250 words): 900 tokens
      // Long (~450 words): 1500 tokens (guarantees complete sign-off without truncation)
      return length === 'long' ? 1500 : length === 'short' ? 450 : 900
    case 'banglish':
      return length === 'long' ? 1000 : length === 'short' ? 350 : 700
    case 'english':
    default:
      return length === 'long' ? 850 : length === 'short' ? 300 : 550
  }
}

// ─── Main Letter Generator ───────────────────────────────────────────────────

export async function generateLetter(params: GenerateLetterRequest): Promise<string> {
  const prompt = buildLetterPrompt(params)

  if (openaiClient) {
    try {
      const maxTokens = calculateOptimalTokens(params.language, params.letterLength)

      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PERSONA,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.82,
        presence_penalty: 0.3,
        frequency_penalty: 0.1,
        max_tokens: maxTokens,
      })

      const generated = completion.choices[0]?.message?.content?.trim()
      if (generated && generated.length > 50) {
        return generated
      }
    } catch (err) {
      console.warn('[OpenAI] API call failed or timed out, using fallback storytelling generator:', err)
    }
  }

  // Graceful fallback to guaranteed storytelling output
  return generatePersonalizedFallback(params)
}
