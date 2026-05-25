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
  if (member.is_guest) line += ' (гость)'
  return line
}

function formatBoardSlotLine(member: LineupMember | null, index: number): string {
  const prefix = index === 0 ? 'Вр.' : `${index}.`
  return `${prefix} ${formatBoardSlotName(member)}`
}

/** Текст живого блока: две колонки (белые | чёрные), как на экране. */
export function formatMatchTeamsCopyText(
  whiteMembers: LineupMember[],
  blackMembers: LineupMember[]
): string {
  const whiteLabel = matchTeamLabel('white')
  const blackLabel = matchTeamLabel('black')
  const whiteSlots = buildTeamBoardSlots(whiteMembers)
  const blackSlots = buildTeamBoardSlots(blackMembers)
  const colGap = '   │   '

  const leftLines = [whiteLabel, ...whiteSlots.map((m, i) => formatBoardSlotLine(m, i))]
  const rightLines = [blackLabel, ...blackSlots.map((m, i) => formatBoardSlotLine(m, i))]
  const leftWidth = Math.max(...leftLines.map((line) => line.length))

  const pad = (text: string) =>
    text.length >= leftWidth ? text : text + ' '.repeat(leftWidth - text.length)

  return leftLines
    .map((left, row) => `${pad(left)}${colGap}${rightLines[row] ?? ''}`)
    .join('\n')
}
