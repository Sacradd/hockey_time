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

    if ($rosterId < 1 || $userId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите roster_id и user_id'], 400);
    }

    api_require_roster_admin($rosterId);

    $pdo = api_db();
    if (!db_roster_has_member($pdo, $rosterId, $userId)) {
        api_json_response(['ok' => false, 'error' => 'Игрок не в этой группе'], 404);
    }

    $u = $pdo->prepare('SELECT display_login, phone FROM users WHERE id = ? LIMIT 1');
    $u->execute([$userId]);
    $row = $u->fetch();
    $name = $row
        ? ($row['display_login'] ?: api_format_phone_display((string) $row['phone']))
        : '';

    $pdo->prepare('DELETE FROM roster_members WHERE roster_id = ? AND user_id = ?')
        ->execute([$rosterId, $userId]);

    api_json_response([
        'ok' => true,
        'removed' => true,
        'name' => $name,
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
