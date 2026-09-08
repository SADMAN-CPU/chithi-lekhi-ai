/**
 * Voice & Speech Utilities (Client & Server Safe)
 * Sanitizes letter text for natural spoken delivery without server-only dependencies.
 */

export function cleanLetterForSpeech(text: string): string {
  if (!text) return ''
  return text
    .replace(/\[(?:ডাকটিকিট|বিশেষ ভাবার্থ|বিশেষ ভাবনা|নোট|বি\.দ্র\.|Note|P\.S\.|Special Thought|উপসংহার)[^\]]*\]/gi, '')
    .replace(/\[[^\]]{1,100}\]/g, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/^#+\s*.*/gm, '')
    .replace(/^(তারিখ|Date|স্থান|Place|বিষয়|Subject|Title):\s*[^\n]*/gim, '')
    .replace(/[*_~`]/g, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
