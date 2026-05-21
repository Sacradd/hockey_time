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
    $userId = (int) ($body['user_id'] ?? 0);

    if ($userId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите user_id'], 400);
    }

    $viewer = api_require_super();
    if ((int) $viewer['id'] === $userId) {
        api_json_response(['ok' => false, 'error' => 'Нельзя удалить свой аккаунт'], 400);
    }

    $pdo = api_db();
    $stmt = $pdo->prepare('SELECT id, role, display_login, phone FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
        api_json_response(['ok' => false, 'error' => 'Пользователь не найден'], 404);
    }
    if (($row['role'] ?? '') === 'super') {
        api_json_response(['ok' => false, 'error' => 'Нельзя удалить super'], 400);
    }

    $name = $row['display_login'] ?: api_format_phone_display((string) $row['phone']);
    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);

    api_json_response([
        'ok' => true,
        'deleted' => true,
        'name' => $name,
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
