/**
 * VAPID-ключи без npm-пакетов (только Node crypto).
 * Запуск: node scripts/generate-vapid.mjs
 */
import crypto from 'node:crypto'

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const ecdh = crypto.createECDH('prime256v1')
ecdh.generateKeys()

const publicKey = base64url(ecdh.getPublicKey())
const privateKey = base64url(ecdh.getPrivateKey())

console.log('')
console.log('Скопируйте в api/config.local.php → vapid:')
console.log('')
console.log("'vapid' => [")
console.log(`    'public_key' => '${publicKey}',`)
console.log(`    'private_key' => '${privateKey}',`)
console.log("    'subject' => 'mailto:ваш@email.ru',  // или https://hockey-all.ru")
console.log('],')
console.log('')
