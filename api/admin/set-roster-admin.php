<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Метод POST'], 405);
}

try {
    $body = api_read_json_body();
    $rosterId = (int) ($body['roster_id'] ?? 0);
    $userId = (int) ($body['user_id'] ?? 0);
    $isAdmin = api_body_bool($body, 'is_admin');

    if ($rosterId < 1 || $userId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите roster_id и user_id'], 400);
    }

    api_require_super();

    $pdo = api_db();

    if (!db_roster_has_member($pdo, $rosterId, $userId)) {
        api_json_response(['ok' => false, 'error' => 'Пользователь не в этой группе'], 404);
    }

    $roleStmt = $pdo->prepare('SELECT role, display_login, phone FROM users WHERE id = ? LIMIT 1');
    $roleStmt->execute([$userId]);
    $target = $roleStmt->fetch();
    if (!$target) {
        api_json_response(['ok' => false, 'error' => 'Пользователь не найден'], 404);
    }
    if (($target['role'] ?? '') === 'super') {
        api_json_response(['ok' => false, 'error' => 'Нельзя менять роль владельца'], 400);
    }

    db_set_roster_admin($pdo, $rosterId, $userId, $isAdmin);

    api_json_response([
        'ok' => true,
        'user_id' => $userId,
        'name' => $target['display_login']
            ?: api_format_phone_display((string) $target['phone']),
        'is_admin' => $isAdmin,
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
