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
    $phoneRaw = (string) ($body['phone'] ?? '');
    $password = (string) ($body['password'] ?? '');
    $position = (string) ($body['position'] ?? 'player');

    if ($rosterId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите roster_id'], 400);
    }

    api_require_roster_admin($rosterId);

    if ($phoneRaw === '' || $password === '') {
        api_json_response(['ok' => false, 'error' => 'Телефон и пароль обязательны'], 400);
    }
    if (!api_validate_position($position)) {
        api_json_response(['ok' => false, 'error' => 'position: player или goalie'], 400);
    }

    $phone = api_normalize_phone($phoneRaw);
    $pdo = api_db();

    $chk = $pdo->prepare('SELECT id FROM rosters WHERE id = ? LIMIT 1');
    $chk->execute([$rosterId]);
    if (!$chk->fetch()) {
        api_json_response(['ok' => false, 'error' => 'Группа не найдена'], 404);
    }

    $userId = db_create_player_user($pdo, $phone, $password, $position);
    db_link_roster_member($pdo, $rosterId, $userId, $position);

    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    api_json_response([
        'ok' => true,
        'user' => api_user_public($row),
        'phone_display' => api_format_phone_display($phone),
        'created' => true,
    ]);
} catch (InvalidArgumentException $e) {
    api_json_response(['ok' => false, 'error' => $e->getMessage()], 409);
} catch (Throwable $e) {
    api_handle_exception($e);
}
