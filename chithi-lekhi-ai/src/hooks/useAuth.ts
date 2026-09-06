'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getCurrentUser,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  type AuthUser,
} from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const isConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseUrl.startsWith('https://')
)

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (isMounted) {
          setUser(currentUser)
          setLoading(false)
        }
      } catch {
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    initialize()

    if (isConfigured) {
      try {
        const supabase = createClient()
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!isMounted) return
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'ব্যবহারকারী',
              avatar: session.user.user_metadata?.avatar_url,
            })
          } else {
            setUser(null)
          }
          setLoading(false)
        })

        return () => {
          isMounted = false
          subscription.unsubscribe()
        }
      } catch (err) {
        console.warn('[useAuth] onAuthStateChange listener error:', err)
      }
    }

    return () => {
      isMounted = false
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const res = await signInWithEmail(email, password)
    if (res.user) {
      setUser(res.user)
    }
    setLoading(false)
    return res
  }

  const signUp = async (email: string, password: string, name?: string) => {
    setLoading(true)
    const res = await signUpWithEmail(email, password, name)
    if (res.user) {
      setUser(res.user)
    }
    setLoading(false)
    return res
  }

  const signOut = async () => {
    setLoading(true)
    await signOutUser()
    setUser(null)
    setLoading(false)
  }

  return {
    user,
    loading,
    isAuthenticated: Boolean(user),
    signIn,
    signUp,
    signOut,
    refreshUser,
  }
}
