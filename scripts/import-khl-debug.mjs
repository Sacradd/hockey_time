/**
 * Импорт вручную подписанных превью из public/teams/_debug/*.jpg → public/teams/{slug}.png
 * Запуск: node scripts/import-khl-debug.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const debugDir = path.join(root, 'public', 'teams', '_debug')
const outDir = path.join(root, 'public', 'teams')

/** Имя файла в _debug (без расширения) → slug в приложении */
const NAME_TO_SLUG = {
  amur: 'amur',
  avangard: 'avangard',
  admiral: 'admiral',
  akbars: 'akbars',
  avtomobilist: 'avtomobilist',
  baris: 'barys',
  barys: 'barys',
  vityaz: 'vityaz',
  dinamo_minsk: 'dynamo-mn',
  'dinamo-mn': 'dynamo-mn',
  'dynamo-mn': 'dynamo-mn',
  dynamo_m: 'dynamo-m',
  'dynamo-m': 'dynamo-m',
  kunlun: 'kunlun',
  lokomotiv: 'lokomotiv',
  metalurg: 'metallurg',
  metallurg: 'metallurg',
  neftehimik: 'neftekhimik',
  neftekhimik: 'neftekhimik',
  salavat: 'salavat',
  severstal: 'severstal',
  sibir: 'sibir',
  ska: 'ska',
  sochi: 'sochi',
  spartak: 'spartak',
  torpedo: 'torpedo',
  tracktor: 'traktor',
  traktor: 'traktor',
  cska: 'cska',
  csck: 'cska',
}

async function main() {
  if (!fs.existsSync(debugDir)) {
    console.error('Нет папки public/teams/_debug')
    process.exit(1)
  }

  const files = fs
    .readdirSync(debugDir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .filter((f) => !/^\d+_/i.test(f) && f.toLowerCase() !== 'readme.txt')
  if (files.length === 0) {
    console.error('В _debug нет картинок (только имена команд: amur.jpg, cska.jpg, …)')
    process.exit(1)
  }

  for (const file of files) {
    const base = path.basename(file, path.extname(file)).toLowerCase()
    const slug = NAME_TO_SLUG[base]
    if (!slug) {
      console.warn(`Пропуск (неизвестное имя): ${file}`)
      continue
    }

    const src = path.join(debugDir, file)
    const dest = path.join(outDir, `${slug}.png`)

    await sharp(src)
      .trim({ threshold: 15 })
      .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(dest)

    console.log(`OK ${file} → ${slug}.png`)
  }

  console.log('\nГотово. Обновите страницу в браузере (Ctrl+Shift+R).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
