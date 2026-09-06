import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import type { GenerateLetterRequest } from '@/types'
import { buildLetterPrompt, SYSTEM_PERSONA } from './prompts'
import { generateLetter as generateWithOpenAiFallback } from './openai'

const geminiApiKey = process.env.GEMINI_API_KEY
const geminiModelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

const isRealGeminiKey = Boolean(
  geminiApiKey &&
  geminiApiKey !== 'your_gemini_key_here' &&
  geminiApiKey.trim().length > 10
)

const genAI = isRealGeminiKey ? new GoogleGenerativeAI(geminiApiKey!) : null

/**
 * Permissive safety settings for emotional epistolary literature
 * Prevents false-positive blocks on expressions of deep love, sorrow, or intimacy
 */
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

/**
 * Generate an emotional, human-like letter using Google Gemini API.
 * Gracefully falls back to OpenAI or the high-fidelity local storyteller engine.
 */
export async function generateGeminiLetter(
  params: GenerateLetterRequest,
  emotionContextPrompt?: string
): Promise<{ letter: string; provider: 'gemini' | 'openai' | 'fallback' }> {
  // Build base prompt, optionally enriched by the Emotion Understanding Layer
  const basePrompt = buildLetterPrompt(params)
  const fullPrompt = emotionContextPrompt
    ? `${emotionContextPrompt}\n\n══════════════════════════════════════════════════════\nLETTER SPECIFICATIONS\n══════════════════════════════════════════════════════\n${basePrompt}`
    : basePrompt

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({
        model: geminiModelName,
        systemInstruction: SYSTEM_PERSONA,
        safetySettings,
        generationConfig: {
          temperature: 0.85,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: params.letterLength === 'long' ? 1800 : params.letterLength === 'short' ? 600 : 1200,
        },
      })

      const result = await model.generateContent(fullPrompt)
      const response = await result.response
      const letterText = response.text()?.trim()

      if (letterText && letterText.length > 50) {
        return { letter: letterText, provider: 'gemini' }
      }
    } catch (geminiErr) {
      console.warn('[Gemini AI] Generation error or quota issue, attempting fallback:', geminiErr)
    }
  }

  // Fallback ladder: OpenAI or Offline Emotional Storyteller Engine
  try {
    const fallbackText = await generateWithOpenAiFallback(params)
    return {
      letter: fallbackText,
      provider: process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-') ? 'openai' : 'fallback',
    }
  } catch (err) {
    console.error('[AI Pipeline] All AI engines failed:', err)
    throw new Error('চিঠি তৈরি করতে সাময়িক সমস্যা হচ্ছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।')
  }
}
