import React from 'react'

export function JsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Chithi Lekhi AI',
    alternateName: 'চিঠি লেখাই AI',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://chithi.ai',
    description:
      'যে কথা মুখে বলা যায় না, চিঠিতে লিখে ফেলুন। AI-powered emotional letter generator in Bengali, English, and Banglish.',
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BDT',
    },
    inLanguage: ['bn', 'en'],
    featureList: [
      'Emotional letter generation',
      '90s handwritten vintage styling',
      'WhatsApp direct letter sharing',
      'High-resolution visual card export',
      'Anonymous view-only letter links',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
