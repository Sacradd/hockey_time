/**
 * Иконки:
 * - public/icons/ios/icon.jpeg  → иконка iPhone / PWA (главный исходник)
 * - public/emblem.jpeg          → только экран входа (масштаб в CSS), не для iOS
 *
 * npm run icons
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const iconsDir = path.join(root, 'public', 'icons')
const iosDir = path.join(iconsDir, 'ios')

/** Куда класть новую icon.jpeg для телефона */
const PHONE_ICON_SOURCES = [
  path.join(iosDir, 'icon.jpeg'),
  path.join(root, 'public', 'icon.jpeg'),
]

const BG = { r: 30, g: 30, b: 30, alpha: 1 }

/** Масштаб эмблемы внутри круга (1 = без увеличения; больше — крупнее картинка) */
const ICON_ZOOM = 1.32

const IOS_SIZES = [180, 167, 152, 120]

fs.mkdirSync(iosDir, { recursive: true })

function resolvePhoneIconSrc() {
  for (const p of PHONE_ICON_SOURCES) {
    if (fs.existsSync(p)) {
      console.log('Исходник (телефон):', path.relative(root, p))
      return p
    }
  }
  throw new Error(
    'Положите icon.jpeg в public/icons/ios/icon.jpeg (квадрат, например 1024×1024)',
  )
}

/** Квадратная иконка: кроп центра с увеличением (ICON_ZOOM), размер файла — size×size */
async function renderIosIcon(size, outPath) {
  const src = resolvePhoneIconSrc()
  const meta = await sharp(src).metadata()

  let side = Math.min(meta.width ?? size, meta.height ?? size)
  let left = 0
  let top = 0
  if (meta.width !== meta.height) {
    left = Math.round((meta.width - side) / 2)
    top = Math.round((meta.height - side) / 2)
  }

  const cropSide = Math.max(1, Math.round(side / ICON_ZOOM))
  const cropLeft = left + Math.round((side - cropSide) / 2)
  const cropTop = top + Math.round((side - cropSide) / 2)

  await sharp(src)
    .extract({ left: cropLeft, top: cropTop, width: cropSide, height: cropSide })
    .flatten({ background: BG })
    .resize(size, size, { fit: 'fill' })
    .png()
    .toFile(outPath)

  console.log('OK', path.relative(root, outPath))
}

// iOS — из public/icons/ios/icon.jpeg (экран входа: emblem.jpeg + scale в Emblem.css)
for (const size of IOS_SIZES) {
  await renderIosIcon(size, path.join(iosDir, `icon-${size}.png`))
}

await fs.promises.copyFile(
  path.join(iosDir, 'icon-180.png'),
  path.join(root, 'public', 'apple-touch-icon.png'),
)

await renderIosIcon(192, path.join(iconsDir, 'icon-192.png'))
await renderIosIcon(512, path.join(iconsDir, 'icon-512.png'))

console.log('\nГотово. iOS:', IOS_SIZES.map((s) => s + 'px').join(', '))
