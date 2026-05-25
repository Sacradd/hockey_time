<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/games.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Метод POST'], 405);
}

try {
    $body = api_read_json_body();
    $gameId = (int) ($body['game_id'] ?? $body['group_id'] ?? 0);

    if ($gameId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите game_id'], 400);
    }

    $pdo = api_db();
    $game = db_fetch_game($pdo, $gameId);
    if (!$game) {
        api_json_response(['ok' => false, 'error' => 'Игра не найдена'], 404);
    }

    if (!empty($game['archived_at'])) {
        api_json_response(['ok' => true, 'archived' => true, 'roster_id' => (int) $game['roster_id']]);
    }

    if (!(bool) ($game['teams_published'] ?? false)) {
        api_json_response([
            'ok' => false,
            'error' => 'Составы ещё не опубликованы — игру можно удалить',
        ],
        400);
    }

    $rosterId = (int) $game['roster_id'];
    api_require_roster_admin($rosterId);

    db_archive_game($pdo, $gameId);

    api_json_response([
        'ok' => true,
        'archived' => true,
        'roster_id' => $rosterId,
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
