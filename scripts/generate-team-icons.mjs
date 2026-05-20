import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const teams = [
  ['amur', 'АМР', '#E03C31'],
  ['avangard', 'АВГ', '#D2001F'],
  ['admiral', 'АДМ', '#003087'],
  ['akbars', 'АКБ', '#006633'],
  ['avtomobilist', 'АВТ', '#0054A4'],
  ['barys', 'БАР', '#0072CE'],
  ['vityaz', 'ВИТ', '#8B0000'],
  ['dynamo-mn', 'ДМН', '#0039A6'],
  ['dynamo-m', 'ДМ', '#1E4D8C'],
  ['kunlun', 'КЛ', '#C8102E'],
  ['lokomotiv', 'ЛОК', '#006341'],
  ['metallurg', 'МЕТ', '#B8860B'],
  ['neftekhimik', 'НХК', '#005EB8'],
  ['salavat', 'СЮ', '#00573F'],
  ['severstal', 'СЕВ', '#004B87'],
  ['sibir', 'СИБ', '#00A651'],
  ['ska', 'СКА', '#003087'],
  ['sochi', 'СОЧ', '#E03C31'],
  ['spartak', 'СПР', '#D2001F'],
  ['torpedo', 'ТОР', '#1E1E1E'],
  ['traktor', 'ТРК', '#F58426'],
  ['cska', 'ЦСК', '#D2001F'],
]

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'teams')
fs.mkdirSync(dir, { recursive: true })

for (const [slug, abbr, color] of teams) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${slug}">
  <circle cx="32" cy="32" r="32" fill="${color}"/>
  <text x="32" y="38" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="system-ui,sans-serif">${abbr}</text>
</svg>`
  fs.writeFileSync(path.join(dir, `${slug}.svg`), svg)
}

console.log(`Wrote ${teams.length} icons to public/teams/`)
