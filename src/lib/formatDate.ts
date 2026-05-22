import { weekdayFullLabel } from '@/lib/weekdays'

/** 2026-05-27 → 27.05.2026 */
export function formatGroupDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d}.${m}.${y}`
}

export function formatGameTime(time: string | null | undefined): string | null {
  if (!time) return null
  const part = time.trim().slice(0, 5)
  return /^\d{2}:\d{2}$/.test(part) ? part : null
}

export function groupLabel(
  groupDate: string,
  title: string | null,
  opts?: { gameTime?: string | null; weekday?: number | null }
): string {
  const chunks: string[] = []
  if (opts?.weekday != null) {
    const name = weekdayFullLabel(opts.weekday)
    if (name) chunks.push(name)
  }
  chunks.push(formatGroupDate(groupDate))
  const time = formatGameTime(opts?.gameTime ?? null)
  if (time) chunks.push(time)
  const head = chunks.join(', ')
  return title ? `${head} · ${title}` : head
}
