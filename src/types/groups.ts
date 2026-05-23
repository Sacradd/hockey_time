export interface DayGroup {
  id: number
  group_date: string
  title: string | null
  vote_active: boolean
  payment_active: boolean
  members_count?: number
  my_actual?: boolean | null
}

export interface GroupMember {
  user_id: number
  name: string
  phone?: string
  role: string
  position: 'player' | 'goalie'
  actual: boolean
  is_guest: boolean
  excluded: boolean
}

export interface GroupDetail {
  id: number
  group_date: string
  title: string | null
}

export interface Roster {
  id: number
  title: string
  venue: string | null
  weekday: number | null
  members_count: number
  games_count: number
}

export interface RosterMember {
  user_id: number
  name: string
  phone?: string
  role: string
  position: 'player' | 'goalie'
  is_active: boolean
  is_admin?: boolean
}

export interface ActiveGame extends GameSummary {
  roster_id: number
  roster_title: string
  roster_venue: string | null
}

export interface DashboardData {
  admin_rosters: Roster[]
  active_games: ActiveGame[]
  can_create_roster?: boolean
}

export interface ProfileRosterSummary {
  id: number
  title: string
  venue: string | null
  weekday: number | null
  members_count: number
  is_admin: boolean
}

export interface PlayerSearchHit {
  user_id: number
  name: string
  phone_display?: string
  position?: 'player' | 'goalie'
  is_active: boolean
  in_roster: boolean
}

export interface ProfileRosterDetail {
  roster: Pick<Roster, 'id' | 'title' | 'venue' | 'weekday'>
  admins: RosterMember[]
  players: RosterMember[]
  goalies: RosterMember[]
  can_manage: boolean
}

export interface GameSummary {
  id: number
  group_date: string
  title: string | null
  vote_active: boolean
  vote_open?: boolean
  vote_ends_at?: string | null
  payment_active: boolean
}
