'use client'

import { useCG } from '@/components/CGProvider'
import { ChantStatus, CommentInfo, IdeaInfo, VoteResult } from '@/lib/types'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, use } from 'react'
import { PentagonConstellation } from '@/components/ConstellationCanvas'

type Tab = 'vote' | 'hearts' | 'submit' | 'cells' | 'guide' | 'manage'

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

  // Tabs
  const [activeTab, setActiveTab] = useState<Tab>('vote')
  const [tabInitialized, setTabInitialized] = useState(false)

  // Cells
  const [selectedCell, setSelectedCell] = useState<string | null>(null)

  // Last vote allocations + cell ideas (stored after voting)
  const [lastAllocations, setLastAllocations] = useState<Record<string, number>>({})
  const [lastCellIdeas, setLastCellIdeas] = useState<{ id: string; text: string }[]>([])
  const [showOtherCellIdeas, setShowOtherCellIdeas] = useState(false)
  const [showRunnerUp, setShowRunnerUp] = useState(false)

  // Discussion
  const [comments, setComments] = useState<CommentInfo[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [expandedIdea, setExpandedIdea] = useState<string | null>(null)
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [postingComment, setPostingComment] = useState<string | null>(null)
  const [commentError, setCommentError] = useState('')
  const [upvoting, setUpvoting] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const cgUserId = user?.id ? `?cgUserId=${user.id}` : ''
      const res = await fetch(`/api/chants/${id}${cgUserId}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setStatus(data)

      const canVote = data.phase === 'VOTING' && (!data.hasVoted || data.multipleIdeasAllowed)
      if (canVote) {
        const cellIdeas = data.fcfsProgress?.currentCellIdeas
        const ideasForVoting = cellIdeas || data.ideas.filter((i: IdeaInfo) => i.status === 'IN_VOTING')
        if (ideasForVoting.length > 0) {
          const init: Record<string, number> = {}
          ideasForVoting.forEach((i: { id: string }) => { init[i.id] = 0 })
          setAllocations(init)
        }
      }

      if (!tabInitialized) {
        if (data.phase === 'VOTING' && !data.hasVoted) {
          setActiveTab('vote')
        } else if (data.phase === 'SUBMISSION') {
          setActiveTab('submit')
        } else if (data.phase === 'COMPLETED') {
          setActiveTab('hearts')
        }
        setTabInitialized(true)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id, user?.id, tabInitialized])

  const fetchComments = useCallback(async () => {
    try {
      const cgUserId = user?.id ? `?cgUserId=${user.id}` : ''
      const res = await fetch(`/api/chants/${id}/comments${cgUserId}`)
      if (!res.ok) return
      const data = await res.json()
      setComments(data.comments || [])
    } catch {
      // silent fail
    }
  }, [id, user?.id])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  useEffect(() => {
    if (activeTab === 'hearts' || activeTab === 'submit') {
      setCommentsLoading(true)
      fetchComments().finally(() => setCommentsLoading(false))
      const interval = setInterval(fetchComments, 15000)
      return () => clearInterval(interval)
    }
  }, [activeTab, fetchComments])

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

      setLastAllocations({ ...allocations })
      setLastCellIdeas(votingIdeas.map(i => ({ id: i.id, text: i.text })))
      setShowOtherCellIdeas(false)
      setVoteResult(data)
      fetchStatus()

      if (status?.multipleIdeasAllowed) {
        setTimeout(() => {
          setVoteResult(null)
          fetchStatus()
        }, 3000)
      }
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
      // "declare" maps to /end with declare flag
      const endpoint = action === 'declare' ? 'end' : action
      const method = action === 'delete' ? 'DELETE' : 'POST'
      const url = action === 'delete' ? `/api/chants/${id}` : `/api/chants/${id}/${endpoint}`

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cgUserId: user.id,
          cgUsername: user.name,
          cgImageUrl: user.imageUrl,
          ...(action === 'declare' && { declare: true }),
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

  const handlePostComment = async (ideaId: string) => {
    if (!user) return
    const text = commentText[ideaId]?.trim()
    if (!text) return

    setPostingComment(ideaId)
    setCommentError('')

    try {
      const res = await fetch(`/api/chants/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cgUserId: user.id,
          cgUsername: user.name,
          cgImageUrl: user.imageUrl,
          text,
          ideaId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post comment')

      setComments(prev => [...prev, data])
      setCommentText(prev => ({ ...prev, [ideaId]: '' }))
    } catch (err) {
      setCommentError((err as Error).message)
    } finally {
      setPostingComment(null)
    }
  }

  const handleUpvote = async (commentId: string) => {
    if (!user || upvoting) return
    setUpvoting(commentId)

    try {
      const res = await fetch(`/api/chants/${id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cgUserId: user.id,
          cgUsername: user.name,
          cgImageUrl: user.imageUrl,
          commentId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to upvote')

      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, upvoteCount: data.upvoteCount, userHasUpvoted: data.upvoted, spreadCount: data.spreadCount }
          : c
      ))
    } catch {
      // silent fail
    } finally {
      setUpvoting(null)
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
        <div className="text-muted animate-pulse text-sm">Loading chant...</div>
      </div>
    )
  }

  if (error || !status) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <Link href={`/${uidParam}`} className="text-accent-light text-sm mb-4 inline-block hover:underline">&larr; Back</Link>
        <p className="text-error">{error || 'Chant not found'}</p>
      </div>
    )
  }

  const cellIdeas = status.fcfsProgress?.currentCellIdeas
  const votingIdeas = cellIdeas
    ? cellIdeas.map(ci => ({ ...ci, status: 'IN_VOTING', tier: status.currentTier, totalXP: 0, totalVotes: 0, isChampion: false, author: { ...ci.author, cgId: undefined } }))
    : status.ideas.filter(i => i.status === 'IN_VOTING')
  const isCreator = user && status.creator.cgId === user.id

  // Group comments by ideaId
  const commentsByIdea: Record<string, CommentInfo[]> = {}
  for (const c of comments) {
    if (c.ideaId) {
      if (!commentsByIdea[c.ideaId]) commentsByIdea[c.ideaId] = []
      commentsByIdea[c.ideaId].push(c)
    }
  }
  const totalComments = comments.length

  const userIdeas = user ? status.ideas.filter(i => i.author.cgId === user.id) : []

  const submissionsOpen = !status.submissionsClosed && (
    status.phase === 'SUBMISSION' || status.phase === 'ACCUMULATING' || (status.phase === 'VOTING' && status.continuousFlow)
  )

  const tabs: { key: Tab; label: string; badge?: number; show: boolean }[] = [
    { key: 'submit', label: 'Submit', show: true },
    { key: 'vote', label: 'Vote', show: true },
    { key: 'hearts', label: status.phase === 'COMPLETED' ? 'Results' : 'Hearts', badge: status.ideas.length, show: true },
    { key: 'cells', label: 'Cells', badge: status.cells.length || undefined, show: true },
    { key: 'guide', label: 'Guide', show: true },
    { key: 'manage', label: 'Manage', show: !!isCreator },
  ]

  return (
    <div className="max-w-lg mx-auto p-4 min-h-screen relative">
      <PentagonConstellation />

      {/* Back link */}
      <Link href={`/${uidParam}`} className="text-accent-light text-xs mb-3 inline-flex items-center gap-1 hover:underline transition-colors">
        <span>&larr;</span> Back
      </Link>

      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h1 className="text-base font-semibold text-foreground leading-tight tracking-tight">{status.question}</h1>
          <PhaseBadge phase={status.phase} />
        </div>
        {status.description && (
          <p className="text-xs text-muted mb-1 leading-relaxed">{status.description}</p>
        )}
        <p className="text-xs text-muted">by {status.creator.name}</p>
      </div>

      {/* Stats */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        <Stat value={status.ideaCount} label="Hearts" />
        <Stat value={status.memberCount} label="Members" />
        <Stat value={status.cells.reduce((sum, c) => sum + c._count.votes, 0)} label="Votes" />
        <Stat value={status.currentTier} label="Tier" />
      </div>

      {/* Champion Banner */}
      {status.champion && (() => {
        const runnersUp = status.ideas
          .filter(i => i.id !== status.champion!.id && i.totalXP > 0)
          .sort((a, b) => b.totalXP - a.totalXP || (Math.random() - 0.5))
          .slice(0, 4)
        return (
          <div className="mb-3 p-3 bg-success/8 border border-success/20 rounded-cg">
            <p className="text-[11px] text-success font-bold mb-0.5 uppercase tracking-wide">🔥 Heart Declared</p>
            <p className="text-foreground font-medium text-sm">{status.champion.text}</p>
            <p className="text-xs text-muted mt-0.5">by {status.champion.author.name} &middot; {status.champion.totalXP} XP</p>
            {runnersUp.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowRunnerUp(!showRunnerUp)}
                  className="text-[11px] text-muted hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <span className="text-[9px]">{showRunnerUp ? '▼' : '▶'}</span>
                  Next {runnersUp.length}
                </button>
                {showRunnerUp && (
                  <div className="mt-1.5 space-y-1.5 pl-1 border-l border-success/20 ml-0.5">
                    {runnersUp.map((idea, i) => (
                      <div key={idea.id} className="text-xs">
                        <span className="font-mono text-muted mr-1.5">#{i + 2}</span>
                        <span className="text-foreground/80">{idea.text}</span>
                        <span className="text-muted ml-1">{idea.totalXP} XP</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* Tab Bar */}
      <div className="flex border-b border-border mb-4 overflow-x-auto gap-0.5">
        {tabs.filter(t => t.show).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium text-center whitespace-nowrap transition-colors rounded-t-cg-md ${
              activeTab === tab.key
                ? 'text-foreground border-b-2 border-accent bg-surface/50'
                : 'text-muted hover:text-foreground hover:bg-surface/30'
            }`}
          >
            {tab.label}
            {tab.badge ? <span className="ml-1 text-muted/50 text-[10px]">{tab.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* ─── VOTE TAB ─── */}
      {activeTab === 'vote' && (
        <div>
          {status.phase === 'VOTING' && status.fcfsProgress && (
            <div className="mb-4 p-3 bg-surface rounded-cg border border-border shadow-cg-sm">
              <div className="flex justify-between text-xs text-muted mb-1.5">
                <span className="font-medium">Current Cell</span>
                <span>{status.fcfsProgress.currentCellVoters}/{status.fcfsProgress.votersNeeded} voters</span>
              </div>
              <div className="w-full bg-background rounded-full h-1.5 mb-3">
                <div
                  className="bg-accent h-1.5 rounded-full transition-all"
                  style={{ width: `${(status.fcfsProgress.currentCellVoters / status.fcfsProgress.votersNeeded) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted mb-1.5">
                <span className="font-medium">Tier {status.currentTier}</span>
                <span>{status.fcfsProgress.completedCells}/{status.fcfsProgress.totalCells} cells done</span>
              </div>
              <div className="w-full bg-background rounded-full h-1.5">
                <div
                  className="bg-success h-1.5 rounded-full transition-all"
                  style={{ width: `${status.fcfsProgress.totalCells > 0 ? (status.fcfsProgress.completedCells / status.fcfsProgress.totalCells) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {status.phase === 'VOTING' && status.currentTier >= 1 && (
            <div className="mb-4 p-3 bg-surface rounded-cg border border-border shadow-cg-sm">
              <p className="text-xs font-medium text-muted mb-2">Your Votes</p>
              <div className="space-y-1">
                {Array.from({ length: status.currentTier }, (_, i) => i + 1).map(tier => {
                  const voted = status.votedTiers?.includes(tier)
                  const isCurrent = tier === status.currentTier
                  const available = isCurrent && !voted && !voteResult && votingIdeas.length > 0
                  const justVoted = isCurrent && voteResult
                  return (
                    <div key={tier} className="flex items-center gap-2 text-xs">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                        voted || justVoted
                          ? 'bg-success/15 text-success'
                          : available
                          ? 'bg-warning/15 text-warning animate-pulse'
                          : 'bg-surface-active text-muted'
                      }`}>
                        {tier}
                      </span>
                      <span className={`${
                        voted || justVoted ? 'text-muted' : available ? 'text-warning' : 'text-muted'
                      }`}>
                        {voted || justVoted
                          ? isCurrent ? 'Voted — waiting for others' : 'Voted'
                          : available
                          ? 'Vote available below'
                          : isCurrent
                          ? 'Waiting for cell...'
                          : 'Missed'}
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Show last vote allocations + other cell ideas */}
              {Object.keys(lastAllocations).length > 0 && (status.hasVoted || voteResult) && (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] text-muted font-medium">Your allocations:</p>
                  {Object.entries(lastAllocations)
                    .filter(([, pts]) => pts > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([ideaId, pts]) => {
                      const idea = status.ideas.find(i => i.id === ideaId) || lastCellIdeas.find(i => i.id === ideaId)
                      return (
                        <div key={ideaId} className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-accent-light min-w-[2ch] text-right">{pts}</span>
                          <span className="text-foreground/70 truncate">{idea?.text || 'Unknown heart'}</span>
                        </div>
                      )
                    })}
                  {/* Other cell ideas (0 points) */}
                  {(() => {
                    const otherIdeas = lastCellIdeas.filter(ci => !lastAllocations[ci.id] || lastAllocations[ci.id] === 0)
                    if (otherIdeas.length === 0) return null
                    return (
                      <div className="mt-1.5">
                        <button
                          onClick={() => setShowOtherCellIdeas(!showOtherCellIdeas)}
                          className="text-[11px] text-muted hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <span className="text-[9px]">{showOtherCellIdeas ? '▼' : '▶'}</span>
                          {otherIdeas.length} other cell {otherIdeas.length === 1 ? 'heart' : 'hearts'}
                        </button>
                        {showOtherCellIdeas && (
                          <div className="mt-1 space-y-1 pl-1 border-l border-border/50 ml-1">
                            {otherIdeas.map(idea => (
                              <div key={idea.id} className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted min-w-[2ch] text-right">0</span>
                                <span className="text-muted truncate">{idea.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          {status.phase === 'SUBMISSION' && (
            <EmptyState icon={'⚖'} title="Voting hasn't started yet" subtitle={<>Hearts are being collected. Switch to <TabLink onClick={() => setActiveTab('submit')} label="Submit" /> to add yours.</>} />
          )}

          {status.phase === 'COMPLETED' && !status.champion && (
            <EmptyState icon={'✓'} title="Voting is complete" />
          )}

          {status.phase === 'COMPLETED' && status.champion && (
            <EmptyState icon={'★'} title="🔥 Heart Declared" bold subtitle={<>Check <TabLink onClick={() => setActiveTab('hearts')} label="Results" /> for full rankings.</>} />
          )}

          {status.phase === 'VOTING' && status.hasVoted && !status.multipleIdeasAllowed && !voteResult && (
            <div className="p-4 bg-success/8 border border-success/20 rounded-cg text-center">
              <p className="text-success font-semibold text-sm mb-1">Vote cast</p>
              <p className="text-xs text-muted">Waiting for other voters to complete their cells.</p>
            </div>
          )}

          {voteResult && (
            <div className="p-4 bg-success/8 border border-success/20 rounded-cg text-center">
              <p className="text-success font-semibold text-sm mb-1">Vote Cast!</p>
              <p className="text-xs text-muted">
                {voteResult.voterCount}/{voteResult.votersNeeded} voters in cell
                {voteResult.cellCompleted && ' — Cell complete!'}
              </p>
              <p className="text-xs text-muted mt-1">
                {voteResult.progress.completedCells}/{voteResult.progress.totalCells} cells done
              </p>
            </div>
          )}

          {status.phase === 'VOTING' && !voteResult && (!status.hasVoted || status.multipleIdeasAllowed) && votingIdeas.length > 0 && (
            <div className="p-4 bg-surface rounded-cg border border-border shadow-cg-sm">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-foreground">Allocate 10 XP</h2>
                <span className={`text-sm font-mono font-bold ${totalAllocated === 10 ? 'text-success' : totalAllocated > 10 ? 'text-error' : 'text-muted'}`}>
                  {totalAllocated}/10
                </span>
              </div>

              <div className="space-y-4">
                {votingIdeas.map((idea) => (
                  <div key={idea.id}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm text-foreground flex-1 mr-2">{idea.text}</p>
                      <span className="text-sm font-mono font-bold text-accent-light min-w-[2ch] text-right">
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
                className="w-full mt-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-cg transition-colors shadow-cg-sm"
              >
                {voting ? <><span className="animate-pulse">💓</span> Submitting...</> : 'Cast Vote'}
              </button>
            </div>
          )}

          {status.phase === 'VOTING' && !status.hasVoted && !voteResult && votingIdeas.length === 0 && (
            <EmptyState icon={'⏳'} title="Waiting for a cell" subtitle="Cells form as voters arrive. You'll be assigned shortly." />
          )}
        </div>
      )}

      {/* ─── SUBMIT TAB ─── */}
      {activeTab === 'submit' && (
        <div className="space-y-3">
          {/* Status banner */}
          <div className={`p-3 rounded-cg border text-xs ${
            status.submissionsClosed
              ? 'bg-surface-active border-border text-muted'
              : status.multipleIdeasAllowed
              ? 'bg-accent/8 border-accent/20 text-accent-light'
              : 'bg-surface border-border text-muted'
          }`}>
            {status.submissionsClosed
              ? '🔒 Submissions are closed. Voting is in progress.'
              : status.multipleIdeasAllowed
              ? '✨ Multiple hearts allowed — submit as many as you like.'
              : userIdeas.length > 0
              ? '✓ You\'ve submitted your heart. One per person.'
              : '💡 One heart per person. Make it count.'}
          </div>

          {/* Form (when open) */}
          {!status.submissionsClosed && (status.multipleIdeasAllowed || userIdeas.length === 0) && (
            <form onSubmit={handleSubmitIdea} className="p-4 bg-surface rounded-cg border border-border shadow-cg-sm">
              <h2 className="text-sm font-semibold mb-1 text-foreground">Submit Your Heart</h2>
              <p className="text-xs text-muted mb-3 leading-relaxed">
                Answer the question with your best heart.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your heart..."
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  maxLength={500}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-cg text-sm text-foreground placeholder-muted/50 focus:outline-none focus:border-accent transition-colors"
                />
                <button
                  type="submit"
                  disabled={submitting || !ideaText.trim()}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-cg transition-colors whitespace-nowrap shadow-cg-sm"
                >
                  {submitting ? <><span className="animate-pulse">💓</span> Submitting...</> : 'Submit'}
                </button>
              </div>
              {submitError && <p className="text-error text-xs mt-2">{submitError}</p>}
              {submitSuccess && <p className="text-success text-xs mt-2">Heart submitted!</p>}
            </form>
          )}

          {/* Your submitted ideas with read-only discussion */}
          {userIdeas.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted mb-2">Your heart{userIdeas.length > 1 ? 's' : ''}</h3>
              <div className="space-y-1.5">
                {userIdeas.map(idea => {
                  const ideaComments = commentsByIdea[idea.id] || []
                  const isExpanded = expandedIdea === idea.id
                  return (
                    <div key={idea.id} className="bg-surface rounded-cg border border-border overflow-hidden">
                      <button
                        onClick={() => setExpandedIdea(isExpanded ? null : idea.id)}
                        className="w-full p-2.5 text-left flex items-start justify-between gap-2 hover:bg-surface-hover/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{idea.text}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {idea.totalXP > 0 && (
                            <span className="text-[11px] font-mono font-bold text-warning">{idea.totalXP}</span>
                          )}
                          <IdeaStatusBadge status={idea.status} isChampion={idea.isChampion} tier={idea.tier} />
                          {ideaComments.length > 0 && (
                            <span className="text-[10px] text-muted bg-surface-active px-1.5 py-0.5 rounded-full">{ideaComments.length}</span>
                          )}
                          <span className="text-muted text-[10px]">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border">
                          {ideaComments.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto">
                              {ideaComments.map(comment => (
                                <div key={comment.id} className="px-3 py-2 border-b border-border/40 last:border-0">
                                  <div className="flex items-start gap-2">
                                    {comment.user.image ? (
                                      <img src={comment.user.image} alt="" className="w-4 h-4 rounded-full shrink-0 mt-0.5" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full bg-accent/15 shrink-0 mt-0.5" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-[11px] font-medium text-foreground">{comment.user.name}</span>
                                        <span className="text-[10px] text-muted">{formatTimeAgo(comment.createdAt)}</span>
                                        {(comment.spreadCount ?? 0) > 0 && (
                                          <span className="text-[10px] text-accent-light">&#x2191; spreading</span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-foreground/70 mt-0.5 break-words">{comment.text}</p>
                                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                                        <span>{comment.userHasUpvoted ? '\u25B2' : '\u25B3'}</span>
                                        <span>{comment.upvoteCount > 0 ? comment.upvoteCount : ''}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="px-3 py-2 text-[11px] text-muted text-center">No comments yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <p className="text-xs text-muted text-center">{status.ideaCount} heart{status.ideaCount !== 1 ? 's' : ''} submitted so far</p>
        </div>
      )}

      {/* ─── HEARTS TAB (merged Ideas + Discussion) ─── */}
      {activeTab === 'hearts' && (
        <div>
          {commentsLoading && comments.length === 0 && status.ideas.length > 0 && (
            <p className="text-muted text-xs text-center py-2 animate-pulse">Loading comments...</p>
          )}

          {status.ideas.length === 0 ? (
            <EmptyState icon={'💡'} title="No hearts yet" subtitle="Be the first to submit one!" />
          ) : (
            <div className="space-y-2">
              {status.ideas
                .sort((a, b) => b.totalXP - a.totalXP)
                .map((idea, i) => {
                  const ideaComments = commentsByIdea[idea.id] || []
                  const isExpanded = expandedIdea === idea.id
                  const userCommented = user && ideaComments.some(c => c.user.name === user.name)
                  return (
                    <div
                      key={idea.id}
                      className={`rounded-cg border overflow-hidden shadow-cg-sm ${
                        idea.isChampion
                          ? 'bg-success/8 border-success/20'
                          : idea.status === 'ADVANCING'
                          ? 'bg-[#ff3d8f]/8 border-[#ff3d8f]/20'
                          : 'bg-surface border-border'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedIdea(isExpanded ? null : idea.id)}
                        className="w-full p-3 text-left hover:bg-surface-hover/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-muted font-mono">#{i + 1}</span>
                              <p className="text-sm text-foreground">{idea.text}</p>
                            </div>
                            <p className="text-xs text-muted mt-0.5">by {idea.author.name}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {idea.totalXP > 0 && (
                              <span className="text-xs font-mono font-bold text-warning">{idea.totalXP}</span>
                            )}
                            <IdeaStatusBadge status={idea.status} isChampion={idea.isChampion} tier={idea.tier} />
                            {userCommented && (
                              <span className="text-[10px] text-accent-light" title="You commented">&#x2713;</span>
                            )}
                            {ideaComments.length > 0 && (
                              <span className="text-[11px] text-muted bg-surface-active px-1.5 py-0.5 rounded-full">{ideaComments.length}</span>
                            )}
                            <span className="text-muted text-xs">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border">
                          {ideaComments.length > 0 ? (
                            <div className="max-h-64 overflow-y-auto">
                              {ideaComments.map((comment) => (
                                <div key={comment.id} className="px-3 py-2 border-b border-border/40 last:border-0">
                                  <div className="flex items-start gap-2">
                                    {comment.user.image ? (
                                      <img src={comment.user.image} alt="" className="w-5 h-5 rounded-full shrink-0 mt-0.5" />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-accent/15 shrink-0 mt-0.5" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-xs font-medium text-foreground">{comment.user.name}</span>
                                        <span className="text-[10px] text-muted">{formatTimeAgo(comment.createdAt)}</span>
                                        {(comment.spreadCount ?? 0) > 0 && (
                                          <span className="text-[10px] text-accent-light" title={`Spread to ${comment.spreadCount} other cell${(comment.spreadCount ?? 0) > 1 ? 's' : ''}`}>
                                            &#x2191; spreading
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-foreground/80 mt-0.5 break-words leading-relaxed">{comment.text}</p>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleUpvote(comment.id) }}
                                        disabled={upvoting === comment.id}
                                        className={`mt-1 flex items-center gap-1 text-[10px] transition-colors ${
                                          comment.userHasUpvoted
                                            ? 'text-accent-light'
                                            : 'text-muted hover:text-foreground'
                                        }`}
                                      >
                                        <span>{comment.userHasUpvoted ? '\u25B2' : '\u25B3'}</span>
                                        <span>{comment.upvoteCount > 0 ? comment.upvoteCount : 'Upvote'}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="px-3 py-3 text-xs text-muted text-center">No comments yet.</p>
                          )}

                          {user && (
                            <div className="p-2 border-t border-border bg-background/50">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Add a comment..."
                                  value={commentText[idea.id] || ''}
                                  onChange={(e) => setCommentText(prev => ({ ...prev, [idea.id]: e.target.value }))}
                                  maxLength={2000}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      handlePostComment(idea.id)
                                    }
                                  }}
                                  className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-cg-md text-xs text-foreground placeholder-muted/50 focus:outline-none focus:border-accent transition-colors"
                                />
                                <button
                                  onClick={() => handlePostComment(idea.id)}
                                  disabled={postingComment === idea.id || !commentText[idea.id]?.trim()}
                                  className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs rounded-cg-md transition-colors font-medium"
                                >
                                  {postingComment === idea.id ? '...' : 'Send'}
                                </button>
                              </div>
                              {commentError && postingComment === null && (
                                <p className="text-error text-[10px] mt-1">{commentError}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* ─── CELLS TAB ─── */}
      {activeTab === 'cells' && (
        <div>
          {status.cells.length === 0 ? (
            <EmptyState icon={'⬡'} title="No cells yet" subtitle="Cells form when voting begins." />
          ) : (
            <div className="space-y-4">
              {Array.from(new Set(status.cells.map(c => c.tier)))
                .sort((a, b) => a - b)
                .map(tier => {
                  const tierCells = status.cells.filter(c => c.tier === tier)
                  return (
                    <div key={tier}>
                      <p className="text-xs font-medium text-muted mb-2">Tier {tier}</p>
                      <div className="grid grid-cols-5 gap-2">
                        {tierCells.map((cell, i) => {
                          const isSelected = selectedCell === cell.id
                          const isComplete = cell.status === 'COMPLETED'
                          const isVoting = cell.status === 'VOTING'
                          return (
                            <button
                              key={cell.id}
                              onClick={() => setSelectedCell(isSelected ? null : cell.id)}
                              className={`aspect-square rounded-cg border text-sm font-mono font-bold transition-all ${
                                isSelected
                                  ? 'bg-[rgba(0,220,180,0.20)] border-[rgba(0,220,180,0.5)] text-[rgb(0,220,180)]'
                                  : isComplete
                                  ? 'bg-[rgba(0,220,180,0.08)] border-[rgba(0,220,180,0.25)] text-[rgb(0,220,180)]'
                                  : isVoting
                                  ? 'bg-warning/8 border-warning/25 text-warning animate-pulse'
                                  : 'bg-surface border-border text-muted'
                              }`}
                            >
                              {i + 1}
                            </button>
                          )
                        })}
                      </div>

                      {/* Expanded cell detail */}
                      {tierCells.map(cell => {
                        if (selectedCell !== cell.id) return null
                        const ideas = cell.ideas || []
                        return (
                          <div key={`detail-${cell.id}`} className="mt-2 p-3 bg-surface rounded-cg border border-[rgba(0,220,180,0.2)] shadow-cg-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-foreground">Cell {tierCells.indexOf(cell) + 1}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted">{cell._count.participants} voters &middot; {cell._count.votes} votes</span>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                  cell.status === 'COMPLETED' ? 'bg-[rgba(0,220,180,0.12)] text-[rgb(0,220,180)]'
                                    : cell.status === 'VOTING' ? 'bg-warning/12 text-warning'
                                    : 'bg-surface-active text-muted'
                                }`}>
                                  {cell.status === 'COMPLETED' ? 'Done' : cell.status === 'VOTING' ? 'Voting' : cell.status}
                                </span>
                              </div>
                            </div>
                            {ideas.length > 0 ? (
                              <div className="space-y-1.5">
                                {ideas.map(idea => (
                                  <div key={idea.id} className="flex items-start justify-between gap-2 p-2 bg-background rounded-cg-md">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-foreground truncate">{idea.text}</p>
                                      <p className="text-[10px] text-muted">by {idea.author.name}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {idea.totalXP > 0 && (
                                        <span className="text-[11px] font-mono font-bold text-warning">{idea.totalXP}</span>
                                      )}
                                      <IdeaStatusBadge status={idea.status} isChampion={false} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted text-center py-2">No hearts loaded</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* ─── GUIDE TAB ─── */}
      {activeTab === 'guide' && (
        <div className="space-y-3">
          <GuideSection title="What is a Chant?" icon={'\u2605'}>
            A chant is a question posed to a group. Everyone submits ideas (hearts), then the group narrows down to the strongest answer through small-group voting.
          </GuideSection>

          <GuideSection title="1. Submit a Heart" icon={'💡'}>
            A heart is your idea — your answer to the question. Go to the <TabLink onClick={() => setActiveTab('submit')} label="Submit" /> tab and share yours. One heart per person (unless Unlimited Mode is on).
          </GuideSection>

          <GuideSection title="2. Voting Cells" icon={'⬡'}>
            Hearts are grouped into cells of 5. You&apos;re assigned to a cell automatically as you arrive.
          </GuideSection>

          <GuideSection title="3. Allocate 10 XP" icon={'⚖'}>
            You get <strong className="text-foreground">10 XP</strong> to distribute across the hearts in your cell. Give more to hearts you think are strongest.
            <span className="block mt-1 text-muted">Examples: 10-0-0-0-0 (all-in), 6-3-1-0-0 (split), 4-3-2-1-0 (spread)</span>
          </GuideSection>

          <GuideSection title="4. Heart Advanced" icon={'💗'}>
            The top heart in each cell advances to the next tier. Hearts that advance are marked <strong className="text-[#ff3d8f]">Heart Advanced</strong>.
          </GuideSection>

          <GuideSection title="4b. Heart Kept" icon={'🤍'} titleColor="text-[#ff3d8f]/60">
            If your heart doesn&apos;t advance, don&apos;t worry — it&apos;s not gone. It&apos;s marked <strong className="text-[#ff3d8f]/60">Heart Kept</strong>, meaning the group heard it and it mattered. Every heart shapes the conversation, even if it doesn&apos;t win the cell. Your voice was part of the decision.
          </GuideSection>

          <GuideSection title="5. 🔥 Heart Declared" icon={'👑'} titleColor="text-success">
            When one heart remains, a final showdown determines the winner. The declared heart is the group&apos;s collective answer.
          </GuideSection>

          <GuideSection title="Discussion" icon={'💬'}>
            Use the <TabLink onClick={() => setActiveTab('hearts')} label="Hearts" /> tab to comment on hearts. Upvoted comments can spread to other cells (up-pollination).
          </GuideSection>

          {isCreator && (
            <GuideSection title="Facilitator Controls" icon={'⚙'}>
              As the creator, you have a <TabLink onClick={() => setActiveTab('manage')} label="Manage" /> tab with controls to start voting, close submissions, and advance tiers.
            </GuideSection>
          )}

          <div className="pt-2 text-center">
            <a
              href="https://unitychant.com/how-it-works"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent-light hover:underline"
            >
              Full documentation on unitychant.com &rarr;
            </a>
          </div>
        </div>
      )}

      {/* ─── MANAGE TAB ─── */}
      {activeTab === 'manage' && isCreator && (
        <div>
          {status.phase === 'COMPLETED' ? (
            <EmptyState icon={'✓'} title="Chant complete" subtitle="No actions available." />
          ) : (
            <div className="space-y-3">
              {actionError && <p className="text-error text-xs p-2.5 bg-error/8 rounded-cg border border-error/15">{actionError}</p>}
              {actionSuccess && <p className="text-success text-xs p-2.5 bg-success/8 rounded-cg border border-success/15">{actionSuccess}</p>}
              {startError && <p className="text-error text-xs p-2.5 bg-error/8 rounded-cg border border-error/15">{startError}</p>}

              {status.phase === 'SUBMISSION' && (
                <ManageAction
                  label={`Start Voting (${status.ideaCount} hearts)`}
                  description="Group hearts into cells of 5. Participants vote by allocating XP."
                  color="bg-warning hover:bg-warning-hover"
                  disabled={starting || status.ideaCount < 5}
                  loading={starting}
                  onClick={handleStartVoting}
                />
              )}

              {status.phase === 'SUBMISSION' && status.ideaCount < 5 && (
                <p className="text-xs text-warning px-1">Need at least 5 hearts to start voting ({status.ideaCount} submitted).</p>
              )}

              {status.phase === 'VOTING' && status.continuousFlow && (
                <>
                  <ManageAction
                    label={status.submissionsClosed ? 'Force Complete Cells' : 'Close & Advance'}
                    description={status.submissionsClosed
                      ? 'Force-complete any open cells and advance the tier.'
                      : 'Stop accepting new submissions and force-complete open cells.'}
                    color="bg-accent hover:bg-accent-hover"
                    disabled={actionLoading === 'close'}
                    loading={actionLoading === 'close'}
                    onClick={() => handleFacilitatorAction('close', status.submissionsClosed ? 'Force complete' : 'Close & advance')}
                  />
                  <ManageAction
                    label="Declare Priority"
                    description="Announce the current top heart as priority. Voting keeps going — you can re-declare anytime."
                    color="bg-success hover:bg-success-hover"
                    disabled={actionLoading === 'declare'}
                    loading={actionLoading === 'declare'}
                    onClick={() => handleFacilitatorAction('declare', 'Declare priority')}
                  />
                </>
              )}

              {status.phase === 'VOTING' && !status.continuousFlow && (
                <ManageAction
                  label="Extend +15min"
                  description="Add 15 minutes to the voting timer for all active cells."
                  color="bg-info hover:bg-info/80"
                  disabled={actionLoading === 'extend'}
                  loading={actionLoading === 'extend'}
                  onClick={() => handleFacilitatorAction('extend', 'Extend timer')}
                />
              )}

              {status.continuousFlow ? (
                status.phase === 'VOTING' && status.submissionsClosed && (
                  <ManageAction
                    label="Reopen Submissions"
                    description="Accept new hearts again. Voting continues."
                    color="bg-brand-500 hover:bg-brand-600"
                    disabled={actionLoading === 'reopen'}
                    loading={actionLoading === 'reopen'}
                    onClick={() => handleFacilitatorAction('reopen', 'Reopen submissions')}
                  />
                )
              ) : (
                (status.phase === 'VOTING' || status.phase === 'ACCUMULATING') && (
                  <ManageAction
                    label="Reopen for Hearts"
                    description="Pause voting and reopen heart submissions."
                    color="bg-brand-500 hover:bg-brand-600"
                    disabled={actionLoading === 'reopen'}
                    loading={actionLoading === 'reopen'}
                    onClick={() => handleFacilitatorAction('reopen', 'Reopen')}
                  />
                )
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 mb-4" />
    </div>
  )
}

// ─── Helper Components ───

function EmptyState({ icon, title, bold, subtitle }: { icon: string; title: string; bold?: boolean; subtitle?: React.ReactNode }) {
  return (
    <div className="p-8 text-center">
      <div className="text-2xl mb-3 opacity-40">{icon}</div>
      <p className={`text-sm text-muted ${bold ? 'font-bold' : 'font-medium'} mb-1`}>{title}</p>
      {subtitle && <p className="text-xs text-muted leading-relaxed">{subtitle}</p>}
    </div>
  )
}

function TabLink({ onClick, label }: { onClick: () => void; label: string }) {
  return <button onClick={onClick} className="text-accent-light hover:underline font-medium">{label}</button>
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="p-2 bg-surface rounded-cg border border-border text-center">
      <p className="text-base font-mono font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  )
}

function GuideSection({ title, icon, titleColor, children }: { title: string; icon: string; titleColor?: string; children: React.ReactNode }) {
  return (
    <div className="p-3 bg-surface rounded-cg border border-border">
      <h3 className={`text-sm font-semibold ${titleColor || 'text-foreground'} mb-1`}>
        <span className="mr-1.5">{icon}</span>{title}
      </h3>
      <p className="text-xs text-muted leading-relaxed">{children}</p>
    </div>
  )
}

function ManageAction({ label, description, color, disabled, loading, onClick }: {
  label: string
  description: string
  color: string
  disabled: boolean
  loading: boolean
  onClick: () => void
}) {
  return (
    <div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full py-2.5 ${color} disabled:opacity-50 text-white text-xs font-medium rounded-cg transition-colors shadow-cg-sm`}
      >
        {loading ? '...' : label}
      </button>
      <p className="text-xs text-muted mt-1.5 leading-relaxed">{description}</p>
    </div>
  )
}

function PhaseBadge({ phase }: { phase: string }) {
  const config: Record<string, { label: string; color: string }> = {
    SUBMISSION: { label: 'Accepting Hearts', color: 'bg-accent/15 text-accent-light' },
    VOTING: { label: 'Voting', color: 'bg-warning/15 text-warning' },
    COMPLETED: { label: 'Complete', color: 'bg-success/15 text-success' },
    ACCUMULATING: { label: 'Rolling', color: 'bg-brand-400/15 text-brand-300' },
  }
  const { label, color } = config[phase] || { label: phase, color: 'bg-muted/15 text-muted' }
  return <span className={`px-2 py-0.5 text-[11px] rounded-full font-medium shrink-0 ${color}`}>{label}</span>
}

function IdeaStatusBadge({ status, isChampion, tier }: { status: string; isChampion: boolean; tier?: number }) {
  if (isChampion) return <span className="text-[11px] text-success font-bold">🔥 Heart Declared{tier ? ` (Tier ${tier})` : ''}</span>
  const map: Record<string, { label: string; color: string }> = {
    ADVANCING: { label: 'Heart Advanced', color: 'text-[#ff3d8f]' },
    IN_VOTING: { label: 'In Cell', color: 'text-success' },
    ELIMINATED: { label: 'Heart Kept', color: 'text-[#ff3d8f]/60' },
    RETIRED: { label: 'Heart Kept', color: 'text-[#ff3d8f]/60' },
    SUBMITTED: { label: 'Submitted', color: 'text-accent-light' },
    PENDING: { label: 'Waiting', color: 'text-muted' },
  }
  const badge = map[status]
  if (!badge || !badge.label) return null
  return <span className={`text-[11px] ${badge.color}`}>{badge.label}</span>
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffSec = Math.floor((now - then) / 1000)

  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}
