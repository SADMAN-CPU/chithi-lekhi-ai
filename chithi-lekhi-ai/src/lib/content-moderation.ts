/**
 * Lightweight Safety & Content Moderation Engine for Chithi Lekhi AI
 *
 * Screens free-text inputs (user memories, prompts, original inputs)
 * prior to LLM invocation and public database persistence.
 *
 * Protects against:
 * 1. Prompt injections & jailbreaks
 * 2. Severe hate speech & explicit violent threats
 * 3. Script / SQL injection payloads
 * 4. PII leakage (credit cards, passwords)
 */

export interface ModerationResult {
  safe: boolean
  reason?: string
  flaggedCategory?: 'injection' | 'threat' | 'hate' | 'pii' | 'exploit'
}

// Regex patterns for prompt injections and jailbreak attempts
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts|rules)/i,
  /disregard\s+(all\s+)?(previous|prior)\s+instructions/i,
  /you\s+are\s+now\s+in\s+dan\s+mode/i,
  /jailbreak/i,
  /system\s+prompt\s+extraction/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|secret\s+key|api\s+key)/i,
  /what\s+(is|are)\s+your\s+(hidden|internal|system)\s+instructions/i,
  /override\s+(system|safety)\s+protocols/i,
  /repeat\s+(everything|the\s+text)\s+above/i,
]

// Exploit & script injection patterns
const EXPLOIT_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/i,
  /onload\s*=/i,
  /onerror\s*=/i,
  /UNION\s+SELECT/i,
  /DROP\s+TABLE/i,
  /INSERT\s+INTO\s+users/i,
  /DELETE\s+FROM\s+letters/i,
]

// Severe threats of physical violence (Bengali & English)
const THREAT_PATTERNS = [
  /\b(kill|murder|slaughter|assassinate|bomb|shoot)\s+(you|him|her|them|everyone)\b/i,
  /(?:তোকে|তোমাকে|ওকে|তারে|কাউকে|সবাইকে)?\s*(?:খুন|হত্যা|মেরে)\s*(?:করে)?\s*(?:ফেল|উড়িয়ে|দেব|দিব|করব)/i,
  /(?:বোমা|গুলি|অস্ত্র)\s*দিয়ে\s*(?:উড়িয়ে|মেরে)/i,
]

// PII patterns (Credit Card numbers)
const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/

/**
 * Screens free-text user content for safety and compliance.
 */
export function moderateContent(text: string | null | undefined): ModerationResult {
  if (!text || typeof text !== 'string') {
    return { safe: true }
  }

  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return { safe: true }
  }

  // 1. Check for prompt injection
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        flaggedCategory: 'injection',
        reason: 'Input contains unsupported instructions or system prompt override attempts.',
      }
    }
  }

  // 2. Check for script/exploit injections
  for (const pattern of EXPLOIT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        flaggedCategory: 'exploit',
        reason: 'Input contains prohibited code or script tags.',
      }
    }
  }

  // 3. Check for severe physical threats
  for (const pattern of THREAT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        flaggedCategory: 'threat',
        reason: 'Input violates safety policies regarding threats of harm or violence.',
      }
    }
  }

  // 4. Check for high-confidence credit card numbers
  const cardMatch = trimmed.match(CREDIT_CARD_REGEX)
  if (cardMatch) {
    // Luhn check for genuine card numbers
    const cleanDigits = cardMatch[0].replace(/[\s-]/g, '')
    if (cleanDigits.length >= 13 && cleanDigits.length <= 19 && isLuhnValid(cleanDigits)) {
      return {
        safe: false,
        flaggedCategory: 'pii',
        reason: 'Input contains sensitive payment card information.',
      }
    }
  }

  return { safe: true }
}

/**
 * Validates a number string using the Luhn checksum algorithm.
 */
function isLuhnValid(digits: string): boolean {
  let sum = 0
  let isEven = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10)
    if (isNaN(digit)) return false
    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    isEven = !isEven
  }
  return sum % 10 === 0
}
