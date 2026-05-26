<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Метод POST'], 405);
}

$user = api_require_user();
$userId = (int) ($user['id'] ?? 0);

try {
    $body = api_read_json_body();
    $endpoint = trim((string) ($body['endpoint'] ?? ''));
    $p256dh = trim((string) ($body['p256dh'] ?? ''));
    $auth = trim((string) ($body['auth'] ?? ''));

    if ($endpoint === '' || $p256dh === '' || $auth === '') {
        api_json_response(['ok' => false, 'error' => 'Некорректная подписка'], 400);
    }

    $pdo = api_db();
    $stmt = $pdo->prepare(
        'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           user_id = VALUES(user_id),
           p256dh = VALUES(p256dh),
           auth = VALUES(auth)'
    );
    $stmt->execute([$userId, $endpoint, $p256dh, $auth]);

    api_json_response(['ok' => true]);
} catch (Throwable $e) {
    api_handle_exception($e);
}

