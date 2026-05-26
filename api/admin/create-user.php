<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Метод POST'], 405);
}

try {
    api_require_super();

    $body = api_read_json_body();
    $phoneRaw = (string) ($body['phone'] ?? '');
    $password = (string) ($body['password'] ?? '');
    $position = (string) ($body['position'] ?? 'player');
    $isGroupAdmin = api_body_bool($body, 'is_group_admin');

    if ($phoneRaw === '' || $password === '') {
        api_json_response(['ok' => false, 'error' => 'Телефон и пароль обязательны'], 400);
    }

    $phone = api_normalize_phone($phoneRaw);
    $pdo = api_db();

    if (!api_validate_position($position)) {
        $position = 'player';
    }

    $userId = db_create_player_user($pdo, $phone, $password, $position);

    if ($isGroupAdmin) {
        $pdo->prepare("UPDATE users SET role = 'admin' WHERE id = ?")->execute([$userId]);
    }

    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    api_json_response([
        'ok' => true,
        'user' => api_user_public($row),
        'phone_display' => api_format_phone_display($phone),
        'is_group_admin' => $isGroupAdmin,
        'created' => true,
    ]);
} catch (InvalidArgumentException $e) {
    api_json_response(['ok' => false, 'error' => $e->getMessage()], 409);
} catch (Throwable $e) {
    api_handle_exception($e);
}
