export type VoiceStyle =
  | 'warm-mother'
  | 'warm'
  | 'emotional'
  | 'storytelling'
  | 'professional'
  | 'vintage-radio'

export interface VoiceStyleConfig {
  id: VoiceStyle
  nameBn: string
  nameEn: string
  descriptionBn: string
  emoji: string
  openaiVoice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed: number
  speechRate: number
  speechPitch: number
  radioFilter: boolean
}

export const VOICE_STYLES: Record<VoiceStyle, VoiceStyleConfig> = {
  'warm-mother': {
    id: 'warm-mother',
    nameBn: 'স্নেহময়ী মা',
    nameEn: 'Warm Mother Voice',
    descriptionBn: 'কোমল, মমতাময়ী ও শান্ত সান্ত্বনাদায়ী মাতৃকণ্ঠ',
    emoji: '🤱',
    openaiVoice: 'shimmer',
    speed: 0.90,
    speechRate: 0.88,
    speechPitch: 1.05,
    radioFilter: false,
  },
  warm: {
    id: 'warm',
    nameBn: 'স্নেহময়ী মা',
    nameEn: 'Warm Mother Voice',
    descriptionBn: 'কোমল, মমতাময়ী ও শান্ত সান্ত্বনাদায়ী মাতৃকণ্ঠ',
    emoji: '🤱',
    openaiVoice: 'shimmer',
    speed: 0.90,
    speechRate: 0.88,
    speechPitch: 1.05,
    radioFilter: false,
  },
  emotional: {
    id: 'emotional',
    nameBn: 'আবেগঘন কণ্ঠ',
    nameEn: 'Emotional Voice',
    descriptionBn: 'হৃদয়ের গভীর আকুলতা ও ভালোবাসার স্পর্শবাহী কণ্ঠ',
    emoji: '❤️',
    openaiVoice: 'nova',
    speed: 0.88,
    speechRate: 0.84,
    speechPitch: 0.92,
    radioFilter: false,
  },
  storytelling: {
    id: 'storytelling',
    nameBn: 'স্মৃতিকাতর কথক',
    nameEn: 'Storytelling Voice',
    descriptionBn: 'নস্টালজিক সুর ও জীবন্ত স্মৃতিকাতর কথকতা',
    emoji: '📖',
    openaiVoice: 'fable',
    speed: 0.92,
    speechRate: 0.92,
    speechPitch: 1.0,
    radioFilter: false,
  },
  professional: {
    id: 'professional',
    nameBn: 'পেশাদার কণ্ঠ',
    nameEn: 'Professional Voice',
    descriptionBn: 'মার্জিত, সুসংহত, সুস্পষ্ট ও দায়িত্বশীল উচ্চারণ',
    emoji: '💼',
    openaiVoice: 'onyx',
    speed: 0.95,
    speechRate: 0.95,
    speechPitch: 0.95,
    radioFilter: false,
  },
  'vintage-radio': {
    id: 'vintage-radio',
    nameBn: 'পেশাদার কণ্ঠ',
    nameEn: 'Professional Voice',
    descriptionBn: 'মার্জিত, সুসংহত, সুস্পষ্ট ও দায়িত্বশীল উচ্চারণ',
    emoji: '💼',
    openaiVoice: 'onyx',
    speed: 0.95,
    speechRate: 0.95,
    speechPitch: 0.95,
    radioFilter: false,
  },
}
