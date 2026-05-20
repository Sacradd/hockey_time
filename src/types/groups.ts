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
  phone: string
  role: 'admin' | 'player'
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
  phone: string
  role: string
  position: 'player' | 'goalie'
  is_active: boolean
}

export interface GameSummary {
  id: number
  group_date: string
  title: string | null
  vote_active: boolean
  payment_active: boolean
}
