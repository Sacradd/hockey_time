import type { GroupMember } from '@/types/groups'

export interface VoteLabel {
  choice: number
  label: string
}

export interface GamePublic {
  id: number
  roster_id: number
  group_date: string
  title: string | null
  roster_title: string | null
  roster_venue: string | null
  vote_active: boolean
  vote_open: boolean
  vote_ends_at: string | null
  vote_labels: VoteLabel[]
  vote_go_option: number
  payment_active: boolean
  can_manage: boolean
}

export interface MyVote {
  choice: number
  voted_at: string
}

export type LineupMember = GroupMember & {
  choice?: number
  voted_at?: string
  /** Порядок в очереди «еду» (1 = первый) */
  queue_order?: number
}

export interface GameLineup {
  field_lineup: LineupMember[]
  field_reserve: LineupMember[]
  field_declined: LineupMember[]
  field_pending: LineupMember[]
  goalie_lineup: LineupMember[]
  goalie_reserve: LineupMember[]
  goalie_declined: LineupMember[]
  goalie_pending: LineupMember[]
}

export interface GameDetailResponse {
  ok: boolean
  game: GamePublic
  my_vote: MyVote | null
  lineup: GameLineup
}
