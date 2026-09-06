'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Heart,
  Search,
  Filter,
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
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { buildWhatsAppUrl, formatDate } from '@/utils/helpers'
import { RELATIONSHIP_OPTIONS } from '@/constants'
import type { LetterRow } from '@/types/database'
import { VintageLetterVisualStudio } from '@/components/letter/VintageLetterVisualStudio'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()

  // Data & UI states
  const [letters, setLetters] = useState<LetterRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'profile'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all')

  // Selected letter for full reading modal & visual card studio
  const [readingLetter, setReadingLetter] = useState<LetterRow | null>(null)
  const [visualStudioLetter, setVisualStudioLetter] = useState<LetterRow | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Fetch letters from database API
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/login?redirectedFrom=/dashboard')
      return
    }

    const fetchLetters = async () => {
      setDataLoading(true)
      try {
        const res = await fetch(`/api/letters?userId=${encodeURIComponent(user.id)}`)
        const data = await res.json()
        if (data.success && Array.isArray(data.letters)) {
          setLetters(data.letters)
        }
      } catch (err) {
        console.error('Failed to load user letters:', err)
      } finally {
        setDataLoading(false)
      }
    }

    fetchLetters()
  }, [user, authLoading, router])

  // Handle Toggle Favorite
  const handleToggleFavorite = async (letterId: string, currentFavorite: boolean) => {
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
  }

  // Handle Delete Letter
  const handleDeleteLetter = async (letterId: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই চিঠিটি মুছে ফেলতে চান?')) return

    setLetters((prev) => prev.filter((l) => l.id !== letterId))
    if (readingLetter?.id === letterId) {
      setReadingLetter(null)
    }

    try {
      await fetch(`/api/letters?id=${encodeURIComponent(letterId)}`, {
        method: 'DELETE',
      })
    } catch (err) {
      console.error('Delete letter error:', err)
    }
  }

  // Handle Copy
  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback
    }
  }

  // Filtered Letters
  const filteredLetters = useMemo(() => {
    return letters.filter((letter) => {
      if (activeTab === 'favorites' && !letter.favorite) {
        return false
      }

      if (relationshipFilter !== 'all' && letter.relationship !== relationshipFilter) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = letter.receiver_name.toLowerCase().includes(q)
        const matchesContent = letter.content.toLowerCase().includes(q)
        const matchesEmotion = letter.emotion?.toLowerCase().includes(q)
        return matchesName || matchesContent || matchesEmotion
      }

      return true
    })
  }, [letters, activeTab, relationshipFilter, searchQuery])

  // Stats Calculations
  const stats = useMemo(() => {
    const total = letters.length
    const favoritesCount = letters.filter((l) => l.favorite).length
    const uniqueRecipients = new Set(letters.map((l) => l.receiver_name)).size
    return { total, favoritesCount, uniqueRecipients }
  }, [letters])

  if (authLoading || (!user && dataLoading)) {
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
      {/* Top SaaS Header */}
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

            <button
              type="button"
              onClick={signOut}
              title="লগআউট"
              className="p-2 rounded-xl text-neutral-500 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Welcome & Stats Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-xs border border-rose-100/80 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bengali text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/50">
              <Sparkles className="w-3 h-3 text-rose-500" />
              <span>ব্যক্তিগত চিঠির সংগ্রহশালা</span>
            </div>
            <h1 className="font-bengali text-2xl font-bold text-neutral-900">
              স্বাগতম, {user?.name || 'প্রিয় গ্রাহক'} 👋
            </h1>
            <p className="font-bengali text-xs sm:text-sm text-neutral-500">
              আপনার রচিত ও সংরক্ষিত সব চিঠির পূর্ণ বিবরণ ও নিয়ন্ত্রণ
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3 sm:gap-4 pt-2 sm:pt-0">
            <div className="bg-rose-50/70 border border-rose-100 px-4 py-2 rounded-xl text-center">
              <span className="text-xl font-bold font-sans text-rose-600 block leading-tight">
                {stats.total}
              </span>
              <span className="text-[11px] font-bengali text-neutral-600">মোট চিঠি</span>
            </div>
            <div className="bg-pink-50/70 border border-pink-100 px-4 py-2 rounded-xl text-center">
              <span className="text-xl font-bold font-sans text-pink-600 block leading-tight">
                {stats.favoritesCount}
              </span>
              <span className="text-[11px] font-bengali text-neutral-600">প্রিয় চিঠি</span>
            </div>
            <div className="bg-amber-50/70 border border-amber-100 px-4 py-2 rounded-xl text-center">
              <span className="text-xl font-bold font-sans text-amber-700 block leading-tight">
                {stats.uniqueRecipients}
              </span>
              <span className="text-[11px] font-bengali text-neutral-600">প্রাপক</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200/80 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-4 font-bengali text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>সব চিঠি ({letters.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 px-4 font-bengali text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'favorites'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
            <span>প্রিয় চিঠি ({stats.favoritesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-4 font-bengali text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>প্রোফাইল</span>
          </button>
        </div>

        {/* TAB 1 & 2: LETTERS GRID */}
        {activeTab !== 'profile' && (
          <div className="space-y-6">
            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="প্রাপকের নাম বা চিঠির অংশ লিখে খুঁজুন..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-bengali focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-400" />
                <select
                  value={relationshipFilter}
                  onChange={(e) => setRelationshipFilter(e.target.value)}
                  aria-label="সম্পর্ক অনুযায়ী ফিল্টার করুন"
                  className="py-2.5 px-3 rounded-xl border border-neutral-200 bg-white text-xs sm:text-sm font-bengali text-neutral-700 outline-none focus:border-rose-400 transition-all shadow-2xs"
                >
                  <option value="all">সব সম্পর্ক</option>
                  {RELATIONSHIP_OPTIONS.map((rel) => (
                    <option key={rel.value} value={rel.value}>
                      {rel.emoji} {rel.label}
                    </option>
                  ))}
                </select>
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
                  {activeTab === 'favorites' ? 'কোনো প্রিয় চিঠি পাওয়া যায়নি' : 'এখনও কোনো চিঠি সংরক্ষণ করা হয়নি'}
                </h3>
                <p className="font-bengali text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
                  {activeTab === 'favorites'
                    ? 'যেকোনো চিঠির ওপর হার্ট আইকন ক্লিক করে প্রিয় তালিকায় যুক্ত করুন।'
                    : 'আমাদের এআই লেখক দিয়ে এখনই আপনার প্রথম চিঠি রচনা করুন।'}
                </p>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bengali text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>চিঠি লিখুন</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredLetters.map((letter) => {
                  const isCopied = copiedId === letter.id
                  const whatsappUrl = buildWhatsAppUrl(
                    `💌 ${letter.receiver_name}-এর জন্য চিঠি:\n\n${letter.content}\n\n— চিঠি লেখাই এআই`
                  )

                  return (
                    <div
                      key={letter.id}
                      className="paper-card rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-all duration-200 group relative"
                    >
                      {/* Card Header */}
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
                            {/* Favorite Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleFavorite(letter.id, letter.favorite)}
                              title={letter.favorite ? 'প্রিয় থেকে সরান' : 'প্রিয়তে যোগ করুন'}
                              className={`p-1.5 rounded-lg transition-all ${
                                letter.favorite
                                  ? 'text-rose-500 bg-rose-50 hover:bg-rose-100'
                                  : 'text-neutral-400 hover:text-rose-500 hover:bg-rose-50'
                              }`}
                            >
                              <Heart
                                className={`w-4 h-4 ${letter.favorite ? 'fill-rose-500' : ''}`}
                              />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteLetter(letter.id)}
                              title="চিঠি মুছে ফেলুন"
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {letter.relationship && (
                            <span className="text-[10px] font-bengali bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-100">
                              {letter.relationship}
                            </span>
                          )}
                          {letter.era_style && (
                            <span className="text-[10px] font-bengali bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">
                              {letter.era_style === '90s-handwritten' ? '✉️ ৯০-এর আমেজ' : letter.era_style}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Preview */}
                      <p className="font-bengali text-xs sm:text-sm text-neutral-700 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                        {letter.content}
                      </p>

                      {/* Card Footer */}
                      <div className="pt-3 border-t border-rose-100/60 flex items-center justify-between text-xs text-neutral-400 font-bengali">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(letter.created_at)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(letter.id, letter.content)}
                            title="কপি করুন"
                            className="text-neutral-500 hover:text-neutral-800 p-1 rounded transition-colors"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="হোয়াটসঅ্যাপে শেয়ার"
                            className="text-neutral-500 hover:text-[#25D366] p-1 rounded transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setVisualStudioLetter(letter)}
                            title="ইমেজ কার্ড তৈরি করুন"
                            className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 px-2 py-1 rounded-md text-[11px] transition-colors border border-amber-200/50"
                          >
                            <ImageIcon className="w-3 h-3 text-amber-600" />
                            <span>ইমেজ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setReadingLetter(letter)}
                            className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-md text-[11px] transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>পড়ুন</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PROFILE & ACCOUNT */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto bg-white/90 backdrop-blur-md border border-rose-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 border-b border-neutral-100 pb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-400 to-amber-300 flex items-center justify-center text-white text-xl font-bold shadow-xs">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="font-bengali font-bold text-xl text-neutral-900">
                  {user?.name || 'ব্যবহারকারী'}
                </h2>
                <p className="text-xs text-neutral-500 font-sans">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-4 font-bengali text-sm">
              <h3 className="font-semibold text-neutral-800 text-base">আপনার চিঠির পরিসংখ্যান</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
                  <span className="text-xs text-neutral-500 block">মোট চিঠি তৈরি</span>
                  <span className="text-xl font-bold font-sans text-neutral-900">{stats.total} টি</span>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
                  <span className="text-xs text-neutral-500 block">পছন্দের চিঠি</span>
                  <span className="text-xl font-bold font-sans text-rose-600">{stats.favoritesCount} টি</span>
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
            {/* Close button */}
            <button
              type="button"
              onClick={() => setReadingLetter(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Letter Header */}
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

            {/* Full Letter Content */}
            <div className="letter-body font-bengali text-neutral-800 text-base sm:text-lg leading-relaxed sm:leading-loose whitespace-pre-wrap p-6 rounded-2xl bg-amber-50/40 border border-amber-100/60">
              {readingLetter.content}
            </div>

            {/* Modal Actions */}
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

                <a
                  href={buildWhatsAppUrl(readingLetter.content)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bengali font-medium bg-[#25D366] hover:bg-[#20bd5a] text-white transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>হোয়াটসঅ্যাপ</span>
                </a>
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
    </div>
  )
}
