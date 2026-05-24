<?php

declare(strict_types=1);

/** @return array{public_key: string, private_key: string, subject: string}|null */
function push_vapid_config(): ?array
{
    $vapid = api_config()['vapid'] ?? null;
    if (!is_array($vapid)) {
        return null;
    }

    $public = trim((string) ($vapid['public_key'] ?? $vapid['public'] ?? ''));
    $private = trim((string) ($vapid['private_key'] ?? $vapid['private'] ?? ''));
    $subject = trim((string) ($vapid['subject'] ?? 'mailto:admin@localhost'));

    if ($public === '' || $private === '') {
        return null;
    }

    return [
        'public_key' => $public,
        'private_key' => $private,
        'subject' => $subject,
    ];
}

function push_is_enabled(): bool
{
    return push_vapid_config() !== null
        && function_exists('curl_init');
}

/**
 * @param list<int> $userIds
 * @return array{targets: int, sent_users: int, sent_subscriptions: int, push_enabled: bool}
 */
function push_send_payment_reminders(
    PDO $pdo,
    array $userIds,
    string $title,
    string $body,
    string $url = '/'
): array {
    $userIds = array_values(array_unique(array_filter(array_map('intval', $userIds), static fn (int $id): bool => $id > 0)));
    $targets = count($userIds);

    if ($targets === 0) {
        return [
            'targets' => 0,
            'sent_users' => 0,
            'sent_subscriptions' => 0,
            'push_enabled' => push_is_enabled(),
        ];
    }

    if (!push_is_enabled()) {
        return [
            'targets' => $targets,
            'sent_users' => 0,
            'sent_subscriptions' => 0,
            'push_enabled' => false,
        ];
    }

    $placeholders = implode(',', array_fill(0, $targets, '?'));
    $stmt = $pdo->prepare(
        "SELECT user_id, endpoint, p256dh, auth
         FROM push_subscriptions
         WHERE user_id IN ({$placeholders})"
    );
    $stmt->execute($userIds);

    $sentUsers = [];
    $sentSubs = 0;
    $payload = json_encode(
        [
            'title' => $title,
            'body' => $body,
            'url' => $url,
        ],
        JSON_UNESCAPED_UNICODE
    );

    while ($row = $stmt->fetch()) {
        if (!push_deliver_subscription($row, (string) $payload)) {
            continue;
        }
        $sentSubs++;
        $sentUsers[(int) $row['user_id']] = true;
    }

    return [
        'targets' => $targets,
        'sent_users' => count($sentUsers),
        'sent_subscriptions' => $sentSubs,
        'push_enabled' => true,
    ];
}

/**
 * @param array<string, mixed> $game
 * @return array{
 *   targets: int,
 *   sent_users: int,
 *   sent_subscriptions: int,
 *   push_enabled: bool,
 *   payable_count: int,
 *   unpaid_count: int
 * }
 */
function push_notify_game_payment(PDO $pdo, int $gameId, array $game, array $viewer): array
{
    $rosterId = (int) $game['roster_id'];
    $stats = db_field_lineup_payment_stats($pdo, $gameId, $rosterId, $game, $viewer);
    $userIds = $stats['unpaid_user_ids'];

    if ($stats['unpaid_count'] === 0) {
        return [
            'targets' => 0,
            'sent_users' => 0,
            'sent_subscriptions' => 0,
            'push_enabled' => push_is_enabled(),
            'payable_count' => $stats['payable_count'],
            'unpaid_count' => 0,
        ];
    }

    $gameLabel = trim((string) ($game['title'] ?? ''));
    if ($gameLabel === '') {
        $gameLabel = (string) ($game['group_date'] ?? 'игра');
    }

    $result = push_send_payment_reminders(
        $pdo,
        $userIds,
        'Требование об оплате',
        'Подтвердите оплату: ' . $gameLabel,
        '/games/' . $gameId
    );

    $result['payable_count'] = $stats['payable_count'];
    $result['unpaid_count'] = $stats['unpaid_count'];

    return $result;
}

/**
 * Web Push (aes128gcm). Возвращает false, если доставка не удалась.
 *
 * @param array<string, mixed> $sub
 */
function push_deliver_subscription(array $sub, string $payload): bool
{
    $vapid = push_vapid_config();
    if ($vapid === null) {
        return false;
    }

    $endpoint = (string) ($sub['endpoint'] ?? '');
    $p256dh = (string) ($sub['p256dh'] ?? '');
    $auth = (string) ($sub['auth'] ?? '');
    if ($endpoint === '' || $p256dh === '' || $auth === '') {
        return false;
    }

    if (!function_exists('sodium_crypto_box_keypair')) {
        error_log('push: нужен ext-sodium для Web Push');

        return false;
    }

    try {
        $encrypted = push_encrypt_payload_aes128gcm($payload, $p256dh, $auth);
        $jwt = push_create_vapid_jwt($endpoint, $vapid);
        if ($jwt === null) {
            return false;
        }
    } catch (Throwable $e) {
        error_log('push: ' . $e->getMessage());

        return false;
    }

    $headers = [
        'Content-Type: application/octet-stream',
        'Content-Encoding: aes128gcm',
        'Content-Length: ' . strlen($encrypted),
        'TTL: 86400',
        'Authorization: vapid t=' . $jwt . ', k=' . $vapid['public_key'],
    ];

    $ch = curl_init($endpoint);
    if ($ch === false) {
        return false;
    }

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $encrypted,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);

    curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code === 404 || $code === 410) {
        push_delete_subscription_by_endpoint($sub);
    }

    return $code >= 200 && $code < 300;
}

/** @param array<string, mixed> $sub */
function push_delete_subscription_by_endpoint(array $sub): void
{
    try {
        $pdo = api_db();
        $pdo->prepare('DELETE FROM push_subscriptions WHERE endpoint = ? LIMIT 1')
            ->execute([(string) ($sub['endpoint'] ?? '')]);
    } catch (Throwable) {
        // ignore
    }
}

/**
 * @param array{public_key: string, private_key: string, subject: string} $vapid
 */
function push_create_vapid_jwt(string $endpoint, array $vapid): ?string
{
    $url = parse_url($endpoint);
    if (!is_array($url) || empty($url['scheme']) || empty($url['host'])) {
        return null;
    }

    $audience = $url['scheme'] . '://' . $url['host'];
    $header = push_base64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256'], JSON_THROW_ON_ERROR));
    $claims = push_base64url(json_encode([
        'aud' => $audience,
        'exp' => time() + 12 * 3600,
        'sub' => $vapid['subject'],
    ], JSON_THROW_ON_ERROR));

    $data = $header . '.' . $claims;
    $privateKey = push_load_private_key($vapid['private_key']);
    if ($privateKey === false) {
        return null;
    }

    $signature = '';
    if (!openssl_sign($data, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
        return null;
    }

    $raw = push_ecdsa_der_to_raw($signature);
    if ($raw === null) {
        return null;
    }

    return $data . '.' . push_base64url($raw);
}

function push_load_private_key(string $key): mixed
{
    $key = trim($key);
    if (str_contains($key, 'BEGIN')) {
        return openssl_pkey_get_private($key);
    }

    $bin = push_base64url_decode($key);
    if ($bin === false) {
        return false;
    }

    $pem = "-----BEGIN EC PRIVATE KEY-----\n"
        . chunk_split(base64_encode($bin), 64, "\n")
        . "-----END EC PRIVATE KEY-----\n";

    return openssl_pkey_get_private($pem);
}

function push_ecdsa_der_to_raw(string $der): ?string
{
    $offset = 0;
    if (!isset($der[$offset]) || ord($der[$offset]) !== 0x30) {
        return null;
    }
    $offset += 2;
    if (!isset($der[$offset]) || ord($der[$offset]) !== 0x02) {
        return null;
    }
    $rLen = ord($der[$offset + 1]);
    $r = substr($der, $offset + 2, $rLen);
    $offset += 2 + $rLen;
    if (!isset($der[$offset]) || ord($der[$offset]) !== 0x02) {
        return null;
    }
    $sLen = ord($der[$offset + 1]);
    $s = substr($der, $offset + 2, $sLen);

    return str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT)
        . str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
}

function push_encrypt_payload_aes128gcm(string $payload, string $p256dh, string $auth): string
{
    $userPublic = push_base64url_decode($p256dh);
    $userAuth = push_base64url_decode($auth);
    if ($userPublic === false || $userAuth === false || strlen($userAuth) !== 16) {
        throw new RuntimeException('Invalid subscription keys');
    }

    $local = openssl_pkey_new([
        'curve_name' => 'prime256v1',
        'private_key_type' => OPENSSL_KEYTYPE_EC,
    ]);
    if ($local === false) {
        throw new RuntimeException('Cannot create local EC key');
    }

    $localPubDer = openssl_pkey_get_details($local)['ec']['pub_key'] ?? '';
    if ($localPubDer === '') {
        throw new RuntimeException('Cannot read local public key');
    }

    $peer = openssl_pkey_get_public(
        "-----BEGIN PUBLIC KEY-----\n"
        . chunk_split(base64_encode(push_uncompressed_public_key($userPublic)), 64, "\n")
        . "-----END PUBLIC KEY-----\n"
    );
    if ($peer === false) {
        throw new RuntimeException('Invalid user public key');
    }

    $shared = openssl_pkey_derive($peer, $local);
    if ($shared === false) {
        throw new RuntimeException('ECDH failed');
    }

    $salt = random_bytes(16);
    $prk = hash_hmac('sha256', $shared, $salt, true);
    $cek = push_hkdf($userAuth, $prk, "Content-Encoding: aes128gcm\x00", 16);
    $nonce = push_hkdf($userAuth, $prk, "Content-Encoding: nonce\x00", 12);

    $padLen = 0;
    $plain = str_repeat("\x00", $padLen) . pack('n', $padLen) . $payload;
    $tag = '';
    $cipher = openssl_encrypt($plain, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '');
    if ($cipher === false) {
        throw new RuntimeException('Encrypt failed');
    }

    $record = $salt
        . pack('N', 4096)
        . chr(strlen($localPubDer))
        . $localPubDer
        . $cipher
        . $tag;

    return $record;
}

function push_uncompressed_public_key(string $raw): string
{
    if (strlen($raw) === 65 && $raw[0] === "\x04") {
        return $raw;
    }
    if (strlen($raw) === 64) {
        return "\x04" . $raw;
    }

    throw new RuntimeException('Unexpected P-256 public key length');
}

function push_hkdf(string $salt, string $ikm, string $info, int $length): string
{
    $prk = hash_hmac('sha256', $ikm, $salt, true);
    $t = '';
    $okm = '';
    for ($i = 1; strlen($okm) < $length; $i++) {
        $t = hash_hmac('sha256', $t . $info . chr($i), $prk, true);
        $okm .= $t;
    }

    return substr($okm, 0, $length);
}

function push_base64url(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function push_base64url_decode(string $data): string|false
{
    $pad = 4 - (strlen($data) % 4);
    if ($pad < 4) {
        $data .= str_repeat('=', $pad);
    }

    return base64_decode(strtr($data, '-_', '+/'), true);
}
