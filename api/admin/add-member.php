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
    $phoneRaw = (string) ($body['phone'] ?? '');

    if ($rosterId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите roster_id'], 400);
    }

    api_require_roster_admin($rosterId);

    $pdo = api_db();

    if ($userId < 1 && $phoneRaw !== '') {
        $phone = api_normalize_phone($phoneRaw);
        $found = db_find_user_id_by_phone($pdo, $phone);
        if ($found === null) {
            api_json_response(['ok' => false, 'error' => 'Игрок не найден — создайте новый аккаунт'], 404);
        }
        $userId = $found;
    }

    if ($userId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите user_id или телефон'], 400);
    }

    $u = $pdo->prepare('SELECT id, display_login, phone, position FROM users WHERE id = ? LIMIT 1');
    $u->execute([$userId]);
    $userRow = $u->fetch();
    if (!$userRow) {
        api_json_response(['ok' => false, 'error' => 'Пользователь не найден'], 404);
    }

    $position = (string) ($userRow['position'] ?? 'player');
    if (!in_array($position, ['player', 'goalie'], true)) {
        $position = 'player';
    }

    if (db_user_is_game_only_guest($pdo, $userId)) {
        api_json_response([
            'ok' => false,
            'error' => 'Это гость одной игры — создайте аккаунт в приложении или добавьте гостя на экране игры',
        ], 400);
    }

    if (db_roster_has_member($pdo, $rosterId, $userId)) {
        api_json_response(['ok' => false, 'error' => 'Уже в этой группе'], 409);
    }

    db_link_roster_member($pdo, $rosterId, $userId, $position);

    api_json_response([
        'ok' => true,
        'user_id' => $userId,
        'name' => $userRow['display_login']
            ?: api_format_phone_display((string) $userRow['phone']),
        'added' => true,
    ]);
} catch (InvalidArgumentException $e) {
    api_json_response(['ok' => false, 'error' => $e->getMessage()], 400);
} catch (Throwable $e) {
    api_handle_exception($e);
}
