import { z } from 'zod'

export const generateLetterSchema = z.object({
  receiverName: z
    .string()
    .min(1, 'প্রাপকের নাম আবশ্যক / Receiver name is required')
    .max(60, 'Name must be under 60 characters')
    .trim(),
  relationship: z
    .string()
    .min(1, 'সম্পর্ক নির্বাচন করুন / Relationship is required')
    .max(60),
  memory: z
    .string()
    .max(600, 'Memory description must be under 600 characters')
    .optional()
    .or(z.literal('')),
  situation: z
    .string()
    .max(600, 'Current situation must be under 600 characters')
    .optional()
    .or(z.literal('')),
  feeling: z
    .string()
    .min(1, 'মনের অনুভূতি লিখুন / Feeling is required')
    .max(300, 'Feeling must be under 300 characters')
    .trim(),
  letterLength: z.enum(['short', 'medium', 'long']).default('medium'),
  eraStyle: z.enum(['modern', '90s-handwritten', 'vintage']).default('90s-handwritten'),
  language: z.enum(['bengali', 'english', 'banglish']).default('bengali'),

  // Optional fields for backward compatibility and Phase 03 8 Personalities
  personality: z
    .enum([
      'deep-emotional',
      'romantic',
      'poetic',
      'rabindranath-classical',
      '90s-handwritten',
      'simple-human',
      'funny-friend',
      'mature-apology',
    ])
    .optional(),
  category: z
    .enum(['love', 'friendship', 'family', 'apology', 'missing', 'motivation', 'secret'])
    .optional(),
  style: z
    .enum([
      'deep-emotional',
      'romantic',
      'poetic',
      'rabindranath-classical',
      '90s-handwritten',
      'simple-human',
      'funny-friend',
      'mature-apology',
      'vintage',
      'emotional',
      'deep',
      'simple',
      'mature',
      'funny',
    ])
    .optional(),
  emotion: z.string().max(100).optional(),
})

export type GenerateLetterInput = z.infer<typeof generateLetterSchema>

// ─── Phase 04: AI Letter Refinement Schema ────────────────────────────────────

export const refineActionEnum = z.enum([
  'emotional',
  'more-emotional',
  'make-more-emotional',
  'deep-feelings',
  'deeper-feeling',
  'formal',
  'simple',
  'simpler',
  'simpler-language',
  'make-simpler',
  'romantic',
  'more-romantic',
  'make-more-romantic',
  'professional',
  'short-version',
  'make-shorter',
  'shorter',
  'storytelling',
  'more-poetic',
  'make-more-poetic',
  'vintage-90s',
  'add-90s-vintage-feeling',
  '90s-vintage',
  '90s-style',
  'make-longer',
  'longer',
  'better-writing',
  'regenerate',
  'custom',
  'custom-instruction',
])

export type RefineAction = z.infer<typeof refineActionEnum>

export const refineLetterSchema = z
  .object({
    originalLetter: z.string().max(5000, 'Letter is too long to refine').optional(),
    letter: z.string().max(5000, 'Letter is too long to refine').optional(),
    action: refineActionEnum.optional(),
    refinementType: refineActionEnum.optional(),
    customInstruction: z.string().max(500, 'Custom instruction must be under 500 characters').optional(),
    personality: z.string().max(60).optional(),
    relationship: z.string().max(60).optional(),
    receiverName: z.string().max(60).optional(),
    language: z.enum(['bengali', 'english', 'banglish']).default('bengali'),
    memory: z.string().max(600).optional(),
    situation: z.string().max(600).optional(),
    feeling: z.string().max(300).optional(),
  })
  .refine(
    (data) => {
      const content = data.originalLetter?.trim() || data.letter?.trim()
      return Boolean(content && content.length >= 2)
    },
    { message: 'চিঠির বিষয়বস্তু বা ভাবনা আবশ্যক / Letter content or thought is required' }
  )
  .refine(
    (data) => Boolean(data.action || data.refinementType || data.customInstruction),
    { message: 'রিফাইনমেন্ট অ্যাকশন নির্বাচন করুন / Please select a refinement action' }
  )

export type RefineLetterInput = z.infer<typeof refineLetterSchema>
