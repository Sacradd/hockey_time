<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Метод POST'], 405);
}

try {
    $viewer = api_require_user();
    if (!api_can_create_roster($viewer)) {
        api_json_response(['ok' => false, 'error' => 'Только админ может создавать группы'], 403);
    }

    $body = api_read_json_body();
    $title = trim((string) ($body['title'] ?? ''));
    $venue = trim((string) ($body['venue'] ?? ''));
    $weekday = isset($body['weekday']) ? (int) $body['weekday'] : null;

    if ($title === '') {
        api_json_response(['ok' => false, 'error' => 'Укажите название группы'], 400);
    }
    if (mb_strlen($title) > 128) {
        api_json_response(['ok' => false, 'error' => 'Название до 128 символов'], 400);
    }
    if ($weekday !== null && ($weekday < 0 || $weekday > 6)) {
        api_json_response(['ok' => false, 'error' => 'weekday: 0–6'], 400);
    }

    $pdo = api_db();
    $rosterId = db_create_roster(
        $pdo,
        $title,
        $venue !== '' ? $venue : null,
        $weekday
    );

    $userId = (int) $viewer['id'];
    db_link_roster_member($pdo, $rosterId, $userId, 'player');
    db_set_roster_admin($pdo, $rosterId, $userId, true);

    api_json_response([
        'ok' => true,
        'roster' => [
            'id' => $rosterId,
            'title' => $title,
            'venue' => $venue !== '' ? $venue : null,
            'weekday' => $weekday,
            'members_count' => 1,
            'games_count' => 0,
            'is_admin' => true,
        ],
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
