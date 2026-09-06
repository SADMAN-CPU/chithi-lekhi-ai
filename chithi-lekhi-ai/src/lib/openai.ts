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

const openaiClient = isRealApiKey
  ? new OpenAI({ apiKey })
  : null

// ─── High-Fidelity Emotional Fallback Engine ──────────────────────────────────
//
// When OpenAI key is not set or network is unavailable, this ensures the application
// produces stunning, personalized emotional letters weaving in all user inputs.

function generatePersonalizedFallback(params: GenerateLetterRequest): string {
  const name = params.receiverName.trim()
  const feeling = params.feeling.trim()
  const memory = params.memory?.trim() || ''
  const situation = params.situation?.trim() || ''
  const era = params.eraStyle || '90s-handwritten'
  const lang = params.language || 'bengali'
  const length = params.letterLength || 'medium'

  if (lang === 'english') {
    let letter = `Dearest ${name},\n\n`
    if (era === '90s-handwritten') {
      letter += `I am sitting here tonight listening to the quiet murmur of the rain outside, watching the ink settle onto this paper. Every time the silence deepens, my thoughts invariably find their way back to you.\n\n`
    } else if (era === 'vintage') {
      letter += `Across the quiet expanse of time, some bonds remain etched into the very fabric of our being. As twilight fades into the dark, your name echoes with timeless reverence in my quiet heart.\n\n`
    } else {
      letter += `I've been holding these words inside for far too long, and today I simply couldn't keep them to myself any longer. Life moves so quickly, but whenever I pause, it's always your face that comes to mind.\n\n`
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

    letter += `Forever yours,\nSomeone who remembers`
    return letter
  }

  if (lang === 'banglish') {
    let letter = `Prio ${name},\n\n`
    if (era === '90s-handwritten') {
      letter += `Onek din por kolom hatey niyechi. Moner vitor er kothagulo phone ba text message e thik bojhano jay na, tai ei chithi likhte bosa.\n\n`
    } else {
      letter += `Kemon acho tumi? Onekdin dhori ei kothagulo bolbo bolbo koreo bola hoyni. Kintu ajke mon ke r thamiye rakhte parlam na.\n\n`
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

    letter += `Onek bhalobashay,\nTomari keu ekjon`
    return letter
  }

  // Default: Bengali (বাংলা)
  let letter = `প্রিয় ${name},\n\n`

  if (era === '90s-handwritten') {
    letter += `আজ অনেক দিন পর ঝরনা কলম হাতে নিয়েছি। জানালার বাইরে মৃদু বাতাস আর সন্ধ্যার আলো নিভে আসার মুহূর্তে কেন যেন তোমার মুখটি বুকের ভেতর ভেসে উঠল। ডাকপিয়নের অপেক্ষায় কাটানো সেই পুরোনো দিনের মতো, প্রতিটি শব্দে আমার হৃদয় উজাড় করে দিচ্ছি।\n\n`
  } else if (era === 'vintage') {
    letter += `দূরত্বের কুয়াশাঘেরা সীমানা পেরিয়ে আজ স্মৃতির ওপারে তোমার ডাক শুনলাম। জীবনের ব্যস্ত স্রোতে কত কথা জমে থাকে, যা কখনো উচ্চারণ করা হয় না; অথচ মৌন নদীর মতো তা অহর্নিশ বয়ে চলে হৃদয়ের গহীনে।\n\n`
  } else {
    letter += `কেমন আছো তুমি? অনেকগুলো কথা প্রতিদিন মনে জমে থাকে, কিন্তু ব্যস্ততার ভিড়ে বা সংকোচে কখনোই গুছিয়ে বলা হয়ে ওঠে না। আজ সব জড়তা দূরে সরিয়ে তোমাকে এই চিঠিটা লিখছি।\n\n`
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

  if (era === 'vintage') {
    letter += `ইতি,\nতোমার শুভানুধ্যায়ী`
  } else if (era === '90s-handwritten') {
    letter += `চিঠির অপেক্ষায়,\nতোমার একান্ত আপন`
  } else {
    letter += `সবটুকু ভালোবাসায়,\nতোমার কেউ একজন`
  }

  return letter
}

// ─── Main Letter Generator ───────────────────────────────────────────────────

export async function generateLetter(params: GenerateLetterRequest): Promise<string> {
  const prompt = buildLetterPrompt(params)

  if (openaiClient) {
    try {
      const maxTokens = params.letterLength === 'long' ? 900 : params.letterLength === 'short' ? 350 : 600

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
        temperature: 0.88,
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
