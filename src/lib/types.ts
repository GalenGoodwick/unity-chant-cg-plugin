export interface CGUserInfo {
  id: string
  name: string
  imageUrl?: string
  email?: string
  roles: string[]
}

export interface CGCommunityInfo {
  id: string
  title: string
  imageUrl?: string
}

export interface Chant {
  id: string
  question: string
  description?: string | null
  phase: 'SUBMISSION' | 'VOTING' | 'COMPLETED' | 'ACCUMULATING'
  currentTier: number
  allocationMode: string
  championId?: string | null
  createdAt: string
  creator: { name: string; cgId?: string }
  _count: { members: number; ideas: number }
}

export interface ChantStatus {
  id: string
  question: string
  description?: string | null
  phase: 'SUBMISSION' | 'VOTING' | 'COMPLETED' | 'ACCUMULATING'
  allocationMode: string
  continuousFlow: boolean
  multipleIdeasAllowed: boolean
  submissionsClosed: boolean
  currentTier: number
  memberCount: number
  ideaCount: number
  creator: { id: string; name: string; cgId?: string }
  champion: IdeaInfo | null
  ideas: IdeaInfo[]
  cells: CellInfo[]
  fcfsProgress: {
    currentCellIndex: number
    totalCells: number
    currentCellVoters: number
    votersNeeded: number
    completedCells: number
    currentCellIdeas?: { id: string; text: string; author: { id: string; name: string } }[]
  } | null
  hasVoted: boolean
  votedTiers: number[]
  createdAt: string
}

export interface IdeaInfo {
  id: string
  text: string
  status: string
  tier: number
  totalXP: number
  totalVotes: number
  isChampion: boolean
  author: { id: string; name: string; cgId?: string }
}

export interface CellIdea {
  id: string
  text: string
  totalXP: number
  status: string
  author: { name: string }
}

export interface CellInfo {
  id: string
  tier: number
  status: string
  createdAt: string
  _count: { participants: number; votes: number }
  ideas?: CellIdea[]
}

export interface CommentInfo {
  id: string
  text: string
  ideaId: string | null
  createdAt: string
  upvoteCount: number
  userHasUpvoted: boolean
  spreadCount?: number
  user: { id: string; name: string; image: string | null }
}

export interface VoteResult {
  success: boolean
  cellId: string
  cellCompleted: boolean
  voterCount: number
  votersNeeded: number
  progress: {
    completedCells: number
    totalCells: number
    tierComplete: boolean
  }
}
