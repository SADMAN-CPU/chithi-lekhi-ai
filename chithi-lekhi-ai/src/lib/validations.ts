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

  // Optional fields for backward compatibility with earlier specs
  category: z
    .enum(['love', 'friendship', 'family', 'apology', 'missing', 'motivation', 'secret'])
    .optional(),
  style: z
    .enum(['vintage', 'romantic', 'emotional', 'deep', 'simple', 'mature', 'poetic', 'funny'])
    .optional(),
  emotion: z.string().max(100).optional(),
})

export type GenerateLetterInput = z.infer<typeof generateLetterSchema>

// ─── Phase 04: AI Letter Refinement Schema ────────────────────────────────────

export const refineLetterSchema = z.object({
  letter: z
    .string()
    .min(20, 'বিদ্যমান চিঠির বিষয়বস্তু আবশ্যক / Existing letter content is required')
    .max(5000, 'Letter is too long to refine')
    .trim(),
  refinementType: z.enum([
    'more-emotional',
    'more-romantic',
    'simpler',
    'longer',
    'shorter',
    'vintage-90s',
  ]),
  receiverName: z.string().max(60).optional(),
  relationship: z.string().max(60).optional(),
  language: z.enum(['bengali', 'english', 'banglish']).optional(),
  memory: z.string().max(600).optional(),
  situation: z.string().max(600).optional(),
  feeling: z.string().max(300).optional(),
})

export type RefineLetterInput = z.infer<typeof refineLetterSchema>
