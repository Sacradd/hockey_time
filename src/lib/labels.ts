export function positionLabel(position: 'player' | 'goalie'): string {
  return position === 'goalie' ? 'вратарь' : 'полевой'
}

export function weekdayLabel(weekday: number | null): string {
  if (weekday === null) return ''
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  return days[weekday] ?? ''
}
