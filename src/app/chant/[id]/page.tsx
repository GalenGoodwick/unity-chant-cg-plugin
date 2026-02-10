'use client'

import { useCG } from '@/components/CGProvider'
import { ChantStatus, IdeaInfo, VoteResult } from '@/lib/types'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, use } from 'react'

export default function ChantDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useCG()
  const searchParams = useSearchParams()
  const uidParam = searchParams.get('iframeUid') ? `?iframeUid=${searchParams.get('iframeUid')}` : ''

  const [status, setStatus] = useState<ChantStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Idea submission
  const [ideaText, setIdeaText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Voting
  const [allocations, setAllocations] = useState<Record<string, number>>({})
  const [voting, setVoting] = useState(false)
  const [voteError, setVoteError] = useState('')
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null)

  // Start voting
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')

  // Facilitator controls
  const [actionLoading, setActionLoading] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const cgUserId = user?.id ? `?cgUserId=${user.id}` : ''
      const res = await fetch(`/api/chants/${id}${cgUserId}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setStatus(data)

      // Initialize allocations for cell-specific ideas (FCFS) or all voting ideas
      if (data.phase === 'VOTING' && !data.hasVoted) {
        const cellIdeas = data.fcfsProgress?.currentCellIdeas
        const ideasForVoting = cellIdeas || data.ideas.filter((i: IdeaInfo) => i.status === 'IN_VOTING')
        if (ideasForVoting.length > 0) {
          setAllocations(prev => {
            if (Object.keys(prev).length > 0) return prev
            const init: Record<string, number> = {}
            ideasForVoting.forEach((i: { id: string }) => { init[i.id] = 0 })
            return init
          })
        }
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id, user?.id])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const handleSubmitIdea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !ideaText.trim()) return

    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess(false)

    try {
      const res = await fetch(`/api/chants/${id}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cgUserId: user.id,
          cgUsername: user.name,
          cgImageUrl: user.imageUrl,
          text: ideaText.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setIdeaText('')
      setSubmitSuccess(true)
      fetchStatus()
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (err) {
      setSubmitError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async () => {
    if (!user) return

    const total = Object.values(allocations).reduce((sum, v) => sum + v, 0)
    if (total !== 10) {
      setVoteError(`Allocate exactly 10 XP (currently ${total})`)
      return
    }

    setVoting(true)
    setVoteError('')

    try {
      const res = await fetch(`/api/chants/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cgUserId: user.id,
          cgUsername: user.name,
          cgImageUrl: user.imageUrl,
          allocations: Object.entries(allocations)
            .filter(([, points]) => points > 0)
            .map(([ideaId, points]) => ({ ideaId, points })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to vote')

      setVoteResult(data)
      fetchStatus()
    } catch (err) {
      setVoteError((err as Error).message)
    } finally {
      setVoting(false)
    }
  }

  const handleStartVoting = async () => {
    if (!user) return
    setStarting(true)
    setStartError('')

    try {
      const res = await fetch(`/api/chants/${id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cgUserId: user.id,
          cgUsername: user.name,
          cgImageUrl: user.imageUrl,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start')
      }

      fetchStatus()
    } catch (err) {
      setStartError((err as Error).message)
    } finally {
      setStarting(false)
    }
  }

  const handleFacilitatorAction = async (action: string, label: string) => {
    if (!user) return
    setActionLoading(action)
    setActionError('')
    setActionSuccess('')

    try {
      const method = action === 'delete' ? 'DELETE' : 'POST'
      const url = action === 'delete' ? `/api/chants/${id}` : `/api/chants/${id}/${action}`

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cgUserId: user.id,
          cgUsername: user.name,
          cgImageUrl: user.imageUrl,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${label}`)

      setActionSuccess(`${label} successful`)
      fetchStatus()
      setTimeout(() => setActionSuccess(''), 3000)
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setActionLoading('')
    }
  }

  const updateAllocation = (ideaId: string, value: number) => {
    setAllocations(prev => ({ ...prev, [ideaId]: value }))
    setVoteError('')
  }

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + v, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted animate-pulse">Loading chant...</div>
      </div>
    )
  }

  if (error || !status) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <Link href={`/${uidParam}`} className="text-accent text-sm mb-4 inline-block">&larr; Back</Link>
        <p className="text-error">{error || 'Chant not found'}</p>
      </div>
    )
  }

  // Use cell-specific ideas if available, fall back to all IN_VOTING
  const cellIdeas = status.fcfsProgress?.currentCellIdeas
  const votingIdeas = cellIdeas
    ? cellIdeas.map(ci => ({ ...ci, status: 'IN_VOTING', tier: status.currentTier, totalXP: 0, totalVotes: 0, isChampion: false, author: { ...ci.author, cgId: undefined } }))
    : status.ideas.filter(i => i.status === 'IN_VOTING')
  const isCreator = user && status.creator.cgId === user.id

  return (
    <div className="max-w-lg mx-auto p-4 min-h-screen">
      {/* Back link */}
      <Link href={`/${uidParam}`} className="text-accent text-sm mb-4 inline-block hover:underline">
        &larr; Back to chants
      </Link>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h1 className="text-lg font-bold text-foreground">{status.question}</h1>
          <PhaseBadge phase={status.phase} />
        </div>
        {status.description && (
          <p className="text-sm text-muted mb-2">{status.description}</p>
        )}
        <p className="text-xs text-muted">by {status.creator.name}</p>
      </div>

      {/* Live Stats */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        <div className="p-2.5 bg-surface rounded-lg border border-border text-center">
          <p className="text-lg font-mono font-bold text-foreground">{status.ideaCount}</p>
          <p className="text-xs text-muted">Ideas</p>
        </div>
        <div className="p-2.5 bg-surface rounded-lg border border-border text-center">
          <p className="text-lg font-mono font-bold text-foreground">{status.memberCount}</p>
          <p className="text-xs text-muted">Members</p>
        </div>
        <div className="p-2.5 bg-surface rounded-lg border border-border text-center">
          <p className="text-lg font-mono font-bold text-foreground">{status.cells.reduce((sum, c) => sum + c._count.votes, 0)}</p>
          <p className="text-xs text-muted">Votes</p>
        </div>
        <div className="p-2.5 bg-surface rounded-lg border border-border text-center">
          <p className="text-lg font-mono font-bold text-foreground">{status.currentTier}</p>
          <p className="text-xs text-muted">Tier</p>
        </div>
      </div>

      {/* Voting Progress */}
      {status.phase === 'VOTING' && (
        <div className="mb-4 p-3 bg-surface rounded-lg border border-border">
          {status.fcfsProgress ? (
            <>
              <div className="flex justify-between text-xs text-muted mb-1">
                <span>Current Cell</span>
                <span>{status.fcfsProgress.currentCellVoters}/{status.fcfsProgress.votersNeeded} voters</span>
              </div>
              <div className="w-full bg-background rounded-full h-2 mb-3">
                <div
                  className="bg-accent h-2 rounded-full transition-all"
                  style={{ width: `${(status.fcfsProgress.currentCellVoters / status.fcfsProgress.votersNeeded) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted mb-1">
                <span>Tier {status.currentTier} Progress</span>
                <span>{status.fcfsProgress.completedCells}/{status.fcfsProgress.totalCells} cells done</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div
                  className="bg-success h-2 rounded-full transition-all"
                  style={{ width: `${status.fcfsProgress.totalCells > 0 ? (status.fcfsProgress.completedCells / status.fcfsProgress.totalCells) * 100 : 0}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-muted text-center">Voting in progress — Tier {status.currentTier}</p>
          )}
        </div>
      )}

      {/* Phase Explainer */}
      {status.phase === 'SUBMISSION' && (
        <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
          <p className="text-sm text-accent font-medium mb-1">Accepting Ideas</p>
          <p className="text-xs text-muted">Submit your ideas below. The creator will start voting when ready.</p>
        </div>
      )}
      {status.phase === 'VOTING' && (
        <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <p className="text-sm text-warning font-medium mb-1">How Voting Works</p>
          <p className="text-xs text-muted">Distribute <span className="text-foreground font-medium">10 XP</span> across the ideas below — give more to ideas you think are strongest.</p>
          <p className="text-xs text-muted mt-1">Votes happen in small cells of 5 people. Winning ideas advance to the next tier, where they compete again. This repeats until one priority emerges.</p>
          {status.continuousFlow && (
            <p className="text-xs text-accent mt-1">Ideas are still being accepted — new cells form automatically.</p>
          )}
          <a
            href="https://unitychant.com/how-it-works"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline mt-1 inline-block"
          >
            Learn how it works &rarr;
          </a>
        </div>
      )}
      {status.phase === 'COMPLETED' && !status.champion && (
        <div className="mb-4 p-3 bg-surface border border-border rounded-lg text-center">
          <p className="text-sm text-muted">This chant has completed.</p>
        </div>
      )}

      {/* Champion Banner */}
      {status.champion && (
        <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-lg">
          <p className="text-xs text-success font-semibold mb-1">Priority</p>
          <p className="text-foreground font-medium">{status.champion.text}</p>
          <p className="text-xs text-muted mt-1">by {status.champion.author.name} &middot; {status.champion.totalXP} XP</p>
        </div>
      )}

      {/* Ideas Submission */}
      {(status.phase === 'SUBMISSION' || status.phase === 'ACCUMULATING' || (status.phase === 'VOTING' && status.continuousFlow)) && (
        <>
          {status.submissionsClosed ? (
            <div className="mb-4 p-3 bg-surface rounded-lg border border-border text-center">
              <p className="text-sm text-muted">Submissions closed — voting in progress</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitIdea} className="mb-4 p-3 bg-surface rounded-lg border border-border">
              <h2 className="text-sm font-semibold mb-2">Submit Your Idea</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your idea..."
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  maxLength={500}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted focus:outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={submitting || !ideaText.trim()}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
                >
                  {submitting ? '...' : 'Submit'}
                </button>
              </div>
              {submitError && <p className="text-error text-xs mt-1">{submitError}</p>}
              {submitSuccess && <p className="text-success text-xs mt-1">Idea submitted!</p>}
            </form>
          )}

          {/* Creator hint */}
          {isCreator && status.phase === 'SUBMISSION' && status.ideaCount < 5 && (
            <p className="text-xs text-warning mb-2 px-1">
              {status.ideaCount} idea{status.ideaCount !== 1 ? 's' : ''} submitted — need at least 5 to start voting
            </p>
          )}
        </>
      )}

      {/* Facilitator Panel — visible to creator in any phase */}
      {isCreator && status.phase !== 'COMPLETED' && (
        <div className="mb-4 p-3 bg-surface rounded-lg border border-gold/30">
          <h2 className="text-sm font-semibold text-gold mb-2">Facilitator Controls</h2>

          {actionError && <p className="text-error text-xs mb-2">{actionError}</p>}
          {actionSuccess && <p className="text-success text-xs mb-2">{actionSuccess}</p>}

          <div className="space-y-3">
            {/* Start Voting — only in SUBMISSION */}
            {status.phase === 'SUBMISSION' && (
              <div>
                <button
                  onClick={handleStartVoting}
                  disabled={starting || status.ideaCount < 5}
                  title="Group ideas into cells of 5. Participants vote by allocating XP."
                  className="w-full py-2 bg-warning hover:bg-warning/80 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {starting ? 'Starting...' : `Start Voting (${status.ideaCount} ideas)`}
                </button>
                <p className="text-xs text-muted mt-1">Group ideas into cells of 5. Participants vote by allocating XP.</p>
              </div>
            )}

            {/* Close Submissions — VOTING, continuous flow, not yet closed */}
            {status.phase === 'VOTING' && status.continuousFlow && !status.submissionsClosed && (
              <div>
                <button
                  onClick={() => handleFacilitatorAction('close', 'Close submissions')}
                  disabled={actionLoading === 'close'}
                  title="Stop accepting new ideas. Creates a final cell from any leftover ideas. Existing cells finish voting naturally."
                  className="w-full py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {actionLoading === 'close' ? '...' : 'Close Submissions'}
                </button>
                <p className="text-xs text-muted mt-1">Stop accepting new ideas and create the final cell. Existing cells finish voting naturally.</p>
              </div>
            )}

            {/* Submissions closed indicator */}
            {status.phase === 'VOTING' && status.submissionsClosed && (
              <div className="p-2 bg-accent/10 border border-accent/30 rounded-lg text-center">
                <p className="text-xs text-accent font-medium">Submissions closed — waiting for cells to finish voting</p>
              </div>
            )}

            {/* Extend Timer — VOTING, only for timed (non-continuous) mode */}
            {status.phase === 'VOTING' && !status.continuousFlow && (
              <div>
                <button
                  onClick={() => handleFacilitatorAction('extend', 'Extend timer')}
                  disabled={actionLoading === 'extend'}
                  title="Add 15 minutes to the voting timer for all active cells."
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {actionLoading === 'extend' ? '...' : 'Extend +15min'}
                </button>
                <p className="text-xs text-muted mt-1">Add 15 minutes to the voting timer for all active cells.</p>
              </div>
            )}

            {/* Reopen — continuous flow: only when closed (toggles flag, voting continues). Non-CF: resets to SUBMISSION. */}
            {status.continuousFlow ? (
              status.phase === 'VOTING' && status.submissionsClosed && (
                <div>
                  <button
                    onClick={() => handleFacilitatorAction('reopen', 'Reopen submissions')}
                    disabled={actionLoading === 'reopen'}
                    title="Reopen idea submissions. Voting continues at all tiers."
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {actionLoading === 'reopen' ? '...' : 'Reopen Submissions'}
                  </button>
                  <p className="text-xs text-muted mt-1">Accept new ideas again. Voting continues at all tiers — new ideas enter at the bottom.</p>
                </div>
              )
            ) : (
              (status.phase === 'VOTING' || status.phase === 'ACCUMULATING') && (
                <div>
                  <button
                    onClick={() => handleFacilitatorAction('reopen', 'Reopen')}
                    disabled={actionLoading === 'reopen'}
                    title="Reset to submission phase. All current cells and votes are preserved."
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {actionLoading === 'reopen' ? '...' : 'Reopen for Ideas'}
                  </button>
                  <p className="text-xs text-muted mt-1">Pause voting and reopen idea submissions.</p>
                </div>
              )
            )}
          </div>

          {startError && <p className="text-error text-xs mt-2">{startError}</p>}
        </div>
      )}

      {/* Vote history across tiers */}
      {status.phase === 'VOTING' && status.votedTiers?.length > 0 && (
        <div className="mb-4 p-3 bg-surface rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold text-muted">Your Votes</p>
            <div className="flex gap-1">
              {Array.from({ length: status.currentTier }, (_, i) => i + 1).map(tier => (
                <span
                  key={tier}
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono font-bold ${
                    status.votedTiers.includes(tier)
                      ? 'bg-success/20 text-success'
                      : tier === status.currentTier
                      ? 'bg-warning/20 text-warning animate-pulse'
                      : 'bg-background text-muted'
                  }`}
                  title={status.votedTiers.includes(tier) ? `Voted in tier ${tier}` : tier === status.currentTier ? `Vote now — tier ${tier}` : `Tier ${tier}`}
                >
                  {tier}
                </span>
              ))}
            </div>
          </div>
          {status.hasVoted && !voteResult && (
            <p className="text-xs text-muted">Voted tier {status.currentTier} — waiting for other voters to finish.</p>
          )}
          {!status.hasVoted && votingIdeas.length > 0 && (
            <p className="text-xs text-warning">Tier {status.currentTier} vote available below.</p>
          )}
        </div>
      )}

      {/* Already voted (no history yet — tier 1 only) */}
      {status.phase === 'VOTING' && status.hasVoted && !voteResult && (!status.votedTiers || status.votedTiers.length === 0) && (
        <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg text-center">
          <p className="text-success font-semibold mb-1">You've already voted this tier</p>
          <p className="text-xs text-muted">Waiting for other voters to complete their cells.</p>
        </div>
      )}

      {/* VOTING PHASE: XP Allocation */}
      {status.phase === 'VOTING' && !voteResult && !status.hasVoted && votingIdeas.length > 0 && (
        <div className="mb-4 p-4 bg-surface rounded-lg border border-border">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold">Allocate 10 XP</h2>
            <span className={`text-sm font-mono ${totalAllocated === 10 ? 'text-success' : totalAllocated > 10 ? 'text-error' : 'text-muted'}`}>
              {totalAllocated}/10
            </span>
          </div>

          <div className="space-y-4">
            {votingIdeas.map((idea) => (
              <div key={idea.id}>
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm text-foreground flex-1 mr-2">{idea.text}</p>
                  <span className="text-sm font-mono text-accent min-w-[2ch] text-right">
                    {allocations[idea.id] || 0}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={allocations[idea.id] || 0}
                  onChange={(e) => updateAllocation(idea.id, parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted">by {idea.author.name}</p>
              </div>
            ))}
          </div>

          {voteError && <p className="text-error text-xs mt-2">{voteError}</p>}

          <button
            onClick={handleVote}
            disabled={voting || totalAllocated !== 10}
            className="w-full mt-4 py-2.5 bg-warning hover:bg-warning/80 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {voting ? 'Casting Vote...' : 'Cast Vote'}
          </button>
        </div>
      )}

      {/* Vote Confirmation */}
      {voteResult && (
        <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg text-center">
          <p className="text-success font-semibold mb-1">Vote Cast!</p>
          <p className="text-xs text-muted">
            {voteResult.voterCount}/{voteResult.votersNeeded} voters in cell
            {voteResult.cellCompleted && ' — Cell complete!'}
          </p>
          <p className="text-xs text-muted mt-1">
            {voteResult.progress.completedCells}/{voteResult.progress.totalCells} cells done
          </p>
        </div>
      )}

      {/* All Ideas */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold mb-3 text-muted">
          {status.phase === 'COMPLETED' ? 'Final Results' : 'All Ideas'}
        </h2>
        <div className="space-y-2">
          {status.ideas
            .sort((a, b) => b.totalXP - a.totalXP)
            .map((idea, i) => (
              <div
                key={idea.id}
                className={`p-3 rounded-lg border ${
                  idea.isChampion
                    ? 'bg-success/10 border-success/30'
                    : idea.status === 'ADVANCING'
                    ? 'bg-accent/10 border-accent/30'
                    : idea.status === 'ELIMINATED' || idea.status === 'RETIRED'
                    ? 'bg-background border-border opacity-50'
                    : 'bg-surface border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted font-mono">#{i + 1}</span>
                      <p className="text-sm text-foreground">{idea.text}</p>
                    </div>
                    <p className="text-xs text-muted mt-1">by {idea.author.name}</p>
                  </div>
                  <div className="text-right">
                    {idea.totalXP > 0 && (
                      <p className="text-sm font-mono text-gold">{idea.totalXP} XP</p>
                    )}
                    <IdeaStatusBadge status={idea.status} isChampion={idea.isChampion} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="mt-8 mb-4" />
    </div>
  )
}

function PhaseBadge({ phase }: { phase: string }) {
  const config: Record<string, { label: string; color: string }> = {
    SUBMISSION: { label: 'Accepting Ideas', color: 'bg-accent/20 text-accent' },
    VOTING: { label: 'Voting', color: 'bg-warning/20 text-warning' },
    COMPLETED: { label: 'Complete', color: 'bg-success/20 text-success' },
    ACCUMULATING: { label: 'Rolling', color: 'bg-purple-500/20 text-purple-400' },
  }
  const { label, color } = config[phase] || { label: phase, color: 'bg-muted/20 text-muted' }
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium shrink-0 ${color}`}>{label}</span>
}

function IdeaStatusBadge({ status, isChampion }: { status: string; isChampion: boolean }) {
  if (isChampion) return <span className="text-xs text-success font-medium">Priority</span>
  const map: Record<string, { label: string; color: string }> = {
    ADVANCING: { label: 'Advancing', color: 'text-accent' },
    IN_VOTING: { label: 'In Cell', color: 'text-warning' },
    ELIMINATED: { label: 'Out', color: 'text-muted' },
    RETIRED: { label: 'Retired', color: 'text-muted' },
    SUBMITTED: { label: '', color: '' },
    PENDING: { label: '', color: '' },
  }
  const badge = map[status]
  if (!badge || !badge.label) return null
  return <span className={`text-xs ${badge.color}`}>{badge.label}</span>
}
