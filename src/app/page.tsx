'use client'

import { useCG } from '@/components/CGProvider'
import { Chant } from '@/lib/types'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function Home() {
  const { user, community, loading, error, retry } = useCG()
  const [chants, setChants] = useState<Chant[]>([])
  const [loadingChants, setLoadingChants] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [mode, setMode] = useState<'fcfs' | 'balanced'>('fcfs')
  const [continuous, setContinuous] = useState(true)
  const [ideaGoal, setIdeaGoal] = useState(5)
  const searchParams = useSearchParams()

  const fetchChants = useCallback(async () => {
    if (!community) return
    setLoadingChants(true)
    try {
      const res = await fetch(`/api/chants?cgCommunityId=${community.id}`)
      const data = await res.json()
      if (Array.isArray(data)) setChants(data)
    } catch (err) {
      console.error('Failed to fetch chants:', err)
    } finally {
      setLoadingChants(false)
    }
  }, [community])

  useEffect(() => {
    if (community) fetchChants()
  }, [community, fetchChants])

  // Poll for updates
  useEffect(() => {
    if (!community) return
    const interval = setInterval(fetchChants, 15000)
    return () => clearInterval(interval)
  }, [community, fetchChants])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !community || !question.trim()) return

    setCreating(true)
    setCreateError('')

    try {
      const res = await fetch('/api/chants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cgUserId: user.id,
          cgUsername: user.name,
          cgImageUrl: user.imageUrl,
          cgCommunityId: community.id,
          cgCommunityName: community.title,
          question: question.trim(),
          description: description.trim() || undefined,
          allocationMode: mode,
          continuousFlow: continuous,
          ideaGoal,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create')
      }

      setQuestion('')
      setDescription('')
      setShowCreate(false)
      fetchChants()
    } catch (err) {
      setCreateError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted animate-pulse">Connecting to Common Ground...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-sm">
          <h2 className="text-foreground font-bold mb-2">Unity Chant Plugin v2</h2>
          <p className="text-error mb-2 text-sm break-all">{error}</p>
          <p className="text-muted text-xs mb-1">iframeUid: {searchParams.get('iframeUid') || 'none'}</p>
          <p className="text-muted text-xs mb-1">pubkey: {process.env.NEXT_PUBLIC_PUBKEY ? `set (${process.env.NEXT_PUBLIC_PUBKEY.length} chars)` : 'MISSING'}</p>
          <button
            onClick={retry}
            className="mt-3 px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
          <p className="text-muted text-xs mt-3">Check browser console for [UC] logs.</p>
        </div>
      </div>
    )
  }

  // Build iframeUid param string to pass through navigation
  const uidParam = searchParams.get('iframeUid') ? `?iframeUid=${searchParams.get('iframeUid')}` : ''

  return (
    <div className="max-w-lg mx-auto p-4 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-foreground">Unity Chant</h1>
          <p className="text-xs text-muted">{community?.title}</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
        >
          {showCreate ? 'Cancel' : '+ New Chant'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-surface rounded-lg border border-border">
          <h2 className="text-sm font-semibold mb-3">Start a New Chant</h2>
          <input
            type="text"
            placeholder="What should we decide?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted mb-2 focus:outline-none focus:border-accent"
          />
          <textarea
            placeholder="Add context (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted mb-2 focus:outline-none focus:border-accent resize-none"
          />

          {/* Settings toggle */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs text-muted hover:text-foreground mb-2 flex items-center gap-1"
          >
            <span>{showSettings ? '▾' : '▸'}</span>
            Settings
          </button>

          {showSettings && (
            <div className="mb-3 p-3 bg-background rounded-lg border border-border space-y-3">
              {/* Voting Mode */}
              <div>
                <label className="text-xs text-muted block mb-1">Voting Mode</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('fcfs')}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                      mode === 'fcfs'
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'bg-background border-border text-muted hover:border-accent/50'
                    }`}
                  >
                    First Come First Serve
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('balanced')}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                      mode === 'balanced'
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'bg-background border-border text-muted hover:border-accent/50'
                    }`}
                  >
                    Balanced
                  </button>
                </div>
              </div>

              {/* Continuous Flow */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-foreground block">Continuous Flow</label>
                  <p className="text-xs text-muted">Voting starts as ideas come in</p>
                </div>
                <button
                  type="button"
                  onClick={() => setContinuous(!continuous)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    continuous ? 'bg-accent' : 'bg-border'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    continuous ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* Idea Goal */}
              <div>
                <label className="text-xs text-muted block mb-1">
                  Ideas to start voting: <span className="text-foreground font-mono">{ideaGoal}</span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={50}
                  value={ideaGoal}
                  onChange={(e) => setIdeaGoal(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted">
                  <span>2</span>
                  <span>50</span>
                </div>
              </div>
            </div>
          )}
          {createError && <p className="text-error text-xs mb-2">{createError}</p>}
          <button
            type="submit"
            disabled={creating || !question.trim()}
            className="w-full py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {creating ? 'Creating...' : 'Create Chant'}
          </button>
        </form>
      )}

      {/* Chant List */}
      {loadingChants && chants.length === 0 ? (
        <div className="text-center text-muted py-8 animate-pulse">Loading chants...</div>
      ) : chants.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted mb-2">No chants yet in this community.</p>
          <p className="text-sm text-muted">Start one to get the conversation going!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chants.map((chant) => (
            <Link
              key={chant.id}
              href={`/chant/${chant.id}${uidParam}`}
              className="block p-4 bg-surface hover:bg-surface-hover border border-border rounded-lg transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground leading-tight">{chant.question}</h3>
                <PhaseBadge phase={chant.phase} />
              </div>
              {chant.description && (
                <p className="text-xs text-muted mt-1 line-clamp-2">{chant.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                <span>{chant._count.ideas} ideas</span>
                <span>{chant._count.members} members</span>
                <span>by {chant.creator.name}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8" />
    </div>
  )
}

function PhaseBadge({ phase }: { phase: string }) {
  const config: Record<string, { label: string; color: string }> = {
    SUBMISSION: { label: 'Ideas', color: 'bg-accent/20 text-accent' },
    VOTING: { label: 'Voting', color: 'bg-warning/20 text-warning' },
    COMPLETED: { label: 'Done', color: 'bg-success/20 text-success' },
    ACCUMULATING: { label: 'Rolling', color: 'bg-purple-500/20 text-purple-400' },
  }
  const { label, color } = config[phase] || { label: phase, color: 'bg-muted/20 text-muted' }

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${color}`}>
      {label}
    </span>
  )
}
