<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/db.php';
require dirname(__DIR__) . '/lib/push.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

$user = api_require_user();
$userId = (int) ($user['id'] ?? 0);

try {
    $pdo = api_db();
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM push_subscriptions WHERE user_id = ?');
    $stmt->execute([$userId]);
    $count = (int) $stmt->fetchColumn();

    api_json_response([
        'ok' => true,
        'subscribed' => $count > 0,
        'count' => $count,
        'push_enabled' => push_is_enabled(),
    ]);
} catch (PDOException $e) {
    $code = (string) $e->getCode();
    $msg = strtolower($e->getMessage());
    if ($code === '42S02' || str_contains($msg, 'push_subscriptions')) {
        api_json_response([
            'ok' => true,
            'subscribed' => false,
            'count' => 0,
            'push_enabled' => false,
            'table_missing' => true,
        ]);
    }
    api_handle_exception($e);
} catch (Throwable $e) {
    api_handle_exception($e);
}
