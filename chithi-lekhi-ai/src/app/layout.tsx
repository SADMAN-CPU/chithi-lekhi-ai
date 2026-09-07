import type { Metadata, Viewport } from 'next'
import { Inter, Hind_Siliguri, Lora } from 'next/font/google'
import { JsonLd } from '@/components/seo/JsonLd'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider } from '@/components/providers/LanguageProvider'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

const hindSiliguri = Hind_Siliguri({
  variable: '--font-bengali',
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['bengali'],
  display: 'swap',
})

const lora = Lora({
  variable: '--font-serif',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Chithi Lekhi AI — চিঠি লেখাই',
    template: '%s | Chithi Lekhi AI',
  },
  description:
    'যে কথা মুখে বলা যায় না, চিঠিতে লিখে ফেলুন। AI-powered emotional letter generator in Bengali, English, and Banglish.',
  keywords: [
    'চিঠি',
    'letter',
    'AI letter',
    'Bengali letter',
    'emotional letter',
    'love letter',
    'chithi lekhi',
    'বাংলা চিঠি',
  ],
  authors: [{ name: 'Chithi Lekhi AI' }],
  creator: 'Chithi Lekhi AI',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    alternateLocale: 'en_US',
    title: 'Chithi Lekhi AI — AI দিয়ে চিঠি লিখুন',
    description:
      'যে কথা মুখে বলা যায় না, চিঠিতে লিখে ফেলুন। Free AI emotional letter generator.',
    siteName: 'Chithi Lekhi AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chithi Lekhi AI',
    description: 'AI-powered emotional letters in Bengali, English & Banglish',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#F9A8C9',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="bn"
      suppressHydrationWarning
      className={`${inter.variable} ${hindSiliguri.variable} ${lora.variable} h-full antialiased`}
    >
      <head>
        <JsonLd />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
