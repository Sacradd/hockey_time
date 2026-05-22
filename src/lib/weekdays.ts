/** 0 = воскресенье … 6 = суббота (как в rosters.weekday) */
export const GAME_WEEKDAY_OPTIONS = [
  { value: 0, label: 'Воскресенье' },
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
] as const

export function weekdayFullLabel(n: number): string {
  return GAME_WEEKDAY_OPTIONS.find((w) => w.value === n)?.label ?? ''
}

/** ISO YYYY-MM-DD → 0–6 */
export function weekdayFromIsoDate(iso: string): number {
  return new Date(`${iso}T12:00:00`).getDay()
}
