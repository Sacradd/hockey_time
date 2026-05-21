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
    $password = trim((string) ($body['password'] ?? ''));

    if ($userId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите user_id'], 400);
    }

    if ($password === '') {
        $password = api_generate_temp_password();
    }
    if (mb_strlen($password) < 4) {
        api_json_response(['ok' => false, 'error' => 'Пароль: минимум 4 символа'], 400);
    }

    $viewer = api_require_super();
    if ((int) $viewer['id'] === $userId) {
        api_json_response(['ok' => false, 'error' => 'Нельзя сбросить свой пароль здесь'], 400);
    }

    $pdo = api_db();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
        api_json_response(['ok' => false, 'error' => 'Пользователь не найден'], 404);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $hasNick = isset($row['display_login']) && $row['display_login'] !== null && $row['display_login'] !== '';
    $isActive = $hasNick ? (bool) ($row['is_active'] ?? false) : false;

    $upd = $pdo->prepare(
        'UPDATE users SET password_hash = ?, must_change_password = 1, is_active = ? WHERE id = ?'
    );
    $upd->execute([$hash, $isActive ? 1 : 0, $userId]);

    $phoneDisplay = api_format_phone_display((string) $row['phone']);

    api_json_response([
        'ok' => true,
        'user_id' => $userId,
        'name' => $row['display_login'] ?: $phoneDisplay,
        'display_login' => $row['display_login'] ?: null,
        'phone_display' => $phoneDisplay,
        'temporary_password' => $password,
        'login_hint' => $hasNick
            ? 'Вход: ник или телефон + временный пароль, затем смена пароля'
            : 'Вход: телефон + временный пароль, затем активация (ник и пароль)',
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
