/** Следующая дата для weekday (0=Вс … 6=Сб) в локальной зоне, YYYY-MM-DD */
export function nextWeekdayDate(weekday: number): string {
  const d = new Date()
  const today = d.getDay()
  let add = (weekday - today + 7) % 7
  if (add === 0) {
    add = 7
  }
  d.setDate(d.getDate() + add)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
