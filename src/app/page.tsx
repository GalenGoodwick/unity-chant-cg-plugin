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
  const [showSettings, setShowSettings] = useState(true)
  const [mode, setMode] = useState<'fcfs' | 'balanced'>('fcfs')
  const [continuous, setContinuous] = useState(true)
  const [ideaGoal, setIdeaGoal] = useState(5)
  const [ideas, setIdeas] = useState<string[]>(['', '', '', '', ''])
  const [createProgress, setCreateProgress] = useState('')
  const searchParams = useSearchParams()

  // Resize idea boxes when ideaGoal changes
  const updateIdeaGoal = (goal: number) => {
    setIdeaGoal(goal)
    const count = goal === 0 ? 5 : goal
    setIdeas(prev => {
      if (prev.length === count) return prev
      if (prev.length < count) return [...prev, ...Array(count - prev.length).fill('')]
      return prev.slice(0, count)
    })
  }

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
    if (!user || !community) {
      setCreateError(`Missing context: user=${!!user}, community=${!!community}`)
      return
    }
    if (!question.trim()) {
      setCreateError('Question is required')
      return
    }

    setCreating(true)
    setCreateError('')

    const payload = {
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
    }
    console.log('[UC] Creating chant:', payload)

    try {
      setCreateProgress('Creating chant...')
      const res = await fetch('/api/chants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      console.log('[UC] Create response:', res.status, data)

      if (!res.ok) {
        throw new Error(data.error || `Failed to create (${res.status})`)
      }

      // Auto-submit seeded ideas
      const filledIdeas = ideas.filter(t => t.trim())
      for (let i = 0; i < filledIdeas.length; i++) {
        setCreateProgress(`Submitting idea ${i + 1}/${filledIdeas.length}...`)
        try {
          await fetch(`/api/chants/${data.id}/ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cgUserId: user.id,
              cgUsername: user.name,
              cgImageUrl: user.imageUrl,
              text: filledIdeas[i].trim(),
            }),
          })
        } catch (ideaErr) {
          console.error(`[UC] Failed to submit idea ${i + 1}:`, ideaErr)
        }
      }

      setQuestion('')
      setDescription('')
      setIdeas(['', '', '', '', ''])
      setShowCreate(false)
      setCreateProgress('')
      fetchChants()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[UC] Create error:', msg, err)
      setCreateError(msg || 'Unknown error — check browser console for [UC] logs')
      setCreateProgress('')
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
                <label className="text-xs text-foreground block mb-1">Voting Mode</label>
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
                    All at Once
                  </button>
                </div>
                <p className="text-xs text-muted mt-1">
                  {mode === 'fcfs'
                    ? 'Anyone can vote as soon as they arrive. Cells fill one at a time.'
                    : 'Waits for enough participants, then assigns everyone to cells at once. The creator starts voting manually.'}
                </p>
              </div>

              {/* Continuous Flow */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-foreground block">Continuous Flow</label>
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
                <p className="text-xs text-muted mt-1">
                  {continuous
                    ? 'Voting begins automatically once enough ideas are submitted. New ideas keep forming new voting cells even while voting is happening.'
                    : 'All ideas are collected first. The creator manually starts voting when ready.'}
                </p>
              </div>

              {/* Idea Goal — only relevant with FCFS + continuous flow */}
              {continuous && mode === 'fcfs' && (
                <div>
                  <label className="text-xs text-foreground block mb-1">Ideas to start voting</label>
                  <div className="flex gap-2">
                    {[
                      { value: 0, label: 'Manual' },
                      { value: 5, label: '5 Ideas' },
                      { value: 10, label: '10 Ideas' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateIdeaGoal(opt.value)}
                        className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                          ideaGoal === opt.value
                            ? 'bg-accent/20 border-accent text-accent'
                            : 'bg-background border-border text-muted hover:border-accent/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {ideaGoal === 0
                      ? 'You start voting manually from the facilitator panel.'
                      : `Voting starts automatically after ${ideaGoal} ideas. Every ${ideaGoal} new ideas creates another voting cell.`}
                  </p>
                </div>
              )}
            </div>
          )}
          {/* Seed Ideas */}
          <div className="mb-3">
            <label className="text-xs text-foreground block mb-2">Seed Ideas {ideaGoal === 0 && <span className="text-muted">(optional)</span>}</label>
            <div className="space-y-2">
              {ideas.map((idea, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={ideaGoal === 0 ? `Idea ${i + 1} (optional)` : `Idea ${i + 1}`}
                  value={idea}
                  onChange={(e) => {
                    const next = [...ideas]
                    next[i] = e.target.value
                    setIdeas(next)
                  }}
                  maxLength={500}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted focus:outline-none focus:border-accent"
                />
              ))}
            </div>
            <p className="text-xs text-muted mt-1">
              Pre-fill ideas to kick things off. Others can add more after creation.
            </p>
          </div>

          {createError && <p className="text-error text-xs mb-2">{createError}</p>}
          {createProgress && <p className="text-accent text-xs mb-2 animate-pulse">{createProgress}</p>}
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
