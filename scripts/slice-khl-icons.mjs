/**
 * Черновая авто-вырезка из public/khl_icon.jpg (часто путает порядок!).
 * Результат: public/teams/_slice_preview/ — НЕ трогает ваши файлы в _debug/.
 * Для приложения используйте только: npm run teams:import
 *
 * Запуск: node scripts/slice-khl-icons.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcPath = path.join(root, 'public', 'khl_icon.jpg')
const outDir = path.join(root, 'public', 'teams', '_slice_preview')

/** Порядок логотипов на вашем коллаже (23 шт., пропускаем слоты khl и lada) */
const SHEET_ORDER = [
  'kunlun',
  'akbars',
  'lokomotiv',
  '_khl', // пропуск
  'amur',
  'ska',
  'cska',
  'avtomobilist',
  'spartak',
  'metallurg',
  'barys',
  'traktor',
  'dynamo-mn',
  'neftekhimik',
  'admiral',
  'torpedo',
  'vityaz',
  'severstal',
  'avangard',
  'sibir',
  'salavat',
  '_lada', // нет в приложении
  'dynamo-m',
]

const WHITE = 248

function isContent(r, g, b) {
  return r < WHITE || g < WHITE || b < WHITE
}

/** Связные области → bbox {x0,y0,x1,y1,area} */
function findRegions(data, width, height) {
  const visited = new Uint8Array(width * height)
  const regions = []

  const idx = (x, y) => y * width + x

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y) * 3
      if (visited[idx(x, y)]) continue
      if (!isContent(data[i], data[i + 1], data[i + 2])) continue

      let minX = x
      let maxX = x
      let minY = y
      let maxY = y
      let area = 0
      const stack = [[x, y]]

      while (stack.length) {
        const [cx, cy] = stack.pop()
        if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue
        const p = idx(cx, cy)
        if (visited[p]) continue
        const pi = p * 3
        if (!isContent(data[pi], data[pi + 1], data[pi + 2])) continue
        visited[p] = 1
        area++
        if (cx < minX) minX = cx
        if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy
        if (cy > maxY) maxY = cy
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
      }

      const w = maxX - minX + 1
      const h = maxY - minY + 1
      if (area < 800 || w < 40 || h < 40) continue
      if (w > width * 0.45 || h > height * 0.35) continue
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      if (cx > width * 0.72 && cy < height * 0.12) continue
      regions.push({ x0: minX, y0: minY, x1: maxX, y1: maxY, area, cx, cy })
    }
  }

  return regions
}

function sortReadingOrder(a, b) {
  const rowA = Math.floor(a.cy / 120)
  const rowB = Math.floor(b.cy / 120)
  if (rowA !== rowB) return rowA - rowB
  return a.cx - b.cx
}

async function main() {
  if (!fs.existsSync(srcPath)) {
    console.error('Нет файла public/khl_icon.jpg')
    process.exit(1)
  }

  const { data, info } = await sharp(srcPath).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info

  let regions = findRegions(data, width, height)
  regions.sort(sortReadingOrder)

  const needed = SHEET_ORDER.filter((s) => !s.startsWith('_')).length
  console.log(`Найдено областей: ${regions.length}, нужно команд: ${needed}`)

  if (regions.length < needed) {
    console.warn('Мало областей — проверьте порядок вручную в scripts/khl-icon-map.json')
  }

  const mapPath = path.join(root, 'scripts', 'khl-icon-map.json')
  let manualMap = null
  if (fs.existsSync(mapPath)) {
    manualMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    console.log('Используется ручная карта:', mapPath)
  }

  fs.mkdirSync(outDir, { recursive: true })
  console.warn('\n⚠ teams:slice пишет только в public/teams/_slice_preview/')
  console.warn('   Иконки в приложении — из public/teams/_debug/*.jpg → npm run teams:import\n')

  const slugs = SHEET_ORDER.filter((s) => !s.startsWith('_'))
  let slugIdx = 0

  for (let i = 0; i < regions.length && slugIdx < slugs.length; i++) {
    const r = regions[i]
    const pad = 8
    const left = Math.max(0, r.x0 - pad)
    const top = Math.max(0, r.y0 - pad)
    const w = Math.min(width - left, r.x1 - r.x0 + 1 + pad * 2)
    const h = Math.min(height - top, r.y1 - r.y0 + 1 + pad * 2)

    const slug = manualMap?.[String(i)] ?? slugs[slugIdx]
    if (!slug || slug.startsWith('_')) continue

    const outPath = path.join(outDir, `${slug}.png`)
    await sharp(srcPath)
      .extract({ left, top, width: w, height: h })
      .trim({ threshold: 12 })
      .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath)

    console.log(`OK ${slug}.png ← область #${i}`)
    slugIdx++
  }

  console.log('\nГотово. Сверьте public/teams/_slice_preview/ — в приложение только через _debug + teams:import.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
