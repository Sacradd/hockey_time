/** 2026-05-27 → 27.05.2026 */
export function formatGroupDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d}.${m}.${y}`
}

export function groupLabel(groupDate: string, title: string | null): string {
  const date = formatGroupDate(groupDate)
  return title ? `${date} · ${title}` : date
}
