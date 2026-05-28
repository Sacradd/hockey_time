/**
 * После npm run build — проверить, что index.html ссылается на существующие assets.
 * node scripts/verify-dist.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const indexPath = path.join(dist, 'index.html')

if (!fs.existsSync(indexPath)) {
  console.error('Нет dist/index.html — сначала: npm.cmd run build')
  process.exit(1)
}

const html = fs.readFileSync(indexPath, 'utf8')
const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])

let ok = true
for (const ref of refs) {
  const file = path.join(dist, ref.replace(/^\//, '').replace(/\//g, path.sep))
  if (!fs.existsSync(file)) {
    console.error('ОШИБКА: в index.html есть', ref, '— файла нет в dist/')
    ok = false
  } else {
    console.log('OK', ref)
  }
}

const required = ['sw.js', 'registerSW.js', 'manifest.webmanifest']
for (const name of required) {
  const p = path.join(dist, name)
  if (!fs.existsSync(p)) {
    console.error('ОШИБКА: нет dist/' + name)
    ok = false
  }
}

if (ok) {
  console.log('\nСборка целая. Заливайте ВСЁ содержимое dist/ в корень сайта одной выкладкой.')
} else {
  process.exit(1)
}
