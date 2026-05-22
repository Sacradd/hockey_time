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
    $guestName = trim((string) ($body['guest_name'] ?? $body['name'] ?? ''));
    $queuePosition = (int) ($body['position'] ?? $body['queue_position'] ?? 0);
    $memberPosition = (string) ($body['member_position'] ?? $body['position_type'] ?? 'player');
    if (!in_array($memberPosition, ['player', 'goalie'], true)) {
        $memberPosition = 'player';
    }

    if ($gameId < 1 || $guestName === '') {
        api_json_response(['ok' => false, 'error' => 'Укажите game_id и guest_name'], 400);
    }
    if ($memberPosition === 'player' && $queuePosition < 1) {
        api_json_response(['ok' => false, 'error' => 'Для полевого укажите position (от 1)'], 400);
    }

    $pdo = api_db();
    $game = db_fetch_game($pdo, $gameId);
    if (!$game) {
        api_json_response(['ok' => false, 'error' => 'Игра не найдена'], 404);
    }

    $rosterId = (int) $game['roster_id'];
    api_require_roster_admin($rosterId);

    $viewer = api_require_user();
    db_add_guest_to_queue(
        $pdo,
        $gameId,
        $rosterId,
        $game,
        $viewer,
        $guestName,
        $memberPosition === 'goalie' ? 1 : $queuePosition,
        $memberPosition
    );

    $lineup = db_compute_lineup($pdo, $gameId, $rosterId, $game, $viewer);

    api_json_response([
        'ok' => true,
        'lineup' => $lineup,
    ]);
} catch (InvalidArgumentException $e) {
    api_json_response(['ok' => false, 'error' => $e->getMessage()], 400);
} catch (Throwable $e) {
    api_handle_exception($e);
}
