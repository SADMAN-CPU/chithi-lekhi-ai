'use client'

import React, { useState } from 'react'
import { Sliders } from 'lucide-react'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { SettingsModal } from '@/components/settings/SettingsModal'

interface SettingsButtonProps {
  className?: string
  showLabel?: boolean
}

export function SettingsButton({ className = '', showLabel = false }: SettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useLanguage()

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title={t('settings.title')}
        aria-label="Open Settings"
        className={`p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100/80 hover:bg-neutral-200/80 dark:bg-neutral-800/80 dark:hover:bg-neutral-700/80 border border-neutral-200/60 dark:border-neutral-700/60 transition-all active:scale-95 flex items-center justify-center gap-1.5 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] cursor-pointer ${className}`}
      >
        <Sliders className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
        {showLabel && (
          <span className="text-xs font-bengali font-medium pr-1">
            {t('settings.title')}
          </span>
        )}
      </button>

      <SettingsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
