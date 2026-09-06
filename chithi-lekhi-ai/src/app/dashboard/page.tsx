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
  User,
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
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/utils/helpers'
import { shareLetter } from '@/lib/share-engine'
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
            <span className="text-[10px] uppercase font-sans text-neutral-400 font-semibold tracking-wider block">
              FOR
            </span>
            <h3 className="font-bengali font-bold text-base text-neutral-900 group-hover:text-rose-600 transition-colors">
              {letter.receiver_name}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            {/* Favorite */}
            <button
              type="button"
              onClick={() => onToggleFavorite(letter.id, letter.favorite)}
              title={letter.favorite ? 'প্রিয় থেকে সরান' : 'প্রিয়তে যোগ করুন'}
              className={`p-1.5 rounded-lg transition-all ${
                letter.favorite
                  ? 'text-rose-500 bg-rose-50 hover:bg-rose-100'
                  : 'text-neutral-400 hover:text-rose-500 hover:bg-rose-50'
              }`}
            >
              <Heart className={`w-4 h-4 ${letter.favorite ? 'fill-rose-500' : ''}`} />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => onDelete(letter.id)}
              title="চিঠি মুছে ফেলুন"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {letter.status === 'draft' && (
            <span className="text-[10px] font-bengali bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
              খসড়া (Draft)
            </span>
          )}
          {letter.relationship && (
            <span className="text-[10px] font-bengali bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-100">
              {letter.relationship}
            </span>
          )}
          {letter.emotion && (
            <span className="text-[10px] font-bengali bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">
              {letter.emotion}
            </span>
          )}
        </div>
      </div>

      {/* Content Preview */}
      <p className="font-bengali text-xs sm:text-sm text-neutral-700 line-clamp-4 leading-relaxed whitespace-pre-wrap">
        {letter.content}
      </p>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-rose-100/60 flex items-center justify-between text-xs text-neutral-400 font-bengali">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(letter.created_at)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCopy(letter.id, letter.content)}
            title="কপি করুন"
            className="text-neutral-500 hover:text-neutral-800 p-1 rounded transition-colors"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            title="হোয়াটসঅ্যাপে শেয়ার"
            className="text-neutral-500 hover:text-[#25D366] p-1 rounded transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onEdit(letter)}
            title="চিঠি সম্পাদনা করুন"
            className="inline-flex items-center gap-1 font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded-md text-[11px] transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            <span>সম্পাদনা</span>
          </button>

          <button
            type="button"
            onClick={() => onPdf(letter)}
            title="এ৪ পিডিএফ তৈরি করুন"
            className="inline-flex items-center gap-1 font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-md text-[11px] transition-colors border border-rose-200/50"
          >
            <FileText className="w-3 h-3 text-rose-600" />
            <span>পিডিএফ</span>
          </button>

          <button
            type="button"
            onClick={() => onVisual(letter)}
            title="ইমেজ কার্ড তৈরি করুন"
            className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 px-2 py-1 rounded-md text-[11px] transition-colors border border-amber-200/50"
          >
            <ImageIcon className="w-3 h-3 text-amber-600" />
            <span>ইমেজ</span>
          </button>

          <button
            type="button"
            onClick={() => onRead(letter)}
            className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-md text-[11px] transition-colors"
          >
            <Eye className="w-3 h-3" />
            <span>পড়ুন</span>
          </button>
        </div>
      </div>
    </div>
  )
})

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth()

  // Tab State
  const [activeTab, setActiveTab] = useState<DashboardTab>('my-letters')

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

  // Handle Toggle Favorite
  const handleToggleFavorite = useCallback(async (letterId: string, currentFavorite: boolean) => {
    // Optimistic UI update
    setLetters((prev) =>
      prev.map((l) => (l.id === letterId ? { ...l, favorite: !currentFavorite } : l))
    )

    try {
      await fetch('/api/letters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: letterId,
          action: 'toggle-favorite',
          currentFavorite,
        }),
      })
    } catch (err) {
      console.error('Toggle favorite error:', err)
    }
  }, [])

  // Handle Delete Letter
  const handleDeleteLetter = useCallback(async (letterId: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই চিঠিটি মুছে ফেলতে চান?')) return

    setLetters((prev) => prev.filter((l) => l.id !== letterId))
    setReadingLetter((prev) => (prev?.id === letterId ? null : prev))

    try {
      await fetch(`/api/letters?id=${encodeURIComponent(letterId)}`, {
        method: 'DELETE',
      })
    } catch (err) {
      console.error('Delete letter error:', err)
    }
  }, [])

  // Handle Save Edit
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

      const data = await res.json()
      if (data.success && data.letter) {
        setLetters((prev) =>
          prev.map((l) => (l.id === editingLetter.id ? { ...l, ...data.letter } : l))
        )
        setEditingLetter(null)
      }
    } catch (err) {
      console.error('Save edit error:', err)
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
          <p className="font-bengali text-sm text-neutral-600">ড্যাশবোর্ড লোড হচ্ছে...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-chithi-gradient flex flex-col selection:bg-rose-100 selection:text-rose-800">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full border-b border-rose-100/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-xs">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <span className="font-bengali font-bold text-base sm:text-lg text-neutral-900">
              চিঠি ড্যাশবোর্ড
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন চিঠি লিখুন</span>
            </Link>

            {user ? (
              <button
                type="button"
                onClick={signOut}
                title="লগআউট"
                className="p-2 rounded-xl text-neutral-500 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/login?redirectedFrom=/dashboard"
                className="py-2 px-3 rounded-xl text-xs font-bengali font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
              >
                লগইন
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Anonymous Guest Banner (Non-blocking) */}
        {!user && (
          <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-0.5">
              <h4 className="font-bengali font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>আপনি অতিথি (Guest) হিসেবে ব্যবহার করছেন</span>
              </h4>
              <p className="font-bengali text-xs text-neutral-600">
                বিনামূল্যে একাউন্ট তৈরি করে আপনার সব চিঠি আজীবনের জন্য ক্লাউডে সংরক্ষণ করুন।
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/signup?redirectedFrom=/dashboard"
                className="py-1.5 px-3.5 rounded-xl font-bengali text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-2xs transition-colors"
              >
                একাউন্ট তৈরি করুন
              </Link>
              <Link
                href="/login?redirectedFrom=/dashboard"
                className="py-1.5 px-3 rounded-xl font-bengali text-xs font-semibold text-neutral-700 hover:bg-white/80 transition-colors"
              >
                লগইন
              </Link>
            </div>
          </div>
        )}

        {/* Welcome & 5 SaaS Quick Stats */}
        <div className="bg-white/90 backdrop-blur-xs border border-rose-100/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bengali text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/50">
              <Sparkles className="w-3 h-3 text-rose-500" />
              <span>চিঠির সংগ্রহশালা ও নিয়ন্ত্রণ কেন্দ্র</span>
            </div>
            <h1 className="font-bengali text-2xl sm:text-3xl font-bold text-neutral-900">
              স্বাগতম, {user?.name || 'প্রিয় অতিথি'} 👋
            </h1>
            <p className="font-bengali text-xs sm:text-sm text-neutral-500">
              আপনার রচিত সব চিঠি, খসড়া, ডাউনলোড ও শেয়ার করা লিংক সহজে পরিচালনা করুন
            </p>
          </div>

          {/* 5 Stats Counter Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
            <div className="bg-rose-50/70 border border-rose-100/80 p-2.5 rounded-2xl text-center">
              <span className="text-lg sm:text-xl font-bold font-sans text-rose-600 block leading-tight">
                {stats.published}
              </span>
              <span className="text-[11px] font-bengali text-neutral-600">আমার চিঠি</span>
            </div>
            <div className="bg-pink-50/70 border border-pink-100/80 p-2.5 rounded-2xl text-center">
              <span className="text-lg sm:text-xl font-bold font-sans text-pink-600 block leading-tight">
                {stats.favorites}
              </span>
              <span className="text-[11px] font-bengali text-neutral-600">প্রিয় চিঠি</span>
            </div>
            <div className="bg-amber-50/70 border border-amber-100/80 p-2.5 rounded-2xl text-center">
              <span className="text-lg sm:text-xl font-bold font-sans text-amber-700 block leading-tight">
                {stats.drafts}
              </span>
              <span className="text-[11px] font-bengali text-neutral-600">খসড়া</span>
            </div>
            <div className="bg-indigo-50/70 border border-indigo-100/80 p-2.5 rounded-2xl text-center">
              <span className="text-lg sm:text-xl font-bold font-sans text-indigo-600 block leading-tight">
                {stats.shared}
              </span>
              <span className="text-[11px] font-bengali text-neutral-600">শেয়ারকৃত</span>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-100/80 p-2.5 rounded-2xl text-center col-span-2 sm:col-span-1">
              <span className="text-lg sm:text-xl font-bold font-sans text-emerald-600 block leading-tight">
                {stats.downloadCount}
              </span>
              <span className="text-[11px] font-bengali text-neutral-600">ডাউনলোড</span>
            </div>
          </div>
        </div>

        {/* 5 Tab Navigation Strip */}
        <div className="flex border-b border-neutral-200/80 gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('my-letters')}
            className={`pb-3 px-3 sm:px-4 font-bengali text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'my-letters'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>আমার চিঠি ({stats.published})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 px-3 sm:px-4 font-bengali text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'favorites'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
            <span>প্রিয় চিঠি ({stats.favorites})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drafts')}
            className={`pb-3 px-3 sm:px-4 font-bengali text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'drafts'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>খসড়া ({stats.drafts})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shared')}
            className={`pb-3 px-3 sm:px-4 font-bengali text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'shared'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>শেয়ারকৃত ({stats.shared})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('downloads')}
            className={`pb-3 px-3 sm:px-4 font-bengali text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'downloads'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>ডাউনলোড ({stats.downloadCount})</span>
          </button>

          {user && (
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`pb-3 px-3 sm:px-4 font-bengali text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ml-auto ${
                activeTab === 'profile'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>প্রোফাইল</span>
            </button>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1, 2, 3: LETTERS GRID (My Letters, Favorites, Drafts)
           ───────────────────────────────────────────────────────────── */}
        {['my-letters', 'favorites', 'drafts'].includes(activeTab) && (
          <div className="space-y-6">
            {/* Search & Multi-Filters Toolbar */}
            <div className="bg-white/80 border border-neutral-200/80 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="প্রাপকের নাম বা চিঠির কোনো অংশ খুঁজুন..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 bg-white text-xs sm:text-sm font-bengali focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Emotion Filter */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={emotionFilter}
                    onChange={(e) => setEmotionFilter(e.target.value)}
                    aria-label="আবেগ অনুযায়ী ফিল্টার"
                    className="py-2 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-bengali text-neutral-700 outline-none focus:border-rose-400"
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
                <div className="flex items-center gap-1.5">
                  <select
                    value={relationshipFilter}
                    onChange={(e) => setRelationshipFilter(e.target.value)}
                    aria-label="সম্পর্ক অনুযায়ী ফিল্টার"
                    className="py-2 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-bengali text-neutral-700 outline-none focus:border-rose-400"
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
                <div className="flex items-center gap-1.5">
                  <select
                    value={timeframeFilter}
                    onChange={(e) =>
                      setTimeframeFilter(e.target.value as 'all' | 'today' | 'week' | 'month')
                    }
                    aria-label="তারিখ অনুযায়ী ফিল্টার"
                    className="py-2 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-bengali text-neutral-700 outline-none focus:border-rose-400"
                  >
                    <option value="all">সব সময়</option>
                    <option value="today">আজকের চিঠি</option>
                    <option value="week">গত ৭ দিন</option>
                    <option value="month">এই মাস</option>
                  </select>
                </div>

                {/* Sort Filter: Newest vs Oldest */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    aria-label="চিঠি সাজান"
                    className="py-2 px-3 rounded-xl border border-rose-200/80 bg-rose-50/50 text-xs font-bengali text-rose-900 font-semibold outline-none focus:border-rose-400"
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
                <p className="font-bengali text-xs text-neutral-500">চিঠিগুলো সাজানো হচ্ছে...</p>
              </div>
            ) : filteredLetters.length === 0 ? (
              <div className="bg-white/70 border border-dashed border-rose-200 rounded-3xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-bengali font-bold text-neutral-800 text-lg">
                  {activeTab === 'favorites'
                    ? 'কোনো প্রিয় চিঠি পাওয়া যায়নি'
                    : activeTab === 'drafts'
                    ? 'কোনো খসড়া চিঠি নেই'
                    : 'চিঠি পাওয়া যায়নি'}
                </h3>
                <p className="font-bengali text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
                  {activeTab === 'favorites'
                    ? 'যেকোনো চিঠির ওপর হার্ট আইকন ক্লিক করে প্রিয় তালিকায় যুক্ত করুন।'
                    : 'আপনার নতুন আবেগঘন চিঠি লিখতে এখনই শুরু করুন।'}
                </p>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bengali text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-xs transition-colors"
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
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50/80 text-rose-800 font-bengali text-xs sm:text-sm font-semibold transition-all shadow-xs"
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
                <h3 className="font-bengali font-bold text-lg text-neutral-900">
                  অনলাইনে শেয়ার করা চিঠি ({sharedLetters.length})
                </h3>
                <p className="text-xs font-bengali text-neutral-500">
                  আপনার তৈরি করা প্রতিটি পাবলিক লিংক এবং তাদের ভিউ সংখ্যা
                </p>
              </div>
            </div>

            {sharedLetters.length === 0 ? (
              <div className="bg-white/70 border border-dashed border-rose-200 rounded-3xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="font-bengali font-bold text-neutral-800 text-lg">
                  এখনও কোনো চিঠি শেয়ার করা হয়নি
                </h3>
                <p className="font-bengali text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
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
                      className="bg-white/90 border border-neutral-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bengali font-bold text-sm sm:text-base text-neutral-900">
                            {shared.title}
                          </h4>
                          <span className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                            <Eye className="w-3 h-3" />
                            <span>{shared.views} views</span>
                          </span>
                        </div>

                        <p className="text-xs font-bengali text-neutral-600 line-clamp-2">
                          {shared.letter_content}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] font-bengali text-neutral-400">
                          <span>তৈরি: {formatDate(shared.created_at)}</span>
                          <span>•</span>
                          <span className="capitalize">{shared.theme}</span>
                          {shared.expiration !== 'permanent' && (
                            <>
                              <span>•</span>
                              <span className="text-amber-700">মেয়াদ: {shared.expiration}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Link & Action Box */}
                      <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-neutral-600 truncate bg-neutral-50 px-2 py-1 rounded-lg flex-1">
                          /c/{shared.short_id}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(shared.short_id, shareUrl)}
                            className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 transition-colors"
                            title="লিংক কপি করুন"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <a
                            href={shareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 transition-colors"
                            title="খুলুন"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-rose-500" />
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
              <h3 className="font-bengali font-bold text-lg text-neutral-900">
                ডাউনলোড হিস্ট্রি ({downloads.length})
              </h3>
              <p className="text-xs font-bengali text-neutral-500">
                আপনার ডাউনলোড করা পিডিএফ, ইমেজ এবং টেক্সট ফাইলের রেকর্ড
              </p>
            </div>

            {downloads.length === 0 ? (
              <div className="bg-white/70 border border-dashed border-rose-200 rounded-3xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="font-bengali font-bold text-neutral-800 text-lg">
                  এখনও কোনো ফাইল ডাউনলোড করা হয়নি
                </h3>
                <p className="font-bengali text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
                  চিঠি তৈরির পর এ৪ পিডিএফ বা ইমেজ কার্ড ডাউনলোড করলে তা এখানে তালিকাভুক্ত থাকবে।
                </p>
              </div>
            ) : (
              <div className="bg-white/90 border border-neutral-200/80 rounded-2xl divide-y divide-neutral-100 overflow-hidden shadow-2xs">
                {downloads.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-neutral-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs uppercase">
                        {item.format}
                      </div>
                      <div>
                        <h4 className="font-bengali font-semibold text-xs sm:text-sm text-neutral-900">
                          {item.format.toUpperCase()} ফাইল ডাউনলোড
                        </h4>
                        <span className="text-[11px] font-bengali text-neutral-400">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-bengali font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
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
          <div className="max-w-xl mx-auto bg-white/90 backdrop-blur-md border border-rose-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 border-b border-neutral-100 pb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-400 to-amber-300 flex items-center justify-center text-white text-xl font-bold shadow-xs">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="font-bengali font-bold text-xl text-neutral-900">
                  {user.name || 'ব্যবহারকারী'}
                </h2>
                <p className="text-xs text-neutral-500 font-sans">{user.email}</p>
              </div>
            </div>

            <div className="space-y-4 font-bengali text-sm">
              <h3 className="font-semibold text-neutral-800 text-base">আপনার অ্যাকাউন্টের বিবরণ</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
                  <span className="text-xs text-neutral-500 block">মোট চিঠি</span>
                  <span className="text-xl font-bold font-sans text-neutral-900">{stats.published} টি</span>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
                  <span className="text-xs text-neutral-500 block">পছন্দের চিঠি</span>
                  <span className="text-xl font-bold font-sans text-rose-600">{stats.favorites} টি</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <Link
                href="/"
                className="text-xs font-bengali text-rose-600 hover:text-rose-700 font-medium"
              >
                ← চিঠি তৈরিতে ফিরে যান
              </Link>

              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bengali font-medium transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>লগআউট করুন</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Full Letter Reader Modal */}
      {readingLetter && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-10 shadow-2xl space-y-6 relative border border-rose-100">
            <button
              type="button"
              onClick={() => setReadingLetter(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs uppercase font-sans text-neutral-400 tracking-widest block mb-1">
                SAVED LETTER
              </span>
              <h2 className="font-bengali text-2xl font-bold text-neutral-900">
                প্রিয় {readingLetter.receiver_name}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bengali text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/50">
                  {readingLetter.relationship || 'চিঠি'}
                </span>
                <span className="text-xs text-neutral-400 font-bengali">
                  {formatDate(readingLetter.created_at)}
                </span>
              </div>
            </div>

            <div className="letter-body font-bengali text-neutral-800 text-base sm:text-lg leading-relaxed sm:leading-loose whitespace-pre-wrap p-6 rounded-2xl bg-amber-50/40 border border-amber-100/60">
              {readingLetter.content}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleToggleFavorite(readingLetter.id, readingLetter.favorite)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bengali font-medium border transition-colors ${
                  readingLetter.favorite
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <Heart className={`w-4 h-4 ${readingLetter.favorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{readingLetter.favorite ? 'প্রিয় তালিকা থেকে সরান' : 'প্রিয়তে রাখুন'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(readingLetter.id, readingLetter.content)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bengali font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors"
                >
                  {copiedId === readingLetter.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bengali font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors"
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bengali font-medium bg-[#25D366] hover:bg-[#20bd5a] text-white transition-colors"
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
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bengali font-bold text-lg text-neutral-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-rose-600" />
                <span>চিঠি সম্পাদনা করুন (Edit Letter)</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingLetter(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bengali font-semibold text-neutral-700 mb-1">
                  চিঠির শিরোনাম (Title):
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm font-bengali text-neutral-900 focus:border-rose-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bengali font-semibold text-neutral-700 mb-1">
                  চিঠির মূল বক্তব্য (Letter Content):
                </label>
                <textarea
                  rows={8}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm font-bengali text-neutral-900 focus:border-rose-400 outline-none leading-relaxed resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setEditingLetter(null)}
                className="py-2 px-4 rounded-xl font-bengali text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                বাতিল
              </button>

              <button
                type="button"
                disabled={isSavingEdit || !editContent.trim()}
                onClick={handleSaveEdit}
                className="py-2 px-4 rounded-xl font-bengali text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs disabled:opacity-50"
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
