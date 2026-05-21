<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/teams.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Метод POST'], 405);
}

try {
    $user = api_require_user();
    $body = api_read_json_body();

    $newPassword = (string) ($body['new_password'] ?? '');
    $displayLogin = (string) ($body['display_login'] ?? '');
    $favoriteTeam = (string) ($body['favorite_team'] ?? '');

    if ($newPassword === '' || mb_strlen($newPassword) < 4) {
        api_json_response(['ok' => false, 'error' => 'Пароль: минимум 4 символа'], 400);
    }

    $nickError = api_validate_display_login($displayLogin);
    if ($nickError !== null) {
        api_json_response(['ok' => false, 'error' => $nickError], 400);
    }

    if (api_display_login_taken($displayLogin, (int) $user['id'])) {
        api_json_response(['ok' => false, 'error' => 'Этот ник уже занят'], 400);
    }

    $teamError = api_validate_favorite_team($favoriteTeam);
    if ($teamError !== null) {
        api_json_response(['ok' => false, 'error' => $teamError], 400);
    }

    $pdo = api_db();
    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $userId = (int) $user['id'];

    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare(
            'UPDATE users SET password_hash = ?, display_login = ?, favorite_team = ?, must_change_password = 0, is_active = 1 WHERE id = ?'
        );
        $upd->execute([$hash, trim($displayLogin), $favoriteTeam, $userId]);

        // Аккаунт активен; членство в roster уже при создании админом

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    api_json_response([
        'ok' => true,
        'token' => api_issue_token($userId),
        'user' => api_user_public($row),
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
