'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Brain,
  Shield,
  Activity,
  LogOut,
  RefreshCw,
  TrendingUp,
  Cpu,
  AlertOctagon,
  CheckCircle2,
  DollarSign,
  FileText,
  Clock,
  Sparkles,
  Server,
} from 'lucide-react'

type TabId = 'overview' | 'ai' | 'security' | 'system'

const TABS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Executive Overview', icon: Activity },
  { id: 'ai', label: 'AI Monitoring & Costs', icon: Brain },
  { id: 'security', label: 'Security & Abuse', icon: Shield },
  { id: 'system', label: 'System Health', icon: Server },
]

interface AdminStats {
  users: {
    totalUsers: number
    activeUsers24h: number
    registrationHistory: Array<{ period: string; count: number }>
  }
  ai: {
    totalLetters: number
    totalTokens: number
    estimatedCostUsd: number
    modelUsage: {
      gemini: number
      openAi: number
      fallback: number
    }
    recentLogs: Array<{
      id: string
      action_type: string
      model: string
      tokens_used: number
      success: boolean
      created_at: string
    }>
  }
  security: {
    failedRequests: number
    rateLimitEvents: number
    abuseDetected: string
    recentEvents: Array<{
      id: string
      ip: string
      prefix: string
      type: string
      timestamp: string
    }>
  }
  system: {
    status: string
    uptimeSeconds: number
    geminiConfigured: boolean
    openaiConfigured: boolean
    supabaseConfigured: boolean
    nodeVersion: string
    timestamp: string
  }
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data.success && data.data) {
        setStats(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      if (mounted) await fetchStats()
    }
    init()
    const interval = setInterval(() => {
      if (mounted) fetchStats()
    }, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [fetchStats])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchStats()
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
      router.refresh()
    } catch {
      router.push('/admin/login')
    }
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}h ${minutes}m ${secs}s`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
        <p className="font-mono text-xs text-neutral-400">Loading Administrative Dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-rose-500 selection:text-white flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base text-white">Chithi Lekhi AI</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/80">
                Admin
              </span>
            </div>
            <p className="text-[11px] font-mono text-neutral-400">Mission Control &amp; Telemetry</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-rose-950/80 text-neutral-300 hover:text-rose-300 border border-neutral-700 hover:border-rose-800 text-xs font-mono transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-neutral-800/80 bg-neutral-900/30 px-4 sm:px-8 py-2 flex gap-1.5 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Users */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-mono uppercase tracking-wider">Total Users</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                {stats?.users.totalUsers || 0}
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                +{stats?.users.activeUsers24h || 0} active
              </span>
            </div>
            <p className="text-[11px] font-mono text-neutral-500">Registered Accounts</p>
          </div>

          {/* Generated Letters */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-mono uppercase tracking-wider">Letters Created</span>
              <FileText className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                {stats?.ai.totalLetters || 0}
              </span>
              <span className="text-[11px] font-mono text-rose-400">Total</span>
            </div>
            <p className="text-[11px] font-mono text-neutral-500">AI Epistolary Generations</p>
          </div>

          {/* AI Tokens & Cost */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-mono uppercase tracking-wider">Estimated Cost</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                ${stats?.ai.estimatedCostUsd || '0.0000'}
              </span>
              <span className="text-[11px] font-mono text-neutral-400">USD</span>
            </div>
            <p className="text-[11px] font-mono text-neutral-500">
              {stats?.ai.totalTokens.toLocaleString() || 0} Tokens Consumed
            </p>
          </div>

          {/* Security Status */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-mono uppercase tracking-wider">Security State</span>
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                {stats?.security.abuseDetected === 'Normal' ? 'Healthy' : 'Investigate'}
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                {stats?.security.rateLimitEvents || 0} limits
              </span>
            </div>
            <p className="text-[11px] font-mono text-neutral-500">Rate Limiter &amp; Abuse Shield</p>
          </div>
        </div>

        {/* Tab 1: Executive Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Architecture Distribution */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-rose-500" />
                  <span>AI Model Router Distribution</span>
                </h2>
                <span className="text-[11px] font-mono text-neutral-500">Real-time</span>
              </div>
              <div className="space-y-3">
                {/* Gemini */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-neutral-300">Gemini 1.5 Flash (Creative / Depth)</span>
                    <span className="text-rose-400 font-bold">{stats?.ai.modelUsage.gemini || 0} calls</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{
                        width: `${Math.min(100, ((stats?.ai.modelUsage.gemini || 1) / Math.max(1, (stats?.ai.modelUsage.gemini || 0) + (stats?.ai.modelUsage.openAi || 0) + (stats?.ai.modelUsage.fallback || 0))) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* OpenAI */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-neutral-300">OpenAI GPT-4o-mini (Grammar / Precision)</span>
                    <span className="text-sky-400 font-bold">{stats?.ai.modelUsage.openAi || 0} calls</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{
                        width: `${Math.min(100, ((stats?.ai.modelUsage.openAi || 0) / Math.max(1, (stats?.ai.modelUsage.gemini || 0) + (stats?.ai.modelUsage.openAi || 0) + (stats?.ai.modelUsage.fallback || 0))) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Local Fallback */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-neutral-300">Local High-Fidelity Fallback</span>
                    <span className="text-amber-400 font-bold">{stats?.ai.modelUsage.fallback || 0} calls</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${Math.min(100, ((stats?.ai.modelUsage.fallback || 0) / Math.max(1, (stats?.ai.modelUsage.gemini || 0) + (stats?.ai.modelUsage.openAi || 0) + (stats?.ai.modelUsage.fallback || 0))) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Registration History */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>User Growth &amp; Registrations</span>
                </h2>
                <span className="text-[11px] font-mono text-neutral-500">Activity</span>
              </div>
              <div className="space-y-3">
                {stats?.users.registrationHistory.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80"
                  >
                    <span className="font-mono text-xs text-neutral-300">{h.period}</span>
                    <span className="font-mono text-xs text-emerald-400 font-bold">
                      {h.count} users
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AI Monitoring */}
        {activeTab === 'ai' && (
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-rose-500" />
              <span>Recent AI Operations &amp; Token Audit Log</span>
            </h2>
            <div className="overflow-x-auto no-scrollbar contain-render rounded-xl border border-neutral-800/80">
              <table className="w-full text-left font-mono text-xs text-neutral-300">
                <thead className="text-[11px] uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Model</th>
                    <th className="py-2.5 px-3">Tokens</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {stats?.ai.recentLogs && stats.ai.recentLogs.length > 0 ? (
                    stats.ai.recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-800/30">
                        <td className="py-2.5 px-3 text-neutral-400">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">{log.action_type}</td>
                        <td className="py-2.5 px-3 text-neutral-300">{log.model}</td>
                        <td className="py-2.5 px-3 text-emerald-400">{log.tokens_used}</td>
                        <td className="py-2.5 px-3">
                          {log.success ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                              Success
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800 text-[10px]">
                              Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-neutral-500">
                        No recent AI executions recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Security Monitoring */}
        {activeTab === 'security' && (
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Rate Limit Violations &amp; Security Telemetry</span>
            </h2>
            <div className="overflow-x-auto no-scrollbar contain-render rounded-xl border border-neutral-800/80">
              <table className="w-full text-left font-mono text-xs text-neutral-300">
                <thead className="text-[11px] uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Client IP</th>
                    <th className="py-2.5 px-3">Prefix / Endpoint</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Action Taken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {stats?.security.recentEvents && stats.security.recentEvents.length > 0 ? (
                    stats.security.recentEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-neutral-800/30">
                        <td className="py-2.5 px-3 text-neutral-400">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 text-neutral-200">{evt.ip}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{evt.prefix}</td>
                        <td className="py-2.5 px-3 text-rose-400">{evt.type}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[10px]">
                            HTTP 429 Blocked
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-neutral-500">
                        No rate limit or security violations detected. System is clean.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: System Health */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Service Health Matrix</span>
              </h2>
              <div className="space-y-2.5 font-mono text-xs">
                {/* Gemini */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <span className="text-neutral-300">Google Gemini API</span>
                  {stats?.system.geminiConfigured ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Operational
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <AlertOctagon className="w-4 h-4" /> Fallback Mode
                    </span>
                  )}
                </div>

                {/* OpenAI */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <span className="text-neutral-300">OpenAI Fallback Engine</span>
                  {stats?.system.openaiConfigured ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Operational
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <AlertOctagon className="w-4 h-4" /> Fallback Mode
                    </span>
                  )}
                </div>

                {/* Supabase */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <span className="text-neutral-300">Supabase Database &amp; Auth</span>
                  {stats?.system.supabaseConfigured ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <AlertOctagon className="w-4 h-4" /> Local Storage Mode
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Runtime Telemetry */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Runtime Diagnostics</span>
              </h2>
              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <span className="text-neutral-400">Process Uptime</span>
                  <span className="text-neutral-200 font-bold">
                    {stats?.system.uptimeSeconds ? formatUptime(stats.system.uptimeSeconds) : '0s'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <span className="text-neutral-400">Node.js Engine</span>
                  <span className="text-neutral-200 font-bold">{stats?.system.nodeVersion}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <span className="text-neutral-400">Server Timestamp</span>
                  <span className="text-neutral-200">
                    {stats?.system.timestamp ? new Date(stats.system.timestamp).toLocaleString() : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
