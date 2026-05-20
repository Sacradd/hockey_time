<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Метод POST'], 405);
}

try {
    api_require_admin();
    $body = api_read_json_body();

    $rosterId = (int) ($body['roster_id'] ?? 0);
    $phoneRaw = (string) ($body['phone'] ?? '');
    $password = (string) ($body['password'] ?? '');
    $position = (string) ($body['position'] ?? 'player');

    if ($rosterId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите roster_id'], 400);
    }
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
        api_json_response(['ok' => false, 'error' => 'Roster не найден'], 404);
    }

    $userId = db_upsert_user($pdo, $phone, $password, 'player', $position, true, false);
    db_link_roster_member($pdo, $rosterId, $userId);

    $latest = $pdo->prepare(
        'SELECT id FROM day_groups WHERE roster_id = ? ORDER BY group_date DESC LIMIT 1'
    );
    $latest->execute([$rosterId]);
    $gameId = $latest->fetchColumn();
    if ($gameId) {
        $gm = $pdo->prepare(
            'INSERT INTO group_members (user_id, group_id, actual) VALUES (?, ?, 0)
             ON DUPLICATE KEY UPDATE user_id = user_id'
        );
        $gm->execute([$userId, (int) $gameId]);
    }

    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    api_json_response([
        'ok' => true,
        'user' => api_user_public($row),
        'phone_display' => api_format_phone_display($phone),
    ]);
} catch (InvalidArgumentException $e) {
    api_json_response(['ok' => false, 'error' => $e->getMessage()], 400);
} catch (Throwable $e) {
    api_handle_exception($e);
}
