import type { GameLineup, LineupMember } from '@/types/games'

export type MatchTeam = 'white' | 'black'

/** Игроки в игре: основа и резерв (полевые и вратари). */
export function collectInGameLineupMembers(lineup: GameLineup): LineupMember[] {
  const all = [
    ...lineup.field_lineup,
    ...lineup.field_reserve,
    ...lineup.goalie_lineup,
    ...lineup.goalie_reserve,
  ]

  return all.sort((a, b) => {
    const qa = a.queue_order ?? 9999
    const qb = b.queue_order ?? 9999
    if (qa !== qb) return qa - qb
    return a.name.localeCompare(b.name, 'ru')
  })
}

export function matchTeamLabel(team: MatchTeam): string {
  return team === 'white' ? 'Белые' : 'Черные'
}

export function parseMatchTeams(
  raw: Record<string, string> | null | undefined
): Record<number, MatchTeam> {
  if (!raw) return {}
  const out: Record<number, MatchTeam> = {}
  for (const [key, value] of Object.entries(raw)) {
    const userId = Number(key)
    if (!Number.isFinite(userId) || userId < 1) continue
    if (value === 'white' || value === 'black') {
      out[userId] = value
    }
  }
  return out
}

/** Слоты живого блока: 1 вратарь + 10 полевых. */
export const TEAM_BOARD_SLOTS = 11

export const MATCH_TEAM_MAX_FIELD = 10
export const MATCH_TEAM_MAX_GOALIES = 1

export type MatchTeamAssignResult =
  | { ok: true }
  | { ok: false; message: string }

export function buildTeamBoardSlots(members: LineupMember[]): (LineupMember | null)[] {
  const sorted = [...members].sort((a, b) => {
    const ga = a.position === 'goalie' ? 0 : 1
    const gb = b.position === 'goalie' ? 0 : 1
    if (ga !== gb) return ga - gb
    const qa = a.queue_order ?? 9999
    const qb = b.queue_order ?? 9999
    if (qa !== qb) return qa - qb
    return a.name.localeCompare(b.name, 'ru')
  })

  const goalies = sorted.filter((m) => m.position === 'goalie')
  const field = sorted.filter((m) => m.position !== 'goalie')

  return [
    goalies[0] ?? null,
    ...Array.from({ length: TEAM_BOARD_SLOTS - 1 }, (_, i) => field[i] ?? null),
  ]
}

function formatBoardSlotName(member: LineupMember | null): string {
  if (!member) return '—'
  let line = member.name
  if (member.position === 'goalie') line += ' (вр.)'
  return line
}

function formatBoardSlotLine(member: LineupMember | null, index: number): string {
  const prefix = index === 0 ? 'Вр.' : `${index}.`
  return `${prefix} ${formatBoardSlotName(member)}`
}

/** Можно ли назначить игрока в команду (лимит как на доске: 10 полевых + 1 вратарь). */
export function validateMatchTeamAssign(
  member: LineupMember,
  team: MatchTeam,
  members: LineupMember[],
  teams: Record<number, MatchTeam>,
): MatchTeamAssignResult {
  const onTeam = members.filter(
    (m) => teams[m.user_id] === team && m.user_id !== member.user_id,
  )
  const label = matchTeamLabel(team)

  if (member.position === 'goalie') {
    const goalies = onTeam.filter((m) => m.position === 'goalie').length
    if (goalies >= MATCH_TEAM_MAX_GOALIES) {
      return {
        ok: false,
        message: `В команде «${label}» уже есть вратарь. Добавьте игрока в другую команду.`,
      }
    }
  } else {
    const field = onTeam.filter((m) => m.position !== 'goalie').length
    if (field >= MATCH_TEAM_MAX_FIELD) {
      return {
        ok: false,
        message: `В команде «${label}» уже 10 человек. Добавьте игрока в другую команду.`,
      }
    }
  }

  return { ok: true }
}

/** Один блок команды для копирования в мессенджер (сверху вниз). */
function formatTeamCopySection(team: MatchTeam, members: LineupMember[]): string {
  const slots = buildTeamBoardSlots(members)
  return [matchTeamLabel(team), ...slots.map((m, i) => formatBoardSlotLine(m, i))].join('\n')
}

/** Текст для буфера: белые, затем чёрные — без колонок (удобно на узком экране). */
export function formatMatchTeamsCopyText(
  whiteMembers: LineupMember[],
  blackMembers: LineupMember[]
): string {
  return [formatTeamCopySection('white', whiteMembers), formatTeamCopySection('black', blackMembers)].join(
    '\n\n',
  )
}
