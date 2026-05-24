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
    $assignments = $body['assignments'] ?? null;

    if ($gameId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите game_id'], 400);
    }

    if (!is_array($assignments)) {
        api_json_response(['ok' => false, 'error' => 'Укажите assignments'], 400);
    }

    $pdo = api_db();
    $game = db_fetch_game($pdo, $gameId);
    if (!$game) {
        api_json_response(['ok' => false, 'error' => 'Игра не найдена'], 404);
    }

    $rosterId = (int) $game['roster_id'];
    $viewer = api_require_roster_admin($rosterId);

    $saved = db_save_game_match_teams($pdo, $gameId, $rosterId, $game, $viewer, $assignments);

    api_json_response([
        'ok' => true,
        'match_teams' => $saved,
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
