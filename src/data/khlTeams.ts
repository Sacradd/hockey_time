export interface KhlTeam {
  slug: string
  name: string
  abbr: string
  color: string
}

/** Команды КХЛ (slug = имя файла в public/teams/) */
export const KHL_TEAMS: KhlTeam[] = [
  { slug: 'amur', name: 'Амур', abbr: 'АМР', color: '#E03C31' },
  { slug: 'avangard', name: 'Авангард', abbr: 'АВГ', color: '#D2001F' },
  { slug: 'admiral', name: 'Адмирал', abbr: 'АДМ', color: '#003087' },
  { slug: 'akbars', name: 'Ак Барс', abbr: 'АКБ', color: '#006633' },
  { slug: 'avtomobilist', name: 'Автомобилист', abbr: 'АВТ', color: '#0054A4' },
  { slug: 'barys', name: 'Барыс', abbr: 'БАР', color: '#0072CE' },
  { slug: 'vityaz', name: 'Витязь', abbr: 'ВИТ', color: '#8B0000' },
  { slug: 'dynamo-mn', name: 'Динамо Мн', abbr: 'ДМН', color: '#0039A6' },
  { slug: 'dynamo-m', name: 'Динамо Москва', abbr: 'ДМ', color: '#1E4D8C' },
  { slug: 'kunlun', name: 'Куньлунь', abbr: 'КЛ', color: '#C8102E' },
  { slug: 'lokomotiv', name: 'Локомотив', abbr: 'ЛОК', color: '#006341' },
  { slug: 'metallurg', name: 'Металлург', abbr: 'МЕТ', color: '#B8860B' },
  { slug: 'neftekhimik', name: 'Нефтехимик', abbr: 'НХК', color: '#005EB8' },
  { slug: 'salavat', name: 'Салават Юлаев', abbr: 'СЮ', color: '#00573F' },
  { slug: 'severstal', name: 'Северсталь', abbr: 'СЕВ', color: '#004B87' },
  { slug: 'sibir', name: 'Сибирь', abbr: 'СИБ', color: '#00A651' },
  { slug: 'ska', name: 'СКА', abbr: 'СКА', color: '#003087' },
  { slug: 'sochi', name: 'ХК Сочи', abbr: 'СОЧ', color: '#E03C31' },
  { slug: 'spartak', name: 'Спартак', abbr: 'СПР', color: '#D2001F' },
  { slug: 'torpedo', name: 'Торпедо', abbr: 'ТОР', color: '#1E1E1E' },
  { slug: 'traktor', name: 'Трактор', abbr: 'ТРК', color: '#F58426' },
  { slug: 'cska', name: 'ЦСКА', abbr: 'ЦСК', color: '#D2001F' },
]

export const KHL_TEAM_SLUGS = KHL_TEAMS.map((t) => t.slug)

export function getKhlTeam(slug: string | null | undefined): KhlTeam | null {
  if (!slug) return null
  return KHL_TEAMS.find((t) => t.slug === slug) ?? null
}

export function teamIconUrl(slug: string): string {
  return `/teams/${slug}.png`
}
