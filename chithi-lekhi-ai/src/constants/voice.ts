export type VoiceStyle = 'warm' | 'emotional' | 'storytelling' | 'vintage-radio'

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
  warm: {
    id: 'warm',
    nameBn: 'উষ্ণ ও স্নিগ্ধ',
    nameEn: 'Warm & Gentle',
    descriptionBn: 'কোমল, মমতাময় এবং শান্ত অনুভূতির কণ্ঠ',
    emoji: '🌸',
    openaiVoice: 'shimmer',
    speed: 0.92,
    speechRate: 0.88,
    speechPitch: 1.05,
    radioFilter: false,
  },
  emotional: {
    id: 'emotional',
    nameBn: 'গভীর আবেগী',
    nameEn: 'Deep Emotional',
    descriptionBn: 'হৃদয়ের গভীর স্পর্শকারী আকুল প্রকাশ',
    emoji: '❤️',
    openaiVoice: 'nova',
    speed: 0.9,
    speechRate: 0.82,
    speechPitch: 0.92,
    radioFilter: false,
  },
  storytelling: {
    id: 'storytelling',
    nameBn: 'গল্প কথক',
    nameEn: 'Storyteller',
    descriptionBn: 'চিঠির শব্দে স্মৃতি ও কথকতার মিষ্টি সুর',
    emoji: '📖',
    openaiVoice: 'fable',
    speed: 0.95,
    speechRate: 0.95,
    speechPitch: 1.0,
    radioFilter: false,
  },
  'vintage-radio': {
    id: 'vintage-radio',
    nameBn: '৯০ দশকের ভিন্টেজ',
    nameEn: 'Classic / Vintage',
    descriptionBn: 'নস্টালজিক ও ক্লাসিক অনুভূতি',
    emoji: '📻',
    openaiVoice: 'onyx',
    speed: 0.93,
    speechRate: 0.88,
    speechPitch: 0.95,
    radioFilter: true,
  },
}
