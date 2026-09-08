'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getCurrentUser,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  type AuthUser,
} from '@/lib/auth'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/config'

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

    async function initialize() {
      try {
        if (!isSupabaseConfigured) {
          if (isMounted) setLoading(false)
          return
        }

        const currentUser = await getCurrentUser()
        if (isMounted) {
          setUser(currentUser)
        }
      } catch (err) {
        console.error('[useAuth] initialization error:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initialize()

    if (isSupabaseConfigured) {
      try {
        const supabase = createClient()
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
          if (!isMounted) return
          if (session?.user) {
            const currentUser = await getCurrentUser()
            if (isMounted) {
              setUser(currentUser || {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'ব্যবহারকারী',
                avatar: session.user.user_metadata?.avatar_url,
                role: (session.user.user_metadata?.role as 'user' | 'admin') || 'user',
              })
            }
          } else {
            setUser(null)
          }
          if (isMounted) setLoading(false)
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

  const resetPassword = async (email: string) => {
    const { resetPasswordForEmail } = await import('@/lib/auth')
    return resetPasswordForEmail(email)
  }

  const updatePassword = async (newPassword: string) => {
    const { updateUserPassword } = await import('@/lib/auth')
    return updateUserPassword(newPassword)
  }

  return {
    user,
    loading,
    isAuthenticated: Boolean(user),
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshUser,
  }
}
