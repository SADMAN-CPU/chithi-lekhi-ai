'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Heart,
  Search,
  Trash2,
  Share2,
  Copy,
  Check,
  Plus,
  LogOut,
  Calendar,
  Sparkles,
  BookOpen,
  Eye,
  X,
  FileText,
  Image as ImageIcon,
  Download,
  Globe,
  ExternalLink,
  Edit3,
  Sliders,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { formatDate } from '@/utils/helpers'
import { shareLetter } from '@/lib/share-engine'
import { DashboardSettingsView } from '@/components/dashboard/DashboardSettingsView'
import { RELATIONSHIP_OPTIONS, EMOTIONS } from '@/constants'
import type { LetterRow, DownloadHistoryRow, PublicLetterRow } from '@/types/database'
import dynamic from 'next/dynamic'

// Lazy-load heavy modal visual studios to prevent bloated initial dashboard bundle
const VintageLetterVisualStudio = dynamic(
  () => import('@/components/letter/VintageLetterVisualStudio').then((mod) => mod.VintageLetterVisualStudio),
  { ssr: false }
)
const VintagePdfModal = dynamic(
  () => import('@/components/letter/VintagePdfModal').then((mod) => mod.VintagePdfModal),
  { ssr: false }
)

export type DashboardTab = 'my-letters' | 'favorites' | 'drafts' | 'downloads' | 'shared' | 'profile'

interface DashboardLetterCardProps {
  letter: LetterRow
  isCopied: boolean
  onToggleFavorite: (id: string, current: boolean) => void
  onDelete: (id: string) => void
  onCopy: (id: string, text: string) => void
  onEdit: (letter: LetterRow) => void
  onPdf: (letter: LetterRow) => void
  onVisual: (letter: LetterRow) => void
  onRead: (letter: LetterRow) => void
}

const DashboardLetterCard = React.memo(function DashboardLetterCard({
  letter,
  isCopied,
  onToggleFavorite,
  onDelete,
  onCopy,
  onEdit,
  onPdf,
  onVisual,
  onRead,
}: DashboardLetterCardProps) {
  const { locale } = useLanguage()

  const handleWhatsAppShare = () => {
    shareLetter({
      platform: 'whatsapp',
      letterText: letter.content,
      receiverName: letter.receiver_name,
    })
  }

  return (
    <div className="paper-card rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-all duration-200 group relative">
      {/* Card Top */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-sans text-neutral-400 dark:text-neutral-500 font-semibold tracking-wider block">
              FOR
            </span>
            <h3 className="font-bengali font-bold text-base text-neutral-900 dark:text-neutral-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              {letter.receiver_name}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            {/* Favorite */}
            <button
              type="button"
              onClick={() => onToggleFavorite(letter.id, letter.favorite)}
              title={
                letter.favorite
                  ? locale === 'en'
                    ? 'Remove from favorites'
                    : 'প্রিয় থেকে সরান'
                  : locale === 'en'
                  ? 'Add to favorites'
                  : 'প্রিয়তে যোগ করুন'
              }
              className={`p-2 rounded-xl transition-all min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer ${
                letter.favorite
                  ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                  : 'text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-neutral-800'
              }`}
            >
              <Heart className={`w-4 h-4 ${letter.favorite ? 'fill-rose-500' : ''}`} />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => onDelete(letter.id)}
              title={locale === 'en' ? 'Delete letter' : 'চিঠি মুছে ফেলুন'}
              className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {letter.status === 'draft' && (
            <span className="text-[10px] font-bengali bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
              {locale === 'en' ? 'Draft' : 'খসড়া (Draft)'}
            </span>
          )}
          {letter.relationship && (
            <span className="text-[10px] font-bengali bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-900/40">
              {letter.relationship}
            </span>
          )}
          {letter.emotion && (
            <span className="text-[10px] font-bengali bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-md">
              {letter.emotion}
            </span>
          )}
        </div>
      </div>

      {/* Content Preview */}
      <p className="font-bengali text-xs sm:text-sm text-neutral-700 dark:text-neutral-200 line-clamp-4 leading-relaxed whitespace-pre-wrap">
        {letter.content}
      </p>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-rose-100/60 dark:border-neutral-800 flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 text-xs text-neutral-400 dark:text-neutral-500 font-bengali">
        <div className="flex items-center gap-1 shrink-0">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(letter.created_at, locale)}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => onCopy(letter.id, letter.content)}
            title={locale === 'en' ? 'Copy letter' : 'কপি করুন'}
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors cursor-pointer"
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            title={locale === 'en' ? 'Share on WhatsApp' : 'হোয়াটসঅ্যাপে শেয়ার'}
            className="text-neutral-500 dark:text-neutral-400 hover:text-[#25D366] p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onEdit(letter)}
            title={locale === 'en' ? 'Edit letter' : 'চিঠি সম্পাদনা করুন'}
            className="inline-flex items-center gap-1 font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2.5 py-1.5 rounded-lg text-xs min-h-[36px] transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{locale === 'en' ? 'Edit' : 'সম্পাদনা'}</span>
          </button>

          <button
            type="button"
            onClick={() => onPdf(letter)}
            title={locale === 'en' ? 'Download A4 PDF' : 'এ৪ পিডিএফ তৈরি করুন'}
            className="inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-200 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 px-2.5 py-1.5 rounded-lg text-xs min-h-[36px] transition-colors border border-rose-200/50 dark:border-rose-900/40 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>{locale === 'en' ? 'PDF' : 'পিডিএফ'}</span>
          </button>

          <button
            type="button"
            onClick={() => onVisual(letter)}
            title={locale === 'en' ? 'Generate Image Card' : 'ইমেজ কার্ড তৈরি করুন'}
            className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 px-2.5 py-1.5 rounded-lg text-xs min-h-[36px] transition-colors border border-amber-200/50 dark:border-amber-900/40 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{locale === 'en' ? 'Card' : 'ইমেজ'}</span>
          </button>

          <button
            type="button"
            onClick={() => onRead(letter)}
            className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 px-2.5 py-1.5 rounded-lg text-xs min-h-[36px] transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{locale === 'en' ? 'Read' : 'পড়ুন'}</span>
          </button>
        </div>
      </div>
    </div>
  )
})

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { t, locale } = useLanguage()

  // Tab State - initialized with URL query param support
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const tabParam = searchParams.get('tab')
      if (tabParam === 'settings' || tabParam === 'profile') {
        return 'profile'
      }
      if (tabParam && ['my-letters', 'favorites', 'drafts', 'downloads', 'shared'].includes(tabParam)) {
        return tabParam as DashboardTab
      }
    }
    return 'my-letters'
  })

  // Listen for browser history popstate navigation
  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search)
      const tabParam = searchParams.get('tab')
      if (tabParam === 'settings' || tabParam === 'profile') {
        setActiveTab('profile')
      } else if (tabParam && ['my-letters', 'favorites', 'drafts', 'downloads', 'shared'].includes(tabParam)) {
        setActiveTab(tabParam as DashboardTab)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Data States
  const [letters, setLetters] = useState<LetterRow[]>([])
  const [sharedLetters, setSharedLetters] = useState<PublicLetterRow[]>([])
  const [downloads, setDownloads] = useState<DownloadHistoryRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // Filters State & Debounced Search
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [emotionFilter, setEmotionFilter] = useState<string>('all')
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all')
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  // Pagination State (9 letters per page)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 9

  // 250ms Debounced search for high responsiveness without laggy re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset pagination on filter or tab change without cascading effect render
  const filterKey = `${activeTab}:${debouncedSearchQuery}:${emotionFilter}:${relationshipFilter}:${timeframeFilter}:${sortOrder}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)

  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setPage(1)
  }

  // Modals & Feedback
  const [readingLetter, setReadingLetter] = useState<LetterRow | null>(null)
  const [visualStudioLetter, setVisualStudioLetter] = useState<LetterRow | null>(null)
  const [pdfModalLetter, setPdfModalLetter] = useState<LetterRow | null>(null)
  const [editingLetter, setEditingLetter] = useState<LetterRow | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Effective user identifier
  const effectiveUserId = user?.id || 'guest-user'

  // Fetch letters & dashboard data
  useEffect(() => {
    if (authLoading) return

    const loadDashboardData = async () => {
      setDataLoading(true)
      try {
        // 1. Fetch user's letters (published & drafts)
        const res = await fetch(
          `/api/letters?userId=${encodeURIComponent(effectiveUserId)}&status=all`
        )
        const data = await res.json()
        if (data.success && Array.isArray(data.letters)) {
          setLetters(data.letters)
        }

        // 2. Fetch shared letters
        const sharedRes = await fetch(
          `/api/user/shared-letters?userId=${encodeURIComponent(effectiveUserId)}`
        )
        const sharedData = await sharedRes.json()
        if (sharedData.success && Array.isArray(sharedData.sharedLetters)) {
          setSharedLetters(sharedData.sharedLetters)
        }

        // 3. Fetch download history
        const dlRes = await fetch(
          `/api/downloads?userId=${encodeURIComponent(effectiveUserId)}`
        )
        const dlData = await dlRes.json()
        if (dlData.success && Array.isArray(dlData.downloads)) {
          setDownloads(dlData.downloads)
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setDataLoading(false)
      }
    }

    loadDashboardData()
  }, [user, authLoading, effectiveUserId])

  // Handle Toggle Favorite (with rollback on failure)
  const handleToggleFavorite = useCallback(async (letterId: string, currentFavorite: boolean) => {
    // Optimistic UI update
    setLetters((prev) =>
      prev.map((l) => (l.id === letterId ? { ...l, favorite: !currentFavorite } : l))
    )

    try {
      const res = await fetch('/api/letters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: letterId,
          action: 'toggle-favorite',
          currentFavorite,
        }),
      })
      if (!res.ok) {
        throw new Error('Server returned error')
      }
    } catch (err) {
      console.error('Toggle favorite error:', err)
      // Rollback to original favorite status
      setLetters((prev) =>
        prev.map((l) => (l.id === letterId ? { ...l, favorite: currentFavorite } : l))
      )
    }
  }, [])

  // Handle Delete Letter (with rollback on failure)
  const handleDeleteLetter = useCallback(async (letterId: string) => {
    const confirmMsg = locale === 'en'
      ? 'Are you sure you want to delete this letter?'
      : 'আপনি কি নিশ্চিত যে এই চিঠিটি মুছে ফেলতে চান?'
    if (!confirm(confirmMsg)) return

    let previousLetters: LetterRow[] = []
    setLetters((prev) => {
      previousLetters = prev
      return prev.filter((l) => l.id !== letterId)
    })
    setReadingLetter((prev) => (prev?.id === letterId ? null : prev))

    try {
      const res = await fetch(`/api/letters?id=${encodeURIComponent(letterId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Failed to delete letter from database')
      }
    } catch (err) {
      console.error('Delete letter error:', err)
      // Rollback UI to previous letters
      setLetters(previousLetters)
      alert(
        locale === 'en'
          ? 'Failed to delete letter. Please try again.'
          : 'চিঠি মুছে ফেলা সম্ভব হয়নি। আবার চেষ্টা করুন।'
      )
    }
  }, [locale])

  // Handle Save Edit (with robust response validation)
  const handleSaveEdit = async () => {
    if (!editingLetter) return
    setIsSavingEdit(true)

    try {
      const res = await fetch(`/api/letters/${editingLetter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          letter_content: editContent,
        }),
      })

      if (!res.ok) {
        throw new Error(`Server returned error status ${res.status}`)
      }

      const data = await res.json()
      if (data.success && data.letter) {
        setLetters((prev) =>
          prev.map((l) => (l.id === editingLetter.id ? { ...l, ...data.letter } : l))
        )
        setEditingLetter(null)
      } else {
        throw new Error(data.error?.message || 'Failed to update letter')
      }
    } catch (err) {
      console.error('Save edit error:', err)
      alert(
        locale === 'en'
          ? 'Failed to save changes. Please try again.'
          : 'চিঠির পরিবর্তন সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
      )
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Handle Copy to clipboard
  const handleCopy = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback
    }
  }, [])

  // Filtered Letters Computation (with debounced search)
  const filteredLetters = useMemo(() => {
    return letters
      .filter((letter) => {
        // Tab category filter
        if (activeTab === 'my-letters' && letter.status === 'draft') {
          return false
        }
        if (activeTab === 'favorites' && (!letter.favorite || letter.status === 'draft')) {
          return false
        }
        if (activeTab === 'drafts' && letter.status !== 'draft') {
          return false
        }

        // Emotion filter
        if (emotionFilter !== 'all' && letter.emotion !== emotionFilter) {
          return false
        }

        // Relationship filter
        if (relationshipFilter !== 'all' && letter.relationship !== relationshipFilter) {
          return false
        }

        // Timeframe filter
        if (timeframeFilter !== 'all') {
          const letterTime = new Date(letter.created_at).getTime()
          const now = new Date()
          if (timeframeFilter === 'today') {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
            if (letterTime < startOfDay) return false
          } else if (timeframeFilter === 'week') {
            if (letterTime < now.getTime() - 7 * 24 * 3600 * 1000) return false
          } else if (timeframeFilter === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
            if (letterTime < startOfMonth) return false
          }
        }

        // Search Query filter (uses debouncedSearchQuery to prevent lag)
        if (debouncedSearchQuery.trim()) {
          const q = debouncedSearchQuery.toLowerCase()
          const matchesName = letter.receiver_name.toLowerCase().includes(q)
          const matchesContent = letter.content.toLowerCase().includes(q)
          const matchesEmotion = letter.emotion?.toLowerCase().includes(q)
          return matchesName || matchesContent || matchesEmotion
        }

        return true
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime()
        const timeB = new Date(b.created_at).getTime()
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB
      })
  }, [
    letters,
    activeTab,
    emotionFilter,
    relationshipFilter,
    timeframeFilter,
    debouncedSearchQuery,
    sortOrder,
  ])

  // Paginated Letters Slice for smooth mobile DOM rendering
  const paginatedLetters = useMemo(() => {
    return filteredLetters.slice(0, page * PAGE_SIZE)
  }, [filteredLetters, page, PAGE_SIZE])

  const hasMoreLetters = filteredLetters.length > paginatedLetters.length

  // Filtered Shared Letters
  const filteredSharedLetters = useMemo(() => {
    return sharedLetters.filter((item) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        item.receiver_name.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.letter_content.toLowerCase().includes(q)
      )
    })
  }, [sharedLetters, searchQuery])

  // Stats Calculations
  const stats = useMemo(() => {
    const published = letters.filter((l) => l.status !== 'draft').length
    const favorites = letters.filter((l) => l.favorite && l.status !== 'draft').length
    const drafts = letters.filter((l) => l.status === 'draft').length
    const shared = sharedLetters.length
    const downloadCount = downloads.length
    return { published, favorites, drafts, shared, downloadCount }
  }, [letters, sharedLetters, downloads])

  // Card Action Callbacks
  const handleEditLetterSelect = useCallback((letter: LetterRow) => {
    setEditingLetter(letter)
    setEditContent(letter.letter_content || letter.content)
    setEditTitle(letter.title || `চিঠি — প্রিয় ${letter.receiver_name}-এর জন্য`)
  }, [])

  const handlePdfModalSelect = useCallback((letter: LetterRow) => {
    setPdfModalLetter(letter)
  }, [])

  const handleVisualModalSelect = useCallback((letter: LetterRow) => {
    setVisualStudioLetter(letter)
  }, [])

  const handleReadLetterSelect = useCallback((letter: LetterRow) => {
    setReadingLetter(letter)
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-chithi-gradient flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-rose-400 border-t-transparent rounded-full animate-spin" />
          <p className="font-bengali text-sm text-neutral-600 dark:text-neutral-300">
            {locale === 'en' ? 'Loading dashboard...' : 'ড্যাশবোর্ড লোড হচ্ছে...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-chithi-gradient flex flex-col selection:bg-rose-100 selection:text-rose-800">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full border-b border-rose-100/80 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-xs">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <span className="font-bengali font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100">
              {t('dashboard.title')}
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              title={locale === 'en' ? 'Settings & Profile' : 'সেটিংস ও প্রোফাইল'}
              className={`p-2 rounded-xl transition-colors border min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-neutral-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-xs transition-colors min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>{t('dashboard.newLetterBtn')}</span>
            </Link>

            {user ? (
              <button
                type="button"
                onClick={signOut}
                title="লগআউট"
                className="p-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-rose-100 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/login?redirectedFrom=/dashboard"
                className="py-2 px-3 rounded-xl text-xs font-bengali font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors min-h-[40px] flex items-center"
              >
                লগইন
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Welcome & 5 SaaS Quick Stats */}
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs border border-rose-100/80 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bengali text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200/50 dark:border-rose-900/40">
              <Sparkles className="w-3 h-3 text-rose-500" />
              <span>চিঠির সংগ্রহশালা ও নিয়ন্ত্রণ কেন্দ্র</span>
            </div>
            <h1 className="font-bengali text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {t('dashboard.welcome')} {user?.name || t('dashboard.guest')} 👋
            </h1>
            <p className="font-bengali text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              {t('dashboard.headerDesc')}
            </p>
          </div>

          {/* 5 Stats Counter Grid */}
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
            <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-100/80 dark:border-rose-900/50 p-2.5 rounded-2xl text-center">
              <span className="text-lg sm:text-xl font-bold font-sans text-rose-600 dark:text-rose-400 block leading-tight">
                {stats.published}
              </span>
              <span className="text-[11px] font-bengali text-neutral-600 dark:text-neutral-400">{t('dashboard.tabMyLetters')}</span>
            </div>
            <div className="bg-pink-50/70 dark:bg-pink-950/40 border border-pink-100/80 dark:border-pink-900/50 p-2.5 rounded-2xl text-center">
              <span className="text-lg sm:text-xl font-bold font-sans text-pink-600 dark:text-pink-400 block leading-tight">
                {stats.favorites}
              </span>
              <span className="text-[11px] font-bengali text-neutral-600 dark:text-neutral-400">{t('dashboard.tabFavorites')}</span>
            </div>
            <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100/80 dark:border-amber-900/50 p-2.5 rounded-2xl text-center">
              <span className="text-lg sm:text-xl font-bold font-sans text-amber-700 dark:text-amber-400 block leading-tight">
                {stats.drafts}
              </span>
              <span className="text-[11px] font-bengali text-neutral-600 dark:text-neutral-400">{t('dashboard.tabDrafts')}</span>
            </div>
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/50 p-2.5 rounded-2xl text-center">
              <span className="text-lg sm:text-xl font-bold font-sans text-indigo-600 dark:text-indigo-400 block leading-tight">
                {stats.shared}
              </span>
              <span className="text-[11px] font-bengali text-neutral-600 dark:text-neutral-400">{t('dashboard.tabShared')}</span>
            </div>
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100/80 dark:border-emerald-900/50 p-2.5 rounded-2xl text-center col-span-2 xs:col-span-1">
              <span className="text-lg sm:text-xl font-bold font-sans text-emerald-600 dark:text-emerald-400 block leading-tight">
                {stats.downloadCount}
              </span>
              <span className="text-[11px] font-bengali text-neutral-600 dark:text-neutral-400">{t('dashboard.tabDownloads')}</span>
            </div>
          </div>
        </div>

        {/* 5 Tab Navigation Strip */}
        <div className="flex border-b border-neutral-200/80 dark:border-neutral-800 gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('my-letters')}
            className={`pb-3 px-3 sm:px-4 font-bengali text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap min-h-[44px] cursor-pointer ${
              activeTab === 'my-letters'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{t('dashboard.tabMyLetters')} ({stats.published})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 px-3 sm:px-4 font-bengali text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap min-h-[44px] cursor-pointer ${
              activeTab === 'favorites'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Heart className="w-4 h-4 fill-rose-500 text-rose-500 dark:text-rose-400" />
            <span>{t('dashboard.tabFavorites')} ({stats.favorites})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drafts')}
            className={`pb-3 px-3 sm:px-4 font-bengali text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap min-h-[44px] cursor-pointer ${
              activeTab === 'drafts'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>{t('dashboard.tabDrafts')} ({stats.drafts})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shared')}
            className={`pb-3 px-3 sm:px-4 font-bengali text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap min-h-[44px] cursor-pointer ${
              activeTab === 'shared'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>{t('dashboard.tabShared')} ({stats.shared})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('downloads')}
            className={`pb-3 px-3 sm:px-4 font-bengali text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap min-h-[44px] cursor-pointer ${
              activeTab === 'downloads'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{t('dashboard.tabDownloads')} ({stats.downloadCount})</span>
          </button>

          {user && (
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`pb-3 px-3 sm:px-4 font-bengali text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap sm:ml-auto min-h-[44px] cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>{locale === 'en' ? 'Settings & Profile' : 'সেটিংস ও প্রোফাইল'}</span>
            </button>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1, 2, 3: LETTERS GRID (My Letters, Favorites, Drafts)
           ───────────────────────────────────────────────────────────── */}
        {['my-letters', 'favorites', 'drafts'].includes(activeTab) && (
          <div className="space-y-6">
            {/* Search & Multi-Filters Toolbar */}
            <div className="bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="প্রাপকের নাম বা চিঠির কোনো অংশ খুঁজুন..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs sm:text-sm font-bengali text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950 outline-none transition-all min-h-[44px]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Emotion Filter */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <select
                    value={emotionFilter}
                    onChange={(e) => setEmotionFilter(e.target.value)}
                    aria-label="আবেগ অনুযায়ী ফিল্টার"
                    className="py-2 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bengali text-neutral-700 dark:text-neutral-200 outline-none focus:border-rose-400 min-h-[44px] w-full sm:w-auto cursor-pointer"
                  >
                    <option value="all">সব অনুভূতি</option>
                    {EMOTIONS.map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Relationship Filter */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <select
                    value={relationshipFilter}
                    onChange={(e) => setRelationshipFilter(e.target.value)}
                    aria-label="সম্পর্ক অনুযায়ী ফিল্টার"
                    className="py-2 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bengali text-neutral-700 dark:text-neutral-200 outline-none focus:border-rose-400 min-h-[44px] w-full sm:w-auto cursor-pointer"
                  >
                    <option value="all">সব সম্পর্ক</option>
                    {RELATIONSHIP_OPTIONS.map((rel) => (
                      <option key={rel.value} value={rel.value}>
                        {rel.emoji} {rel.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date / Timeframe Filter */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <select
                    value={timeframeFilter}
                    onChange={(e) =>
                      setTimeframeFilter(e.target.value as 'all' | 'today' | 'week' | 'month')
                    }
                    aria-label="তারিখ অনুযায়ী ফিল্টার"
                    className="py-2 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bengali text-neutral-700 dark:text-neutral-200 outline-none focus:border-rose-400 min-h-[44px] w-full sm:w-auto cursor-pointer"
                  >
                    <option value="all">সব সময়</option>
                    <option value="today">আজকের চিঠি</option>
                    <option value="week">গত ৭ দিন</option>
                    <option value="month">এই মাস</option>
                  </select>
                </div>

                {/* Sort Filter: Newest vs Oldest */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    aria-label="চিঠি সাজান"
                    className="py-2 px-3 rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/40 text-xs font-bengali text-rose-900 dark:text-rose-200 font-semibold outline-none focus:border-rose-400 min-h-[44px] w-full sm:w-auto cursor-pointer"
                  >
                    <option value="newest">নতুনতম (Newest)</option>
                    <option value="oldest">পুরাতনতম (Oldest)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Letter Cards Grid */}
            {dataLoading ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="font-bengali text-xs text-neutral-500 dark:text-neutral-400">চিঠিগুলো সাজানো হচ্ছে...</p>
              </div>
            ) : filteredLetters.length === 0 ? (
              <div className="bg-white/70 dark:bg-neutral-900/70 border border-dashed border-rose-200 dark:border-neutral-800 rounded-3xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-bengali font-bold text-neutral-800 dark:text-neutral-100 text-lg">
                  {activeTab === 'favorites'
                    ? 'কোনো প্রিয় চিঠি পাওয়া যায়নি'
                    : activeTab === 'drafts'
                    ? 'কোনো খসড়া চিঠি নেই'
                    : 'চিঠি পাওয়া যায়নি'}
                </h3>
                <p className="font-bengali text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  {activeTab === 'favorites'
                    ? 'যেকোনো চিঠির ওপর হার্ট আইকন ক্লিক করে প্রিয় তালিকায় যুক্ত করুন।'
                    : 'আপনার নতুন আবেগঘন চিঠি লিখতে এখনই শুরু করুন।'}
                </p>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bengali text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-xs transition-colors min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন চিঠি লিখুন</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paginatedLetters.map((letter) => (
                    <DashboardLetterCard
                      key={letter.id}
                      letter={letter}
                      isCopied={copiedId === letter.id}
                      onToggleFavorite={handleToggleFavorite}
                      onDelete={handleDeleteLetter}
                      onCopy={handleCopy}
                      onEdit={handleEditLetterSelect}
                      onPdf={handlePdfModalSelect}
                      onVisual={handleVisualModalSelect}
                      onRead={handleReadLetterSelect}
                    />
                  ))}
                </div>

                {/* Pagination & Load More Control */}
                {hasMoreLetters && (
                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-rose-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-rose-50/80 dark:hover:bg-neutral-700 text-rose-800 dark:text-rose-300 font-bengali text-xs sm:text-sm font-semibold transition-all shadow-xs min-h-[44px] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>আরও চিঠি লোড করুন ({paginatedLetters.length} / {filteredLetters.length})</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: SHARED LETTERS (Active Public Links)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'shared' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bengali font-bold text-lg text-neutral-900 dark:text-neutral-100">
                  অনলাইনে শেয়ার করা চিঠি ({sharedLetters.length})
                </h3>
                <p className="text-xs font-bengali text-neutral-500 dark:text-neutral-400">
                  আপনার তৈরি করা প্রতিটি পাবলিক লিংক এবং তাদের ভিউ সংখ্যা
                </p>
              </div>
            </div>

            {sharedLetters.length === 0 ? (
              <div className="bg-white/70 dark:bg-neutral-900/70 border border-dashed border-rose-200 dark:border-neutral-800 rounded-3xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="font-bengali font-bold text-neutral-800 dark:text-neutral-100 text-lg">
                  এখনও কোনো চিঠি শেয়ার করা হয়নি
                </h3>
                <p className="font-bengali text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  যেকোনো চিঠি তৈরির পর &ldquo;শেয়ার লিংক তৈরি&rdquo; বাটনে ক্লিক করে শর্ট লিংক তৈরি করুন।
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSharedLetters.map((shared) => {
                  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://chithilekhi.com'}/c/${shared.short_id}`
                  const isCopied = copiedId === shared.short_id

                  return (
                    <div
                      key={shared.id}
                      className="bg-white/90 dark:bg-neutral-900/90 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bengali font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100">
                            {shared.title}
                          </h4>
                          <span className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/40">
                            <Eye className="w-3 h-3" />
                            <span>{shared.views} views</span>
                          </span>
                        </div>

                        <p className="text-xs font-bengali text-neutral-600 dark:text-neutral-300 line-clamp-2">
                          {shared.letter_content}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] font-bengali text-neutral-400 dark:text-neutral-500">
                          <span>তৈরি: {formatDate(shared.created_at)}</span>
                          <span>•</span>
                          <span className="capitalize">{shared.theme}</span>
                          {shared.expiration !== 'permanent' && (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 dark:text-amber-400">মেয়াদ: {shared.expiration}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Link & Action Box */}
                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300 truncate bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded-lg flex-1">
                          /c/{shared.short_id}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(shared.short_id, shareUrl)}
                            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                            title="লিংক কপি করুন"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <a
                            href={shareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                            title="খুলুন"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: DOWNLOAD HISTORY
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'downloads' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bengali font-bold text-lg text-neutral-900 dark:text-neutral-100">
                ডাউনলোড হিস্ট্রি ({downloads.length})
              </h3>
              <p className="text-xs font-bengali text-neutral-500 dark:text-neutral-400">
                আপনার ডাউনলোড করা পিডিএফ, ইমেজ এবং টেক্সট ফাইলের রেকর্ড
              </p>
            </div>

            {downloads.length === 0 ? (
              <div className="bg-white/70 dark:bg-neutral-900/70 border border-dashed border-rose-200 dark:border-neutral-800 rounded-3xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="font-bengali font-bold text-neutral-800 dark:text-neutral-100 text-lg">
                  এখনও কোনো ফাইল ডাউনলোড করা হয়নি
                </h3>
                <p className="font-bengali text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  চিঠি তৈরির পর এ৪ পিডিএফ বা ইমেজ কার্ড ডাউনলোড করলে তা এখানে তালিকাভুক্ত থাকবে।
                </p>
              </div>
            ) : (
              <div className="bg-white/90 dark:bg-neutral-900/90 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden shadow-2xs">
                {downloads.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-xs uppercase">
                        {item.format}
                      </div>
                      <div>
                        <h4 className="font-bengali font-semibold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100">
                          {item.format.toUpperCase()} ফাইল ডাউনলোড
                        </h4>
                        <span className="text-[11px] font-bengali text-neutral-400 dark:text-neutral-500">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-bengali font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-0.5 rounded-full">
                      সম্পন্ন
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 6: PROFILE & ACCOUNT SETTINGS
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'profile' && user && (
          <DashboardSettingsView user={user} stats={stats} onSignOut={signOut} />
        )}
      </main>

      {/* Full Letter Reader Modal */}
      {readingLetter && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-10 shadow-2xl space-y-6 relative border border-rose-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setReadingLetter(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs uppercase font-sans text-neutral-400 dark:text-neutral-500 tracking-widest block mb-1">
                SAVED LETTER
              </span>
              <h2 className="font-bengali text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                প্রিয় {readingLetter.receiver_name}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bengali text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200/50 dark:border-rose-900/40">
                  {readingLetter.relationship || 'চিঠি'}
                </span>
                <span className="text-xs text-neutral-400 dark:text-neutral-500 font-bengali">
                  {formatDate(readingLetter.created_at)}
                </span>
              </div>
            </div>

            <div className="letter-body font-bengali text-neutral-800 dark:text-neutral-200 text-base sm:text-lg leading-relaxed sm:leading-loose whitespace-pre-wrap p-6 rounded-2xl bg-amber-50/40 dark:bg-neutral-950/60 border border-amber-100/60 dark:border-neutral-800">
              {readingLetter.content}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleToggleFavorite(readingLetter.id, readingLetter.favorite)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bengali font-medium border transition-colors min-h-[44px] cursor-pointer ${
                  readingLetter.favorite
                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                    : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Heart className={`w-4 h-4 ${readingLetter.favorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{readingLetter.favorite ? 'প্রিয় তালিকা থেকে সরান' : 'প্রিয়তে রাখুন'}</span>
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleCopy(readingLetter.id, readingLetter.content)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bengali font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors min-h-[44px] cursor-pointer"
                >
                  {copiedId === readingLetter.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>কপি করুন</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const l = readingLetter
                    setReadingLetter(null)
                    setVisualStudioLetter(l)
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bengali font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors min-h-[44px] cursor-pointer shadow-xs"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>ইমেজ কার্ড</span>
                </button>

                <button
                  type="button"
                  onClick={() => shareLetter({
                    platform: 'whatsapp',
                    letterText: readingLetter.content,
                    receiverName: readingLetter.receiver_name,
                  })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bengali font-medium bg-[#25D366] hover:bg-[#20bd5a] text-white transition-colors min-h-[44px] cursor-pointer shadow-xs"
                >
                  <Share2 className="w-4 h-4" />
                  <span>হোয়াটসঅ্যাপ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Studio Modal */}
      {visualStudioLetter && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="my-auto w-full">
            <VintageLetterVisualStudio
              letter={visualStudioLetter.content}
              receiverName={visualStudioLetter.receiver_name}
              relationship={visualStudioLetter.relationship || undefined}
              date={visualStudioLetter.created_at}
              onClose={() => setVisualStudioLetter(null)}
            />
          </div>
        </div>
      )}

      {/* Vintage A4 PDF Modal */}
      {pdfModalLetter && (
        <VintagePdfModal
          letter={pdfModalLetter.letter_content || pdfModalLetter.content}
          receiverName={pdfModalLetter.receiver_name}
          relationship={pdfModalLetter.relationship || undefined}
          onClose={() => setPdfModalLetter(null)}
        />
      )}

      {/* Edit Letter Modal */}
      {editingLetter && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-rose-100 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h3 className="font-bengali font-bold text-lg text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span>চিঠি সম্পাদনা করুন (Edit Letter)</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingLetter(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bengali font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  চিঠির শিরোনাম (Title):
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 text-xs sm:text-sm font-bengali text-neutral-900 dark:text-neutral-100 focus:border-rose-400 outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bengali font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  চিঠির মূল বক্তব্য (Letter Content):
                </label>
                <textarea
                  rows={8}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 text-xs sm:text-sm font-bengali text-neutral-900 dark:text-neutral-100 focus:border-rose-400 outline-none leading-relaxed resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setEditingLetter(null)}
                className="py-2.5 px-4 rounded-xl font-bengali text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors min-h-[44px] cursor-pointer"
              >
                বাতিল
              </button>

              <button
                type="button"
                disabled={isSavingEdit || !editContent.trim()}
                onClick={handleSaveEdit}
                className="py-2.5 px-5 rounded-xl font-bengali text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                {isSavingEdit ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
