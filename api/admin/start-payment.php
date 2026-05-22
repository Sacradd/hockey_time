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

    $rosterId = (int) $game['roster_id'];
    $viewer = api_require_roster_admin($rosterId);

    if (!(bool) ($game['vote_active'] ?? false)) {
        api_json_response(['ok' => false, 'error' => 'Сначала запустите голосование'], 400);
    }

    $pdo->beginTransaction();

    $pdo->prepare(
        'UPDATE day_groups SET payment_active = 0 WHERE roster_id = ? AND id != ?'
    )->execute([$rosterId, $gameId]);

    $pdo->prepare(
        'UPDATE day_groups SET payment_active = 1 WHERE id = ?'
    )->execute([$gameId]);

    $pdo->commit();

    $game = db_fetch_game($pdo, $gameId);

    api_json_response([
        'ok' => true,
        'game' => api_game_public($game, $viewer, true),
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    api_handle_exception($e);
}
